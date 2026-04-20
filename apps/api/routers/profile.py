import base64
import io
import logging
import time
from dataclasses import dataclass

from google import genai
from google.genai import types
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image, ImageOps

from services.genai_client import get_genai_client
from services.rembg_session import get_rembg_session
from services.rate_limit import (
    DAILY_LIMIT_ANONYMOUS,
    DAILY_LIMIT_USER,
    check_rate_limit,
    get_usage_count,
    get_user_id_from_token,
    increment_usage,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["profile"])

PROFILE_MODEL_PRIMARY = "gemini-3.1-flash-image-preview"
PROFILE_MODEL_FALLBACK = "gemini-2.5-flash-image"

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

PROFILE_STYLE_PROMPTS: dict[str, str] = {
    "id-photo": """
[주체] 첨부된 사진의 인물을 전문적인 증명사진 스타일로 변환.
[닮음] 반드시 첨부 사진 인물의 얼굴 특징을 정확히 유지: 눈 모양과 크기, 코 형태, 얼굴형(둥근/각진/긴), 피부톤, 머리카락 색상과 스타일, 안경·점·주근깨 등 특징적 요소. 다른 사람처럼 보여선 안 된다.
[스타일] 깨끗하고 전문적인 증명사진. 자연스러운 피부 보정(잡티 최소화, 피부결 유지). 선명하고 깔끔한 인상. 과도한 AI 보정(플라스틱 피부, 과도한 스무딩) 금지.
[조명] 스튜디오 3점 소프트박스: 정면 45° 키라이트, 반대편 필라이트, 약한 헤어라이트. 얼굴에 부드러운 그림자, 이중턱 그림자 최소화. 눈에 선명한 캐치라이트.
[구도] 정면 응시. 어깨 윗부분까지 보이는 바스트 샷. 얼굴이 프레임 정중앙, 눈 높이가 상단 1/3 지점. 정사각형(1:1) 비율.
[배경] 순백(#FFFFFF) 단색 배경. 그라디언트 없음, 그림자 없음.
[출력] 정사각형(1:1) 크롭, 얼굴 중앙 배치. 고해상도, 선명한 포커스.
[금지] 과도한 피부 스무딩, 얼굴 변형, 성별/인종/나이 변경, 텍스트, 워터마크 절대 금지.
""",
    "instagram": """
[주체] 첨부된 사진의 인물을 세련된 SNS 프로필 사진으로 변환.
[닮음] 반드시 첨부 사진 인물의 얼굴 특징을 정확히 유지: 눈 모양, 코 형태, 얼굴형, 피부톤, 머리카락 색상·스타일, 안경·점 등 특징적 요소. 완전히 다른 사람처럼 보여선 안 된다.
[스타일] 시네마틱 화보 느낌의 인스타그램 프로필. 세련된 색감 보정: 약간 따뜻한 톤(orange & teal 또는 soft warm), 피부에 자연스러운 광택. 잡지 화보 수준의 자연스러운 뷰티 리터칭.
[조명] 골든아워 자연광. 부드러운 역광으로 머리카락에 따뜻한 금빛 림라이트. 얼굴에 은은한 캐치라이트. 전체적으로 따뜻하고 드리미한 톤.
[구도] 얼굴 클로즈업 또는 바스트 샷. 살짝 3/4 앵글(15~30°). 얼굴이 프레임 중앙. 정사각형(1:1).
[배경] 아름답게 아웃포커싱(f/1.4~f/1.8 수준의 얕은 피사계심도). 부드러운 보케 효과. 배경 색감은 따뜻한 톤으로 통일.
[카메라] 85mm f/1.4 인물 렌즈 느낌. Fujifilm Classic Chrome 또는 Pro Neg Hi 색감. 자연스러운 왜곡.
[출력] 정사각형(1:1) 크롭. 고해상도, 피부 디테일 선명하되 자연스러움 유지.
[금지] 과도한 스무딩, 플라스틱 느낌 피부, 얼굴 변형, 성별/인종 변경, 텍스트, 워터마크 절대 금지.
""",
    "ghibli": """
[주체] 첨부된 사진의 인물을 Studio Ghibli 애니메이션 캐릭터로 변환.
[닮음] 첨부 사진 인물의 핵심 특징을 애니메이션 스타일 내에서 최대한 보존: 머리카락 색상과 길이·스타일, 얼굴형, 안경 유무, 체형 특징. 지브리 화풍으로 '해석'하되 원본 인물을 알아볼 수 있어야 한다.
[스타일]
- 미야자키 하야오 감독의 극장판 수준 퀄리티.
- 수채화 터치: 부드럽고 따뜻한 파스텔 톤(연한 살구색, 옅은 민트, 연보라).
- 외곽선은 부드럽고 둥근 갈색~진갈색 선(검은색 아님).
- 눈: 크고 반짝이며 감성적. 홍채에 수채화 그라데이션.
- 머리카락: 부드러운 덩어리(mass) 형태, 자연스러운 움직임.
- 표정: 따뜻하고 부드러운 미소 또는 평온한 표정.
[조명] 따뜻한 오후 햇살. 역광으로 머리카락에 황금빛 림라이트. 전체적으로 골든아워 분위기.
[구도] 얼굴 클로즈업 또는 바스트 샷. 얼굴 중앙 배치. 정사각형(1:1).
[배경] 지브리 특유의 자연 풍경: 푸른 하늘, 뭉게구름, 초록 잎사귀. 수채화 느낌으로 부드럽게.
[출력] 정사각형(1:1), 고해상도, 선명한 포커스.
[금지] 3D CG 느낌, 검은 외곽선, 셀 셰이딩, 텍스트, 워터마크 금지. 원본 인물과 다른 성별/인종으로 변경 금지.
""",
    "fairly-odd": """
[주체] 첨부된 사진의 인물을 "The Fairly OddParents" 캐릭터로 변환.
[닮음] 원본 인물의 머리카락 색상·스타일, 안경 유무, 특징적인 의상 색상을 카툰 스타일 내에서 유지. Fairly OddParents 화풍으로 재해석하되 원본 인물의 인상을 알아볼 수 있어야 한다.
[스타일]
- Butch Hartman의 Nickelodeon 카툰 스타일 정확히 재현.
- 레퍼런스: Timmy Turner, Cosmo, Wanda의 화풍.
- 극도로 굵고 깔끔한 검은 외곽선(3~4px). 선 끊김 없음.
- 색상: 밝고 채도 높은 플랫 컬러. 그라데이션 없음.
- 머리: 과장되게 큰 비율. 뾰족하거나 각진 실루엣.
- 눈: 매우 크고 동그란, 흰 눈동자에 큰 검은 홍채.
- 턱: 뾰족한 V자. 코: 극도로 작은 점.
- 표정: 활기차고 유쾌하게.
[조명] 완전 플랫. 그림자 없음.
[구도] 얼굴 클로즈업 또는 바스트 샷. 중앙 배치. 정사각형(1:1).
[배경] 완전 투명(누끼). 배경 요소 없음.
[출력] 정사각형(1:1), 투명 배경 PNG, 선명한 외곽선.
[금지] 리얼리스틱 셰이딩, 그라데이션, 텍스트, 워터마크 금지.
""",
    "powerpuff": """
[주체] 첨부된 사진의 인물을 "The Powerpuff Girls" 캐릭터로 변환.
[닮음] 원본 인물의 머리카락 색상·스타일, 특징적인 의상 색상을 Powerpuff 스타일 내에서 유지. 원본 인물의 인상을 알아볼 수 있어야 한다.
[스타일]
- Craig McCracken의 Cartoon Network 원작 화풍 정확히 재현.
- 레퍼런스: Blossom, Bubbles, Buttercup의 디자인.
- 눈: 극단적으로 큰 타원형(얼굴의 60% 이상). 홍채가 눈 전체를 채움. 눈마다 큰 원형 하이라이트 1개.
- 코: 없음. 절대 그리지 않음.
- 입: 매우 작은 선 또는 점.
- 몸: 뭉툭하고 둥근 타원형 몸통. 목 없음.
- 팔: 가는 선, 손가락 없는 둥근 원형 손(mitten hands).
- 외곽선: 굵고 균일한 검은 선. 완전히 닫힌 형태.
- 색상: 밝은 파스텔~비비드 플랫 컬러. 그라데이션 없음.
[조명] 완전 플랫. 그림자 완전 없음.
[구도] 얼굴 중심 또는 전신. 중앙 배치. 정사각형(1:1).
[배경] 완전 투명(누끼). 배경 요소 없음.
[출력] 정사각형(1:1), 투명 배경 PNG, 선명한 외곽선.
[금지] 코, 손가락, 리얼리스틱 셰이딩, 그라데이션, 텍스트, 워터마크 금지.
""",
}

PET_PROFILE_PROMPT = """
[주체] 첨부된 반려동물 사진을 참고하여 귀여운 프로필 사진을 생성.
[닮음] 가장 중요: 첨부 사진 속 동물의 실제 외형을 정확히 반영해야 한다.
- 털 색상, 패턴(점박이, 줄무늬, 단색 등), 질감(단모/장모/곱슬)을 사진과 동일하게.
- 귀 형태(쫑긋/접힌), 코 색상(검정/분홍), 눈 색상을 사진과 동일하게.
- 체형(통통/날씬/근육질)과 전체적인 인상을 유지.
- 여러 사진이 제공된 경우 모든 사진을 종합하여 가장 정확한 외형을 파악.
[스타일] 밝고 사랑스러운 전문 펫 프로필 사진. 눈에 생기 있는 캐치라이트. 털은 부드럽고 윤기 있게 표현하되 과도한 보정 없이 자연스럽게. 동물의 자연스럽고 편안한 표정(억지 웃음 아님).
[조명] 밝고 부드러운 스튜디오 조명. 정면 45° 소프트박스 키라이트 + 반대편 필라이트로 그림자 최소화. 눈에 크고 선명한 캐치라이트 2개(10시·2시 방향).
[구도] 동물 정면 얼굴 중심 클로즈업. 얼굴이 정중앙. 원형 프로필에 어울리도록 얼굴이 프레임의 70~80% 차지. 정사각형(1:1).
[배경] 깨끗한 순백(#FFFFFF) 단색. 그라디언트 없음, 파스텔 없음, 오직 순수한 흰색.
[출력] 정사각형(1:1), 얼굴 중앙 크롭, 고해상도, 선명한 포커스. 원형 크롭 시 예쁜 구도.
[금지] 의인화(사람 옷 입히기), 비현실적 표정(사람처럼 웃는 입), 텍스트, 워터마크, 악세서리 추가 금지. 동물의 실제 종/품종과 다른 동물로 변경 금지.
"""


# ── Helpers ──────────────────────────────────────────────────────────────────

@dataclass
class RateLimitContext:
    rate_key: str
    daily_limit: int
    has_token: bool


def _pil_to_part(image: Image.Image, mime: str = "image/jpeg") -> types.Part:
    buffer = io.BytesIO()
    fmt = "PNG" if mime == "image/png" else "JPEG"
    image.save(buffer, format=fmt)
    return types.Part.from_bytes(data=buffer.getvalue(), mime_type=mime)


def _get_rate_limit_context(request: Request, key_prefix: str = "") -> RateLimitContext:
    has_token = request.headers.get("authorization", "").startswith("Bearer ")
    user_id = get_user_id_from_token(request)
    forwarded = request.headers.get("x-forwarded-for", "")
    client_ip = forwarded.split(",")[0].strip() if forwarded else (
        request.client.host if request.client else "unknown"
    )
    if not client_ip:
        client_ip = "unknown"

    prefix = f"{key_prefix}:" if key_prefix else ""
    if user_id:
        rate_key = f"{prefix}user:{user_id}"
        daily_limit = DAILY_LIMIT_USER
    else:
        rate_key = f"{prefix}ip:{client_ip}"
        daily_limit = DAILY_LIMIT_ANONYMOUS

    return RateLimitContext(rate_key=rate_key, daily_limit=daily_limit, has_token=has_token)


def _check_rate_limit_or_respond(ctx: RateLimitContext, log_tag: str) -> JSONResponse | None:
    remaining = check_rate_limit(ctx.rate_key, ctx.daily_limit)
    if remaining <= 0:
        logger.warning("[%s] rate limit 초과 key=%s", log_tag, ctx.rate_key)
        detail = f"일일 생성 횟수({ctx.daily_limit}회)를 초과했습니다. 내일 다시 이용해주세요."
        error_body = {
            "detail": detail,
            "login_required": not ctx.has_token and "ip:" in ctx.rate_key,
        }
        return JSONResponse(status_code=429, content=error_body)
    return None


def _get_gemini_client(log_tag: str) -> genai.Client:
    return get_genai_client(log_tag)


async def _validate_and_convert_image(
    upload: UploadFile, *, label: str = "",
) -> types.Part:
    upload_bytes = await upload.read()
    if len(upload_bytes) > MAX_FILE_SIZE:
        suffix = f" ({label})" if label else ""
        raise HTTPException(
            status_code=400,
            detail=f"파일 크기는 10MB 이하만 가능합니다.{suffix}",
        )
    try:
        pil_img = ImageOps.exif_transpose(
            Image.open(io.BytesIO(upload_bytes))
        ).convert("RGB")
    except Exception:
        suffix = f" ({label})" if label else ""
        raise HTTPException(
            status_code=400,
            detail=f"올바른 이미지 파일이 아닙니다.{suffix}",
        )
    return _pil_to_part(pil_img, "image/jpeg")


async def _call_gemini_and_extract(
    client: genai.Client,
    parts: list,
    ctx: RateLimitContext,
    log_tag: str,
    remove_bg: bool = False,
) -> JSONResponse:
    models_to_try = [PROFILE_MODEL_PRIMARY, PROFILE_MODEL_FALLBACK]
    last_error: Exception | None = None

    for model_id in models_to_try:
        try:
            logger.info("[%s] Gemini API 호출 시작 model=%s", log_tag, model_id)
            t0 = time.monotonic()

            response = await client.aio.models.generate_content(
                model=model_id,
                contents=parts,
                config=types.GenerateContentConfig(
                    response_modalities=["TEXT", "IMAGE"],
                ),
            )

            elapsed = time.monotonic() - t0
            logger.info("[%s] Gemini 응답 수신 (%.1fs)", log_tag, elapsed)

            for part in response.candidates[0].content.parts:
                if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                    raw_bytes = part.inline_data.data
                    logger.info("[%s] 이미지 추출 성공 size=%dB", log_tag, len(raw_bytes))

                    if remove_bg:
                        from rembg import remove as rembg_remove
                        logger.info("[%s] rembg 누끼 처리 시작", log_tag)
                        t1 = time.monotonic()
                        raw_bytes = rembg_remove(raw_bytes, session=get_rembg_session())
                        logger.info("[%s] rembg 완료 (%.1fs)", log_tag, time.monotonic() - t1)

                    increment_usage(ctx.rate_key)
                    used_count = get_usage_count(ctx.rate_key)
                    logger.info(
                        "[%s] key=%s 오늘 %d/%d회 사용",
                        log_tag, ctx.rate_key, used_count, ctx.daily_limit,
                    )

                    image_b64 = base64.b64encode(raw_bytes).decode("utf-8")
                    return JSONResponse(
                        {
                            "success": True,
                            "image": f"data:image/png;base64,{image_b64}",
                            "remaining": ctx.daily_limit - used_count,
                            "daily_limit": ctx.daily_limit,
                        }
                    )

            logger.warning("[%s] 응답에 이미지 없음", log_tag)
            raise HTTPException(status_code=500, detail="이미지가 생성되지 않았습니다.")

        except HTTPException:
            raise
        except Exception as e:
            is_quota = "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e)
            if is_quota and model_id == PROFILE_MODEL_PRIMARY:
                logger.warning("[%s] %s 429 발생 → fallback %s", log_tag, model_id, PROFILE_MODEL_FALLBACK)
                last_error = e
                continue
            logger.exception("[%s] 오류 발생: %s", log_tag, e)
            if is_quota:
                raise HTTPException(
                    status_code=429,
                    detail="AI 서버가 일시적으로 바빠요. 잠시 후 다시 시도해주세요.",
                )
            raise HTTPException(status_code=500, detail=str(e))

    # 모든 모델 실패
    logger.exception("[%s] 모든 모델 실패: %s", log_tag, last_error)
    raise HTTPException(status_code=429, detail="AI 서버가 일시적으로 바빠요. 잠시 후 다시 시도해주세요.")


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/generate-profile")
async def generate_profile(
    request: Request,
    style: str = Form(...),
    upload_image: UploadFile = File(...),
):
    """사진 업로드 + 스타일 선택 → AI 프로필 사진 생성."""
    if style not in PROFILE_STYLE_PROMPTS:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 스타일: {style}")

    ctx = _get_rate_limit_context(request)
    if limit_resp := _check_rate_limit_or_respond(ctx, "profile"):
        return limit_resp

    client = _get_gemini_client("profile")
    image_part = await _validate_and_convert_image(upload_image)

    parts: list = [image_part, PROFILE_STYLE_PROMPTS[style]]
    logger.info("[profile] style=%s", style)

    needs_rembg = style in ("fairly-odd", "powerpuff")
    return await _call_gemini_and_extract(client, parts, ctx, "profile", remove_bg=needs_rembg)


@router.post("/generate-pet-profile")
async def generate_pet_profile(
    request: Request,
    upload_image1: UploadFile = File(...),
    upload_image2: UploadFile | None = File(None),
    upload_image3: UploadFile | None = File(None),
):
    """반려동물 사진 1~3장 업로드 → AI 증명사진 스타일 프로필 생성."""
    ctx = _get_rate_limit_context(request, key_prefix="pet-profile")
    if limit_resp := _check_rate_limit_or_respond(ctx, "pet-profile"):
        return limit_resp

    client = _get_gemini_client("pet-profile")

    uploads = [upload_image1]
    if upload_image2:
        uploads.append(upload_image2)
    if upload_image3:
        uploads.append(upload_image3)

    parts: list = []
    for i, upload in enumerate(uploads):
        parts.append(await _validate_and_convert_image(upload, label=f"사진 {i + 1}"))

    parts.append(PET_PROFILE_PROMPT)
    logger.info("[pet-profile] images=%d", len(uploads))

    return await _call_gemini_and_extract(client, parts, ctx, "pet-profile")
