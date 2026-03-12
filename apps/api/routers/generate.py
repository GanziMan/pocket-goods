import base64
import io
import logging
import os
import time
from typing import Optional

from google import genai
from google.genai import types
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image

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
    prompt: str = Form(...),
    style: str = Form(default="ghibli"),  # "ghibli" | "sd"
    canvas_image: Optional[UploadFile] = File(default=None),
    upload_image: Optional[UploadFile] = File(default=None),
):
    """
    프롬프트 + 선택적 이미지(캔버스 캡처 or 사용자 업로드)를 받아
    Nano Banana 2로 이미지를 생성합니다.
    """
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
