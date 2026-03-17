import base64
import io
import logging
import os
import time
from collections import defaultdict
from datetime import date
from typing import Optional

from google import genai
from google.genai import types
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image
from supabase import create_client as create_supabase_client

# IP별 일일 요청 제한 (비로그인)
DAILY_LIMIT_ANONYMOUS = 2
# 유저별 일일 요청 제한 (로그인)
DAILY_LIMIT_USER = 10
_usage: dict[str, dict[str, int]] = defaultdict(lambda: {"date": "", "count": 0})

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["generate"])

# NANO_BANANA_MODEL = "gemini-3.1-flash-image-preview"
NANO_BANANA_MODEL = "gemini-2.5-flash-image"
STYLE_PROMPTS: dict[str, str] = {
    "ghibli": """
Studio Ghibli 애니메이션 스타일로 그려줘.
따뜻하고 부드러운 색감, 손으로 그린 듯한 선, 지브리 특유의 감성적인 분위기.
배경은 투명하게(누끼) 처리하고, 굿즈(키링, 스티커) 인쇄에 적합하게 만들어줘.
""",
    "sd": """
SD(슈퍼 디포르메) 캐릭터 스타일로 그려줘.
머리가 크고 몸이 작은 2~3등신 귀여운 치비(chibi) 스타일.
크고 반짝이는 눈, 단순하고 깔끔한 선, 밝고 채도 높은 색감.
배경은 투명하게(누끼) 처리하고, 굿즈(키링, 스티커) 인쇄에 적합하게 만들어줘.
""",
    "steampunk": """
스팀펑크 스타일로 그려줘.
톱니바퀴, 증기 파이프, 황동·구리 금속 질감, 빅토리아 시대 복식.
어둡고 따뜻한 세피아·브라운 톤, 정교한 기계 부품과 가죽 질감.
배경은 투명하게(누끼) 처리하고, 굿즈(키링, 스티커) 인쇄에 적합하게 만들어줘.
""",
    "akatsuki": """
나루토 애니메이션의 아카츠키 스타일로 실사화로 만들어줘.
검은 망토에 붉은 구름 문양, 날카롭고 강렬한 눈빛, 어둡고 신비로운 분위기.
채도 높은 붉은색과 검정의 강한 대비, 선명하고 굵은 윤곽선의 일본 닌자 애니메이션 스타일.
배경은 투명하게(누끼) 처리하고, 굿즈(키링, 스티커) 인쇄에 적합하게 만들어줘.
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


def _check_rate_limit(key: str, limit: int) -> int:
    """남은 횟수를 반환. 0이면 제한 초과."""
    today = date.today().isoformat()
    entry = _usage[key]
    if entry["date"] != today:
        entry["date"] = today
        entry["count"] = 0
    remaining = limit - entry["count"]
    return remaining


def _get_user_id_from_token(request: Request) -> Optional[str]:
    """Authorization 헤더에서 Supabase JWT를 검증하고 user_id를 반환."""
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header[7:]
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        logger.warning("[auth] SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 미설정")
        return None

    try:
        supabase = create_supabase_client(supabase_url, supabase_key)
        user_response = supabase.auth.get_user(token)
        if user_response and user_response.user:
            return user_response.user.id
    except Exception as e:
        logger.warning("[auth] 토큰 검증 실패: %s", e)

    return None


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
    user_id = _get_user_id_from_token(request)
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown").split(",")[0].strip()

    if user_id:
        rate_key = f"user:{user_id}"
        daily_limit = DAILY_LIMIT_USER
    else:
        rate_key = f"ip:{client_ip}"
        daily_limit = DAILY_LIMIT_ANONYMOUS

    remaining = _check_rate_limit(rate_key, daily_limit)
    if remaining <= 0:
        logger.warning("[generate] rate limit 초과 key=%s", rate_key)
        detail = f"일일 생성 횟수({daily_limit}회)를 초과했습니다. 내일 다시 이용해주세요."
        error_body = {"detail": detail, "login_required": user_id is None}
        return JSONResponse(status_code=429, content=error_body)
    _usage[rate_key]["count"] += 1
    logger.info("[generate] key=%s 오늘 %d/%d회 사용", rate_key, _usage[rate_key]["count"], daily_limit)

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY가 설정되지 않았습니다.")

    client = genai.Client(api_key=api_key)
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

    try:
        logger.info("[generate] Gemini API 호출 시작 model=%s", NANO_BANANA_MODEL)
        t0 = time.monotonic()

        response = await client.aio.models.generate_content(
            model=NANO_BANANA_MODEL,
            contents=parts,
            config=types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"],
            ),
        )

        elapsed = time.monotonic() - t0
        logger.info("[generate] Gemini 응답 수신 (%.1fs)", elapsed)

        # 응답에서 이미지 추출
        for part in response.candidates[0].content.parts:
            if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                image_b64 = base64.b64encode(part.inline_data.data).decode("utf-8")
                mime = part.inline_data.mime_type
                logger.info("[generate] 이미지 추출 성공 mime=%s size=%dB", mime, len(part.inline_data.data))
                return JSONResponse({
                    "success": True,
                    "image": f"data:{mime};base64,{image_b64}",
                })

        logger.warning("[generate] 응답에 이미지 없음 candidates=%s", response.candidates)
        raise HTTPException(status_code=500, detail="이미지가 생성되지 않았습니다.")

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("[generate] 오류 발생: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
