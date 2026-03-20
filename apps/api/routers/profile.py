import base64
import io
import logging
import os
import time
from dataclasses import dataclass

from google import genai
from google.genai import types
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image, ImageOps

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

PROFILE_MODEL = "gemini-2.5-flash-image"

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

PROFILE_STYLE_PROMPTS: dict[str, str] = {
    "id-photo": """
[주체] 첨부된 사진의 인물(또는 동물)을 증명사진 스타일로 변환.
[스타일] 깨끗하고 전문적인 증명사진. 자연스러운 피부톤, 과도한 보정 없이 깔끔한 인상.
[조명] 스튜디오 3점 조명(three-point softbox setup). 정면에서 균일하게 비추는 키라이트, 부드러운 필라이트로 그림자 최소화.
[구도] 정면 얼굴, 어깨까지 보이는 바스트 샷(bust shot). 얼굴이 정중앙에 위치. 정사각형(1:1) 비율.
[배경] 순백(pure white) 또는 연한 하늘색(light sky blue) 단색 배경. 그라디언트 없음.
[출력] 정사각형 비율로 얼굴이 중앙에 오도록 크롭. 고해상도, 선명한 포커스.
""",
    "instagram": """
[주체] 첨부된 사진의 인물(또는 동물)을 감성적인 SNS 프로필 스타일로 변환.
[스타일] 시네마틱 화보 느낌의 인스타그램 프로필. 세련된 톤 앤 매너, 부드러운 색감 보정, 자연스러운 뷰티 리터칭.
[조명] 골든 아워 자연광(golden hour natural light). 부드러운 역광으로 머리카락에 따뜻한 림라이트. 얼굴에 부드러운 캐치라이트.
[구도] 얼굴 중심 클로즈업 또는 바스트 샷. 살짝 3/4 앵글. 얼굴이 중앙에 위치. 정사각형(1:1) 비율.
[배경] 부드럽게 아웃포커싱된 배경(shallow depth of field, f/1.8). 보케(bokeh) 효과로 인물 강조.
[카메라] Fujifilm 색감, 85mm 인물 렌즈 느낌의 자연스러운 왜곡과 부드러운 피부 표현.
[출력] 정사각형 비율로 얼굴이 중앙에 오도록 크롭. 고해상도, 선명한 포커스.
""",
    "ghibli": """
[주체] 첨부된 사진의 인물(또는 동물)을 Studio Ghibli 애니메이션 캐릭터로 변환.
[스타일] 스튜디오 지브리 특유의 손그림 애니메이션. 수채화 질감의 부드러운 붓터치, 따뜻한 파스텔 톤 색감, 둥글고 자연스러운 윤곽선. 눈은 크고 생동감 있게, 표정은 따뜻하고 감성적으로.
[조명] 부드러운 자연광, 따뜻한 오후 햇살 느낌. 살짝 역광(backlighting)으로 캐릭터 윤곽에 따뜻한 림라이트.
[구도] 얼굴 중심 클로즈업 또는 바스트 샷. 얼굴이 중앙에 위치. 정사각형(1:1) 비율.
[배경] 지브리 스타일의 자연 풍경 배경. 부드러운 초록 나뭇잎, 맑은 하늘, 뭉게구름. 수채화 느낌으로 자연스럽게 채색.
[출력] 정사각형 비율로 얼굴이 중앙에 오도록 크롭. 고해상도, 선명한 포커스.
""",
    "fairly-odd": """
[주체] 첨부된 사진의 인물(또는 동물)을 "The Fairly OddParents(티미의 못말리는 수호천사)" 애니메이션 캐릭터로 변환.
[스타일] Butch Hartman 특유의 Nickelodeon 카툰 스타일. 굵고 깔끔한 검은 외곽선(bold black outline), 심플하고 과장된 형태, 밝고 채도 높은 플랫 컬러(flat color). 큰 눈, 과장된 머리 비율, 뾰족한 턱, 단순화된 코와 귀. 표정은 활기차고 유쾌하게.
[조명] 플랫 조명(flat lighting). 그림자 최소화, 균일하고 밝은 색면 위주. 카툰 특유의 하이라이트 포인트(눈, 머리카락)만 간결하게.
[구도] 얼굴 중심 클로즈업 또는 바스트 샷. 얼굴이 중앙에 위치. 정사각형(1:1) 비율.
[배경] 밝고 단순한 단색 또는 2톤 배경. 원작의 분위기에 맞는 밝은 파란색/초록색/분홍색 계열. 심플하고 깔끔하게.
[출력] 정사각형 비율로 얼굴이 중앙에 오도록 크롭. 고해상도, 선명한 포커스. Nickelodeon 카툰 느낌에 충실.
""",
    "powerpuff": """
[주체] 첨부된 사진의 인물(또는 동물)을 "The Powerpuff Girls(파워퍼프걸)" 애니메이션 캐릭터로 변환.
[스타일] Craig McCracken 특유의 Cartoon Network 스타일. 극단적으로 큰 동그란 눈(홍채가 얼굴의 절반 차지), 눈동자 안에 큰 하이라이트. 코 없음(또는 아주 작은 점), 작은 입. 뭉툭하고 둥근 몸체, 손가락 없는 둥근 손. 머리 형태와 색상으로 개성 표현. 굵고 깨끗한 검은 외곽선, 밝고 채도 높은 파스텔~비비드 플랫 컬러.
[조명] 완전 플랫 조명. 그림자 없음. 밝고 균일한 색면으로만 구성. 눈에 큰 원형 하이라이트.
[구도] 얼굴 중심 또는 전신이 보이는 구도. 캐릭터가 중앙에 위치. 정사각형(1:1) 비율.
[배경] 밝고 깨끗한 단색 배경. 원작의 파스텔/네온 색감에 맞는 분홍, 하늘색, 연초록 중 캐릭터와 어울리는 색상. 또는 원작 특유의 도시(Townsville) 실루엣 배경.
[출력] 정사각형 비율로 얼굴이 중앙에 오도록 크롭. 고해상도, 선명한 포커스. Powerpuff Girls 원작 느낌에 충실.
""",
}

PET_PROFILE_PROMPT = """
[주체] 첨부된 여러 장의 반려동물 사진을 참고하여, 이 동물의 귀여운 프로필 사진을 생성.
[참고] 여러 각도의 사진이 제공된 경우, 동물의 전체적인 외형(털 색상, 패턴, 귀 모양, 체형 등)을 종합적으로 파악하여 가장 정확하게 표현.
[스타일] 밝고 사랑스러운 반려동물 프로필 사진. 동물이 살짝 미소 짓는 듯한 행복하고 친근한 표정으로 표현. 눈은 반짝이고 생기 있게, 입꼬리가 자연스럽게 올라간 웃는 얼굴. 털은 부드럽고 윤기 있게 표현하되 과도한 보정 없이 자연스럽게.
[조명] 밝고 부드러운 스튜디오 조명. 정면에서 균일하게 비추는 소프트박스 키라이트, 부드러운 필라이트로 그림자 최소화. 눈에 크고 선명한 캐치라이트로 생기 있는 눈빛 강조.
[구도] 동물의 정면 얼굴 중심 클로즈업. 얼굴이 정중앙에 위치. 원형 프로필 사진에 어울리도록 얼굴이 프레임의 대부분을 차지. 정사각형(1:1) 비율.
[배경] 파스텔톤 단색 배경 — 부드러운 분홍색(soft pink, #FFD6E0) 또는 연한 하늘색(baby blue, #D6EEFF) 중 동물의 털 색상과 가장 잘 어울리는 색상을 자동으로 선택. 배경은 깨끗한 단색으로, 그라디언트 없음.
[출력] 정사각형 비율로 얼굴이 중앙에 오도록 크롭. 고해상도, 선명한 포커스. 원형으로 잘랐을 때 예쁘게 보이는 구도.
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
    gcp_project = os.getenv("GCP_PROJECT_ID")
    gcp_location = os.getenv("GCP_LOCATION", "us-central1")
    gemini_key = os.getenv("GEMINI_API_KEY")

    if gcp_project:
        client = genai.Client(
            vertexai=True, project=gcp_project, location=gcp_location
        )
        logger.info("[%s] Vertex AI 사용 (project=%s)", log_tag, gcp_project)
    elif gemini_key:
        client = genai.Client(api_key=gemini_key)
        logger.info("[%s] Gemini API 키 사용", log_tag)
    else:
        raise HTTPException(
            status_code=500,
            detail="GCP_PROJECT_ID 또는 GEMINI_API_KEY가 설정되지 않았습니다.",
        )
    return client


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
) -> JSONResponse:
    try:
        logger.info("[%s] Gemini API 호출 시작 model=%s", log_tag, PROFILE_MODEL)
        t0 = time.monotonic()

        response = await client.aio.models.generate_content(
            model=PROFILE_MODEL,
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
        logger.exception("[%s] 오류 발생: %s", log_tag, e)
        if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
            raise HTTPException(
                status_code=429,
                detail="AI 서버가 일시적으로 바빠요. 잠시 후 다시 시도해주세요.",
            )
        raise HTTPException(status_code=500, detail=str(e))


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

    return await _call_gemini_and_extract(client, parts, ctx, "profile")


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
