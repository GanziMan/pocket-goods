"""
Fabric.js JSON → 고해상도 PNG 렌더러 (Pillow)

좌표 변환 규칙:
  - Fabric left/top은 originX/originY 기준 위치
  - originX/Y 기본값: "left" / "top" (이미지)
  - 텍스트/스티커: "center" / "center"
  - 회전은 origin 기준으로 적용
"""
import base64
import io
import logging
import math
from typing import Literal

from PIL import Image, ImageDraw

from services.fonts import get_pil_font

logger = logging.getLogger(__name__)

DPI = 300
BLEED_MM = 3.0

# 제품별 인쇄 실물 크기 (mm)
PRINT_SIZES_MM: dict[str, tuple[float, float]] = {
    "keyring": (148.0, 210.0),  # A5
    "sticker": (148.0, 210.0),  # A5
}

# 캔버스 표시 크기 (px) — assets.ts와 동기화
CANVAS_DISPLAY_PX: dict[str, tuple[int, int]] = {
    "keyring": (420, 595),
    "sticker": (420, 595),
}


def mm_to_px(mm: float, dpi: int = DPI) -> int:
    return round(mm * dpi / 25.4)


def _decode_image(src: str) -> Image.Image:
    """data URL 또는 http URL → PIL Image"""
    if src.startswith("data:"):
        _, data = src.split(",", 1)
        return Image.open(io.BytesIO(base64.b64decode(data))).convert("RGBA")
    import requests
    resp = requests.get(src, timeout=15)
    return Image.open(io.BytesIO(resp.content)).convert("RGBA")


def _apply_opacity(img: Image.Image, opacity: float) -> Image.Image:
    if opacity >= 1.0:
        return img
    r, g, b, a = img.split()
    a = a.point(lambda x: int(x * opacity))
    return Image.merge("RGBA", (r, g, b, a))


def _paste_rotated(
    canvas: Image.Image,
    obj_img: Image.Image,
    cx: int,
    cy: int,
    angle: float,
) -> None:
    """
    obj_img를 canvas의 (cx, cy) 중심점에 angle도 회전해서 합성.
    Fabric의 회전은 시계방향이므로 PIL에는 -angle.
    """
    if angle != 0:
        obj_img = obj_img.rotate(-angle, expand=True, resample=Image.BICUBIC)
    paste_x = cx - obj_img.width // 2
    paste_y = cy - obj_img.height // 2
    canvas.paste(obj_img, (paste_x, paste_y), obj_img)


def _origin_to_center(
    left: float,
    top: float,
    w: float,
    h: float,
    origin_x: str,
    origin_y: str,
) -> tuple[float, float]:
    """Fabric origin 위치 → 오브젝트 중심 좌표 변환"""
    if origin_x == "left":
        cx = left + w / 2
    elif origin_x == "right":
        cx = left - w / 2
    else:  # center
        cx = left

    if origin_y == "top":
        cy = top + h / 2
    elif origin_y == "bottom":
        cy = top - h / 2
    else:  # center
        cy = top

    return cx, cy


CUTTING_LINE_COLOR = (255, 0, 255, 255)  # Magenta RGB(255,0,255) / CMYK(0,100,0,0)
CUTTING_LINE_OFFSET_PX = 2


def _render_cutting_line(
    canvas: Image.Image,
    obj_img: Image.Image,
    cx: int,
    cy: int,
    angle: float,
) -> None:
    """
    RGBA 이미지 외곽에 마젠타 칼선을 2px 오프셋으로 그린다.
    캐릭터보다 먼저 합성해야 칼선이 캐릭터 아래에 위치한다.
    """
    if obj_img.mode != "RGBA":
        return

    from PIL import ImageChops, ImageFilter

    alpha = obj_img.split()[3]

    dilated = alpha.filter(ImageFilter.MaxFilter(size=CUTTING_LINE_OFFSET_PX * 2 + 1))

    outline_alpha = ImageChops.subtract(dilated, alpha)

    magenta = Image.new("RGBA", obj_img.size, CUTTING_LINE_COLOR)
    magenta.putalpha(outline_alpha)

    _paste_rotated(canvas, magenta, cx, cy, angle)


def _render_image_obj(canvas: Image.Image, obj: dict, sx: float, sy: float, bleed: int) -> None:
    src = obj.get("src", "")
    if not src:
        return
    try:
        img = _decode_image(src)
    except Exception as e:
        print(f"[renderer] image decode failed: {e}")
        return

    orig_w = obj.get("width", img.width)
    orig_h = obj.get("height", img.height)
    scale_x = obj.get("scaleX", 1.0)
    scale_y = obj.get("scaleY", 1.0)
    angle = obj.get("angle", 0.0)
    opacity = obj.get("opacity", 1.0)
    left = obj.get("left", 0.0)
    top = obj.get("top", 0.0)
    origin_x = obj.get("originX", "left")
    origin_y = obj.get("originY", "top")

    # 실제 표시 크기
    disp_w = orig_w * scale_x
    disp_h = orig_h * scale_y

    # 인쇄 크기로 변환
    print_w = round(disp_w * sx)
    print_h = round(disp_h * sy)

    img = img.resize((print_w, print_h), Image.LANCZOS)
    img = _apply_opacity(img, opacity)

    # 중심 좌표
    cx_disp, cy_disp = _origin_to_center(left, top, disp_w, disp_h, origin_x, origin_y)
    cx = round(cx_disp * sx) + bleed
    cy = round(cy_disp * sy) + bleed

    # 칼선 먼저 합성 (캐릭터 아래에 위치)
    _render_cutting_line(canvas, img, cx, cy, angle)
    _paste_rotated(canvas, img, cx, cy, angle)


def _render_text_obj(canvas: Image.Image, obj: dict, sx: float, sy: float, bleed: int) -> None:
    text = obj.get("text", "")
    if not text:
        return

    left = obj.get("left", 0.0)
    top = obj.get("top", 0.0)
    font_size_disp = obj.get("fontSize", 36)
    scale_x = obj.get("scaleX", 1.0)
    font_family = obj.get("fontFamily", "Arial")
    fill = obj.get("fill", "#000000")
    angle = obj.get("angle", 0.0)
    opacity = obj.get("opacity", 1.0)
    origin_x = obj.get("originX", "left")
    origin_y = obj.get("originY", "top")

    # 인쇄용 폰트 크기 (sx 기준, 텍스트는 정방향 스케일)
    font_size_print = round(font_size_disp * scale_x * sx)
    font = get_pil_font(font_family, font_size_print)

    # 텍스트 크기 측정
    tmp_img = Image.new("RGBA", (1, 1))
    tmp_draw = ImageDraw.Draw(tmp_img)
    bbox = tmp_draw.textbbox((0, 0), text, font=font)
    txt_w = bbox[2] - bbox[0]
    txt_h = bbox[3] - bbox[1]

    # 텍스트를 별도 이미지에 그린 후 합성 (회전 + 불투명도 처리)
    txt_img = Image.new("RGBA", (txt_w + 4, txt_h + 4), (0, 0, 0, 0))
    draw = ImageDraw.Draw(txt_img)

    # fill이 문자열이면 그대로, rgba tuple 처리
    try:
        draw.text((2, 2), text, font=font, fill=fill)
    except Exception:
        draw.text((2, 2), text, font=font, fill="#000000")

    txt_img = _apply_opacity(txt_img, opacity)

    # 중심 좌표 계산 (origin 반영)
    disp_w = font_size_disp * scale_x * len(text) * 0.6  # 근사치
    disp_h = font_size_disp * scale_x

    cx_disp, cy_disp = _origin_to_center(left, top, txt_w / sx, txt_h / sy, origin_x, origin_y)
    cx = round(cx_disp * sx) + bleed
    cy = round(cy_disp * sy) + bleed

    _paste_rotated(canvas, txt_img, cx, cy, angle)


def render_canvas(canvas_json: dict, product_type: str) -> Image.Image:
    """
    Fabric.js JSON → PIL Image (300 DPI + 3mm 재단선 포함)
    """
    w_mm, h_mm = PRINT_SIZES_MM.get(product_type, (60.0, 60.0))
    canvas_w, canvas_h = CANVAS_DISPLAY_PX.get(product_type, (480, 480))

    bleed_px = mm_to_px(BLEED_MM)
    print_w = mm_to_px(w_mm)
    print_h = mm_to_px(h_mm)

    # 표시 px → 인쇄 px 스케일 비율
    sx = print_w / canvas_w
    sy = print_h / canvas_h

    # 재단선 포함 최종 이미지
    final_w = print_w + 2 * bleed_px
    final_h = print_h + 2 * bleed_px

    bg = canvas_json.get("background", "#ffffff") or "#ffffff"
    result = Image.new("RGBA", (final_w, final_h), bg)

    objects = canvas_json.get("objects", [])
    logger.info("[renderer] product=%s objects=%d", product_type, len(objects))
    for obj in objects:
        obj_type = obj.get("type", "")
        logger.info("[renderer] obj type=%r keys=%s", obj_type, list(obj.keys()))
        if obj_type.lower() == "image":
            _render_image_obj(result, obj, sx, sy, bleed_px)
        elif obj_type.lower() in ("i-text", "text"):
            _render_text_obj(result, obj, sx, sy, bleed_px)
        else:
            logger.warning("[renderer] unknown type=%r — skipped", obj_type)

    return result


def to_png_bytes(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="PNG", dpi=(DPI, DPI))
    return buf.getvalue()
