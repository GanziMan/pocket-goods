import base64
import io
import logging
import os
import time
from typing import Optional

from google import genai
from google.genai import types
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image

from services.rate_limit import (
    DAILY_LIMIT_ANONYMOUS,
    DAILY_LIMIT_USER,
    check_rate_limit,
    get_usage_count,
    get_user_id_from_token,
    increment_usage,
)

# rembg 모델 lazy-load (첫 요청 시 로드 — 서버 기동 시간 단축)
_rembg_session = None

def _get_rembg_session():
    global _rembg_session
    if _rembg_session is None:
        from rembg import new_session as rembg_new_session
        _rembg_session = rembg_new_session("u2net")
    return _rembg_session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["generate"])

NANO_BANANA_MODEL_PRIMARY = "gemini-3.1-flash-image-preview"
NANO_BANANA_MODEL_FALLBACK = "gemini-2.5-flash-image"
STYLE_PROMPTS: dict[str, str] = {
    "ghibli": """
[주체] 첨부된 이미지 또는 사용자 요청의 캐릭터를 중심으로 그린다.
[스타일] Studio Ghibli 애니메이션 스타일. 수채화 질감의 부드러운 붓터치, 따뜻한 파스텔 톤 색감, 손으로 그린 듯한 자연스러운 윤곽선.
[조명] 부드러운 자연광, 살짝 역광(backlighting)으로 캐릭터 윤곽에 따뜻한 림라이트.
[구도] 센터 프레임, 캐릭터 전신이 보이는 풀바디 샷. 캐릭터가 화면의 중앙에 위치.
[재질] 수채화 종이 위에 그린 듯한 부드러운 텍스처, 선명하고 깨끗한 선화(line art).
[출력] 배경은 완전히 투명하게(누끼) 처리. 캐릭터만 단독으로 존재. 굿즈(아크릴 키링, 투명 스티커) 인쇄에 적합한 선명한 외곽선.
""",
    "sd": """
[주체] 첨부된 이미지 또는 사용자 요청의 캐릭터를 SD(슈퍼 디포르메) 치비(chibi)로 변환.
[스타일] 머리가 크고 몸이 작은 2~3등신 비율. 크고 둥글게 반짝이는 눈, 작고 귀여운 입, 과장된 표정. 굵고 깨끗한 윤곽선, 밝고 채도 높은 셀 애니메이션 색감.
[조명] 균일한 플랫 라이팅(flat lighting), 그림자 최소화로 깔끔한 일러스트 느낌.
[구도] 센터 프레임, 캐릭터 전신 풀바디 샷. 정면 또는 살짝 3/4 앵글.
[재질] 매끄러운 디지털 일러스트 질감, 선명한 벡터 느낌의 깨끗한 선화.
[출력] 배경은 완전히 투명하게(누끼) 처리. 캐릭터만 단독으로 존재. 굿즈(아크릴 키링, 투명 스티커) 인쇄에 적합한 선명한 외곽선.
""",
    "steampunk": """
[주체] 첨부된 이미지 또는 사용자 요청의 캐릭터를 스팀펑크 세계관으로 변환.
[스타일] 빅토리아 시대 의상에 기계 장치가 결합된 스팀펑크 스타일. 정교한 톱니바퀴, 증기 파이프, 고글, 시계 장치 디테일.
[조명] 따뜻한 가스등(gas lamp) 조명, 앰버 톤의 드라마틱한 명암 대비(chiaroscuro lighting).
[구도] 센터 프레임, 캐릭터 전신 풀바디 샷. 미디엄 샷 또는 풀바디.
[재질] 산화된 황동(oxidized brass), 광택 구리(polished copper), 에이징된 갈색 가죽(aged brown leather), 리벳이 박힌 금속 표면.
[출력] 배경은 완전히 투명하게(누끼) 처리. 캐릭터만 단독으로 존재. 굿즈(아크릴 키링, 투명 스티커) 인쇄에 적합한 선명한 외곽선.
""",
    "akatsuki": """
[주체] 첨부된 이미지 또는 사용자 요청의 캐릭터를 나루토 아카츠키 멤버 스타일로 변환.
[스타일] 일본 닌자 애니메이션 스타일의 실사 느낌. 검은 망토에 붉은 구름(赤雲) 문양, 날카롭고 강렬한 눈빛, 린네간 또는 샤링안 스타일의 눈동자. 굵고 선명한 윤곽선, 강렬한 채도.
[조명] 로우키 드라마틱 조명(low-key dramatic lighting), 캐릭터 뒤에서 비치는 붉은 림라이트.
[구도] 센터 프레임, 상반신 미디엄 클로즈업 또는 전신 풀바디. 살짝 로우앵글(low-angle)로 위압감 연출.
[재질] 매트한 검은 천(matte black fabric), 붉은 구름 문양의 자수 질감, 금속 인두 히타이아테(forehead protector).
[출력] 배경은 완전히 투명하게(누끼) 처리. 캐릭터만 단독으로 존재. 굿즈(아크릴 키링, 투명 스티커) 인쇄에 적합한 선명한 외곽선.
""",
    "custom": """
[구도] 센터 프레임, 캐릭터가 화면 중앙에 위치하는 풀바디 샷.
[출력] 배경은 완전히 투명하게(누끼) 처리. 캐릭터만 단독으로 존재. 굿즈(아크릴 키링, 투명 스티커) 인쇄에 적합한 선명한 외곽선.
""",
}

def _image_to_base64(image: Image.Image, fmt: str = "PNG") -> str:
    buffer = io.BytesIO()
    image.save(buffer, format=fmt)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def _pil_to_part(image: Image.Image, mime: str = "image/png") -> types.Part:
    buffer = io.BytesIO()
    fmt = "PNG" if mime == "image/png" else "JPEG"
    image.save(buffer, format=fmt)
    return types.Part.from_bytes(data=buffer.getvalue(), mime_type=mime)




@router.post("/generate-image")
async def generate_image(
    request: Request,
    prompt: str = Form(...),
    style: str = Form(default="ghibli"),  # "ghibli" | "sd"
    canvas_image: Optional[UploadFile] = File(default=None),
    upload_image: Optional[UploadFile] = File(default=None),
):
    """
    프롬프트 + 선택적 이미지(캔버스 캡처 or 사용자 업로드)를 받아
    Nano Banana 2로 이미지를 생성합니다.
    """
    # 인증 확인: 토큰이 있으면 user_id 기반, 없으면 IP 기반
    has_token = request.headers.get("authorization", "").startswith("Bearer ")
    user_id = get_user_id_from_token(request)
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown").split(",")[0].strip()

    if user_id:
        rate_key = f"user:{user_id}"
        daily_limit = DAILY_LIMIT_USER
    else:
        rate_key = f"ip:{client_ip}"
        daily_limit = DAILY_LIMIT_ANONYMOUS

    remaining = check_rate_limit(rate_key, daily_limit)
    if remaining <= 0:
        logger.warning("[generate] rate limit 초과 key=%s", rate_key)
        detail = f"일일 생성 횟수({daily_limit}회)를 초과했습니다. 내일 다시 이용해주세요."
        # 토큰을 보냈지만 검증 실패한 경우는 login_required=False
        error_body = {"detail": detail, "login_required": not has_token and user_id is None}
        return JSONResponse(status_code=429, content=error_body)
    increment_usage(rate_key)
    logger.info("[generate] key=%s 오늘 %d/%d회 사용", rate_key, get_usage_count(rate_key), daily_limit)

    # Vertex AI 우선, 없으면 Gemini API 키 fallback
    gcp_project = os.getenv("GCP_PROJECT_ID")
    gcp_location = os.getenv("GCP_LOCATION", "us-central1")
    gemini_key = os.getenv("GEMINI_API_KEY")

    if gcp_project:
        client = genai.Client(
            vertexai=True,
            project=gcp_project,
            location=gcp_location,
        )
        logger.info("[generate] Vertex AI 사용 (project=%s, location=%s)", gcp_project, gcp_location)
    elif gemini_key:
        client = genai.Client(api_key=gemini_key)
        logger.info("[generate] Gemini API 키 사용")
    else:
        raise HTTPException(status_code=500, detail="GCP_PROJECT_ID 또는 GEMINI_API_KEY가 설정되지 않았습니다.")
    style_prompt = STYLE_PROMPTS.get(style, STYLE_PROMPTS["ghibli"])

    # 프롬프트 + 이미지 파트 조합
    parts: list = []

    if canvas_image:
        canvas_bytes = await canvas_image.read()
        pil_img = Image.open(io.BytesIO(canvas_bytes)).convert("RGBA")
        parts.append(_pil_to_part(pil_img, "image/png"))
        parts.append(
            f"{style_prompt}\n\n"
            f"첨부된 현재 디자인을 참고해서, 이 스타일을 유지하면서: {prompt}"
        )
        logger.info("[generate] mode=canvas_image style=%s prompt=%r", style, prompt)
    elif upload_image:
        upload_bytes = await upload_image.read()
        pil_img = Image.open(io.BytesIO(upload_bytes)).convert("RGB")
        parts.append(_pil_to_part(pil_img, "image/jpeg"))
        parts.append(
            f"{style_prompt}\n\n"
            f"첨부된 사진을 참고해서 변환해줘. 요청: {prompt}"
        )
        logger.info("[generate] mode=upload_image style=%s prompt=%r", style, prompt)
    else:
        parts.append(f"{style_prompt}\n\n사용자 요청: {prompt}")
        logger.info("[generate] mode=text_only style=%s prompt=%r", style, prompt)

    models_to_try = [NANO_BANANA_MODEL_PRIMARY, NANO_BANANA_MODEL_FALLBACK]
    last_error: Exception | None = None

    for model_id in models_to_try:
        try:
            logger.info("[generate] Gemini API 호출 시작 model=%s", model_id)
            t0 = time.monotonic()

            response = await client.aio.models.generate_content(
                model=model_id,
                contents=parts,
                config=types.GenerateContentConfig(
                    response_modalities=["TEXT", "IMAGE"],
                ),
            )

            elapsed = time.monotonic() - t0
            logger.info("[generate] Gemini 응답 수신 model=%s (%.1fs)", model_id, elapsed)

            # 응답에서 이미지 추출 + rembg 누끼 처리
            for part in response.candidates[0].content.parts:
                if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                    raw_bytes = part.inline_data.data
                    logger.info("[generate] 이미지 추출 성공 size=%dB — rembg 누끼 시작", len(raw_bytes))

                    t1 = time.monotonic()
                    from rembg import remove as rembg_remove
                    removed = rembg_remove(raw_bytes, session=_get_rembg_session())
                    logger.info("[generate] rembg 완료 (%.1fs)", time.monotonic() - t1)

                    image_b64 = base64.b64encode(removed).decode("utf-8")
                    used_fallback = model_id == NANO_BANANA_MODEL_FALLBACK
                    return JSONResponse({
                        "success": True,
                        "image": f"data:image/png;base64,{image_b64}",
                        **({"fallback": True, "fallback_message": "서버 과부하로 경량 모델로 생성되었어요. 품질이 다소 낮을 수 있습니다."} if used_fallback else {}),
                    })

            logger.warning("[generate] 응답에 이미지 없음 model=%s", model_id)
            raise HTTPException(status_code=500, detail="이미지가 생성되지 않았습니다.")

        except HTTPException:
            raise
        except Exception as e:
            is_quota = "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e)
            if is_quota and model_id == NANO_BANANA_MODEL_PRIMARY:
                logger.warning("[generate] %s 429 발생 → fallback %s", model_id, NANO_BANANA_MODEL_FALLBACK)
                last_error = e
                continue
            logger.exception("[generate] 오류 발생: %s", e)
            if is_quota:
                raise HTTPException(
                    status_code=429,
                    detail="AI 서버가 일시적으로 바빠요. 잠시 후 다시 시도해주세요.",
                )
            raise HTTPException(status_code=500, detail=str(e))

    # 모든 모델 실패
    logger.exception("[generate] 모든 모델 실패: %s", last_error)
    raise HTTPException(status_code=429, detail="AI 서버가 일시적으로 바빠요. 잠시 후 다시 시도해주세요.")
