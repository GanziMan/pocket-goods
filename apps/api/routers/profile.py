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
이 사진의 인물을 깔끔한 증명사진 스타일로 변환해줘.
단색(흰색 또는 연한 파랑) 배경, 정면 얼굴, 증명사진 구도.
자연스러운 피부 보정, 깔끔한 조명.
정사각형 비율로 얼굴이 중앙에 오도록 크롭.
""",
    "instagram": """
이 사진의 인물을 감성적인 인스타그램 프로필 스타일로 변환해줘.
감성적인 자연광 조명, 부드러운 아웃포커스 배경, 화보 느낌.
SNS 프로필에 어울리는 세련된 색감과 분위기.
정사각형 비율로 얼굴이 중앙에 오도록 크롭.
""",
    "ghibli": """
이 사진의 인물을 Studio Ghibli 애니메이션 스타일로 변환해줘.
따뜻하고 부드러운 색감, 손으로 그린 듯한 선, 지브리 특유의 감성적인 분위기.
배경도 지브리 스타일로 자연스럽게.
정사각형 비율로 얼굴이 중앙에 오도록 크롭.
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
