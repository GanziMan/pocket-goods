import base64
import io
import logging
import os
import time

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
}


def _pil_to_part(image: Image.Image, mime: str = "image/jpeg") -> types.Part:
    buffer = io.BytesIO()
    fmt = "PNG" if mime == "image/png" else "JPEG"
    image.save(buffer, format=fmt)
    return types.Part.from_bytes(data=buffer.getvalue(), mime_type=mime)


@router.post("/generate-profile")
async def generate_profile(
    request: Request,
    style: str = Form(...),
    upload_image: UploadFile = File(...),
):
    """
    사진 업로드 + 스타일 선택 → AI 프로필 사진 생성.
    rembg 누끼 처리 없이 배경 유지.
    """
    if style not in PROFILE_STYLE_PROMPTS:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 스타일: {style}")

    # Rate limit
    has_token = request.headers.get("authorization", "").startswith("Bearer ")
    user_id = get_user_id_from_token(request)
    forwarded = request.headers.get("x-forwarded-for", "")
    client_ip = forwarded.split(",")[0].strip() if forwarded else (
        request.client.host if request.client else "unknown"
    )
    if not client_ip:
        client_ip = "unknown"

    if user_id:
        rate_key = f"user:{user_id}"
        daily_limit = DAILY_LIMIT_USER
    else:
        rate_key = f"ip:{client_ip}"
        daily_limit = DAILY_LIMIT_ANONYMOUS

    remaining = check_rate_limit(rate_key, daily_limit)
    if remaining <= 0:
        logger.warning("[profile] rate limit 초과 key=%s", rate_key)
        detail = f"일일 생성 횟수({daily_limit}회)를 초과했습니다. 내일 다시 이용해주세요."
        # 토큰을 보냈지만 검증 실패한 경우는 login_required=False
        error_body = {"detail": detail, "login_required": not has_token and user_id is None}
        return JSONResponse(status_code=429, content=error_body)

    # Gemini client
    gcp_project = os.getenv("GCP_PROJECT_ID")
    gcp_location = os.getenv("GCP_LOCATION", "us-central1")
    gemini_key = os.getenv("GEMINI_API_KEY")

    if gcp_project:
        client = genai.Client(
            vertexai=True, project=gcp_project, location=gcp_location
        )
        logger.info("[profile] Vertex AI 사용 (project=%s)", gcp_project)
    elif gemini_key:
        client = genai.Client(api_key=gemini_key)
        logger.info("[profile] Gemini API 키 사용")
    else:
        raise HTTPException(
            status_code=500,
            detail="GCP_PROJECT_ID 또는 GEMINI_API_KEY가 설정되지 않았습니다.",
        )

    # 이미지 검증 + 프롬프트
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    upload_bytes = await upload_image.read()
    if len(upload_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="파일 크기는 10MB 이하만 가능합니다.")

    try:
        pil_img = ImageOps.exif_transpose(Image.open(io.BytesIO(upload_bytes))).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="올바른 이미지 파일이 아닙니다.")
    style_prompt = PROFILE_STYLE_PROMPTS[style]

    parts: list = [
        _pil_to_part(pil_img, "image/jpeg"),
        style_prompt,
    ]
    logger.info("[profile] style=%s image_size=%s", style, pil_img.size)

    try:
        logger.info("[profile] Gemini API 호출 시작 model=%s", PROFILE_MODEL)
        t0 = time.monotonic()

        response = await client.aio.models.generate_content(
            model=PROFILE_MODEL,
            contents=parts,
            config=types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"],
            ),
        )

        elapsed = time.monotonic() - t0
        logger.info("[profile] Gemini 응답 수신 (%.1fs)", elapsed)

        for part in response.candidates[0].content.parts:
            if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                raw_bytes = part.inline_data.data
                logger.info("[profile] 이미지 추출 성공 size=%dB", len(raw_bytes))

                increment_usage(rate_key)
                logger.info(
                    "[profile] key=%s 오늘 %d/%d회 사용",
                    rate_key,
                    get_usage_count(rate_key),
                    daily_limit,
                )

                image_b64 = base64.b64encode(raw_bytes).decode("utf-8")
                return JSONResponse(
                    {
                        "success": True,
                        "image": f"data:image/png;base64,{image_b64}",
                    }
                )

        logger.warning("[profile] 응답에 이미지 없음")
        raise HTTPException(status_code=500, detail="이미지가 생성되지 않았습니다.")

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("[profile] 오류 발생: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
