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

import cv2
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

from services.fonts import get_pil_font

logger = logging.getLogger(__name__)

DPI = 300

OutputSize = Literal["A4", "A5", "A6"]

# 출력 캔버스(배경) 크기: 300 DPI 기준에서 6mm 역보정한 픽셀값
OUTPUT_SIZES_PX: dict[OutputSize, tuple[int, int]] = {
    "A4": (2365, 3393),
    "A5": (1633, 2365),
    "A6": (1125, 1633),
}

# 에디터 캔버스 표시 크기(px) — apps/web/src/lib/output-size.ts와 동기화
# A5는 기존 420×595를 유지하고 A4/A6은 바깥 시트만 비율대로 변경한다.
CANVAS_DISPLAY_SIZES_PX: dict[OutputSize, tuple[int, int]] = {
    "A4": (595, 842),
    "A5": (420, 595),
    "A6": (298, 420),
}

TEXT_OBJECT_TYPES = {"i-text", "itext", "text", "textbox", "fabrictext"}


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


def _obj_type(obj: dict) -> str:
    return str(obj.get("type", "")).lower()


def _is_text_obj(obj: dict) -> bool:
    return _obj_type(obj) in TEXT_OBJECT_TYPES


def _is_name_tag_obj(obj: dict) -> bool:
    return obj.get("pocketGoodsKind") == "name-tag"


def _parse_color(value: object, fallback: str = "#000000") -> object:
    if isinstance(value, str) and value:
        return value
    if isinstance(value, dict):
        source = value.get("source")
        if isinstance(source, str) and source:
            return source
    return fallback


def _text_bbox(text: str, font: ImageFont.ImageFont) -> tuple[int, int, int, int]:
    tmp_img = Image.new("RGBA", (1, 1))
    tmp_draw = ImageDraw.Draw(tmp_img)
    return tmp_draw.multiline_textbbox((0, 0), text, font=font, spacing=4)


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


# CUTTING_LINE_COLOR = (255, 0, 255, 255)  # 임시 비활성화
# CUTTING_LINE_OFFSET_PX = 6  # 임시 비활성화
# CUTTING_LINE_CLOSE_GAP_PX = 24  # 임시 비활성화


def _get_exterior_mask(alpha: Image.Image) -> Image.Image:
    """
    외부(캐릭터 바깥)에서 접근 가능한 투명 영역 마스크를 반환한다.
    내부 구멍(internal holes)은 포함하지 않는다.
    """
    w, h = alpha.size
    # 이진화: 투명=255, 불투명=0
    binary = alpha.point(lambda x: 255 if x < 128 else 0).convert("L")
    # 1px 패딩 추가 — 캐릭터가 코너에 붙어있어도 flood fill 시작점 확보
    padded = Image.new("L", (w + 2, h + 2), 255)
    padded.paste(binary, (1, 1))
    # 코너(0,0)에서 외부 투명 영역을 128로 flood fill
    ImageDraw.floodfill(padded, xy=(0, 0), value=128)
    # 패딩 제거 후 외부 마스크 추출
    cropped = padded.crop((1, 1, w + 1, h + 1))
    return cropped.point(lambda x: 255 if x == 128 else 0)


def _render_cutting_line(
    canvas: Image.Image,
    obj_img: Image.Image,
    cx: int,
    cy: int,
    angle: float,
) -> None:
    """
    RGBA 이미지 외각에만 마젠타 칼선을 그린다.
    OpenCV 원형 커널로 부드러운 아웃라인 생성.
    내부 투명 구멍에는 칼선을 그리지 않는다.
    캐릭터보다 먼저 합성해야 칼선이 캐릭터 아래에 위치한다.
    """
    # 칼선 기능 임시 비활성화
    return

    alpha = obj_img.split()[3]

    # 완전 불투명 이미지는 칼선 생략
    if alpha.getextrema()[0] > 0:
        return

    alpha_np = np.array(alpha, dtype=np.uint8)

    # 알파 노이즈 제거 + 이진화: 10% 미만 → 투명 처리
    _, binary = cv2.threshold(alpha_np, 25, 255, cv2.THRESH_BINARY)

    # GaussianBlur → 재이진화: 거친 엣지와 세밀한 요철을 부드럽게
    blurred = cv2.GaussianBlur(binary, (7, 7), 0)
    _, binary = cv2.threshold(blurred, 128, 255, cv2.THRESH_BINARY)

    # 원형 커널로 팽창 (정사각형 MaxFilter 대비 모서리가 둥글고 균일)
    offset = CUTTING_LINE_OFFSET_PX
    kernel_size = offset * 2 + 1
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    dilated = cv2.dilate(binary, kernel, iterations=1)

    # 두 번째 팽창: 아웃라인 두께용 (안쪽 경계)
    inner_offset = max(offset - 2, 1)
    inner_kernel_size = inner_offset * 2 + 1
    inner_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (inner_kernel_size, inner_kernel_size))
    inner_dilated = cv2.dilate(binary, inner_kernel, iterations=1)

    # 아웃라인 = 바깥 팽창 - 안쪽 팽창 (일정한 두께의 띠)
    outline = cv2.subtract(dilated, inner_dilated)

    # 외부 마스크: 내부 구멍의 아웃라인 제거
    exterior_mask = _get_exterior_mask(Image.fromarray(binary))
    exterior_np = np.array(exterior_mask, dtype=np.uint8)
    outline = cv2.bitwise_and(outline, exterior_np)

    # Anti-aliasing: 아웃라인 엣지를 부드럽게
    outline = cv2.GaussianBlur(outline, (3, 3), 0)

    outline_alpha = Image.fromarray(outline)
    magenta = Image.new("RGBA", obj_img.size, CUTTING_LINE_COLOR)
    magenta.putalpha(outline_alpha)

    _paste_rotated(canvas, magenta, cx, cy, angle)


def _render_combined_cutting_line(canvas: Image.Image, obj_layer: Image.Image) -> None:
    """
    모든 오브젝트가 합쳐진 레이어의 알파 채널로 통합 칼선을 생성한다.
    겹친 이미지/텍스트가 하나의 칼선으로 처리된다.
    """
    # 칼선 기능 임시 비활성화
    return

    alpha = obj_layer.split()[3]

    # 완전 불투명(투명 픽셀 없음) → 칼선 불필요
    if alpha.getextrema()[0] > 0:
        return

    alpha_np = np.array(alpha, dtype=np.uint8)

    # 알파 노이즈 제거 + 이진화
    _, binary = cv2.threshold(alpha_np, 25, 255, cv2.THRESH_BINARY)

    # GaussianBlur → 재이진화: 거친 엣지 스무딩
    blurred = cv2.GaussianBlur(binary, (7, 7), 0)
    _, binary = cv2.threshold(blurred, 128, 255, cv2.THRESH_BINARY)

    # Morphological close: 인접 오브젝트 병합
    if CUTTING_LINE_CLOSE_GAP_PX > 0:
        close_kernel_size = CUTTING_LINE_CLOSE_GAP_PX * 2 + 1
        close_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (close_kernel_size, close_kernel_size))
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, close_kernel, iterations=1)

    # 원형 커널로 바깥 팽창
    offset = CUTTING_LINE_OFFSET_PX
    kernel_size = offset * 2 + 1
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    dilated = cv2.dilate(binary, kernel, iterations=1)

    # 안쪽 팽창 (일정 두께 띠 생성)
    inner_offset = max(offset - 2, 1)
    inner_kernel_size = inner_offset * 2 + 1
    inner_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (inner_kernel_size, inner_kernel_size))
    inner_dilated = cv2.dilate(binary, inner_kernel, iterations=1)

    outline = cv2.subtract(dilated, inner_dilated)

    # 외부 마스크: 내부 구멍 칼선 제거
    exterior_mask = _get_exterior_mask(Image.fromarray(binary))
    exterior_np = np.array(exterior_mask, dtype=np.uint8)
    outline = cv2.bitwise_and(outline, exterior_np)

    # Anti-aliasing
    outline = cv2.GaussianBlur(outline, (3, 3), 0)

    outline_alpha = Image.fromarray(outline)
    magenta = Image.new("RGBA", obj_layer.size, CUTTING_LINE_COLOR)
    magenta.putalpha(outline_alpha)

    canvas.paste(magenta, (0, 0), magenta)


def _render_image_obj(canvas: Image.Image, obj: dict, sx: float, sy: float, offset_x: int, offset_y: int, with_cutting_line: bool = True) -> None:
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
    cx = round(cx_disp * sx) + offset_x
    cy = round(cy_disp * sy) + offset_y

    if with_cutting_line:
        _render_cutting_line(canvas, img, cx, cy, angle)
    _paste_rotated(canvas, img, cx, cy, angle)


def _render_text_obj(canvas: Image.Image, obj: dict, sx: float, sy: float, offset_x: int, offset_y: int, with_cutting_line: bool = True) -> None:
    text = obj.get("text", "")
    if not text:
        return

    left = obj.get("left", 0.0)
    top = obj.get("top", 0.0)
    font_size_disp = obj.get("fontSize", 36)
    scale_x = obj.get("scaleX", 1.0)
    font_family = obj.get("fontFamily", "Arial")
    fill = _parse_color(obj.get("fill"), "#000000")
    angle = obj.get("angle", 0.0)
    opacity = obj.get("opacity", 1.0)
    origin_x = obj.get("originX", "left")
    origin_y = obj.get("originY", "top")

    # 인쇄용 폰트 크기 (sx 기준, 텍스트는 정방향 스케일)
    font_size_print = round(font_size_disp * scale_x * sx)
    font = get_pil_font(font_family, font_size_print)

    # 텍스트 크기 측정. Fabric v7은 IText/Textbox 타입명을 대문자 없이 직렬화할 수
    # 있어서 타입 판별은 호출부에서 정규화하고, 여기서는 multiline까지 안전하게 렌더링한다.
    bbox = _text_bbox(text, font)
    txt_w = bbox[2] - bbox[0]
    txt_h = bbox[3] - bbox[1]

    # 텍스트를 별도 이미지에 그린 후 합성 (회전 + 불투명도 처리)
    pad = max(4, round(font_size_print * 0.12))
    txt_img = Image.new("RGBA", (txt_w + pad * 2, txt_h + pad * 2), (0, 0, 0, 0))
    draw = ImageDraw.Draw(txt_img)

    # fill이 문자열이면 그대로, rgba tuple 처리
    try:
        draw.multiline_text((pad - bbox[0], pad - bbox[1]), text, font=font, fill=fill, spacing=4)
    except Exception:
        draw.multiline_text((pad - bbox[0], pad - bbox[1]), text, font=font, fill="#000000", spacing=4)

    txt_img = _apply_opacity(txt_img, opacity)

    # 중심 좌표 계산 (origin 반영)
    cx_disp, cy_disp = _origin_to_center(
        left,
        top,
        txt_img.width / sx,
        txt_img.height / sy,
        origin_x,
        origin_y,
    )
    cx = round(cx_disp * sx) + offset_x
    cy = round(cy_disp * sy) + offset_y

    if with_cutting_line:
        _render_cutting_line(canvas, txt_img, cx, cy, angle)
    _paste_rotated(canvas, txt_img, cx, cy, angle)


def _render_name_tag_obj(canvas: Image.Image, obj: dict, sx: float, sy: float, offset_x: int, offset_y: int) -> None:
    """Render Pocket Goods' custom pill-shaped editable name tag."""
    text = str(obj.get("labelText") or "")
    if not text:
        # Older drafts may only have the inner text object.
        for child in obj.get("objects", []) or []:
            if isinstance(child, dict) and _is_text_obj(child):
                text = str(child.get("text") or "")
                break
    if not text:
        return

    left = float(obj.get("left", 0.0))
    top = float(obj.get("top", 0.0))
    width = float(obj.get("width", 140.0))
    height = float(obj.get("height", 58.0))
    scale_x = float(obj.get("scaleX", 1.0))
    scale_y = float(obj.get("scaleY", 1.0))
    angle = float(obj.get("angle", 0.0))
    opacity = float(obj.get("opacity", 1.0))
    origin_x = obj.get("originX", "left")
    origin_y = obj.get("originY", "top")

    fill = _parse_color(obj.get("labelFill"), "#fff7ed")
    stroke = _parse_color(obj.get("labelStroke"), "#fb923c")
    stroke_width = max(0, float(obj.get("labelStrokeWidth", 3)))
    radius = max(0, float(obj.get("labelRadius", 28)))
    padding_x = max(0, float(obj.get("labelPaddingX", 34)))
    padding_y = max(0, float(obj.get("labelPaddingY", 14)))
    font_size_disp = max(1, float(obj.get("labelFontSize", 32)))
    font_family = str(obj.get("labelFontFamily", "Geist, Arial, sans-serif"))
    text_fill = _parse_color(obj.get("labelTextFill"), "#1f2937")

    font_size_print = max(1, round(font_size_disp * scale_x * sx))
    font = get_pil_font(font_family, font_size_print)
    text_bbox = _text_bbox(text, font)
    text_w = text_bbox[2] - text_bbox[0]
    text_h = text_bbox[3] - text_bbox[1]

    print_w = max(1, round(width * scale_x * sx))
    print_h = max(1, round(height * scale_y * sy))

    # If the Fabric group did not refresh dimensions after an edit, keep the
    # printed pill large enough for the latest metadata.
    min_w = round(text_w + padding_x * 2 * scale_x * sx)
    min_h = round(text_h + padding_y * 2 * scale_y * sy)
    print_w = max(print_w, min_w)
    print_h = max(print_h, min_h)

    tag_img = Image.new("RGBA", (print_w, print_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(tag_img)
    sw = max(0, round(stroke_width * ((sx + sy) / 2)))
    rr = min(round(radius * ((sx + sy) / 2)), print_h // 2, print_w // 2)
    inset = sw // 2
    draw.rounded_rectangle(
        (inset, inset, print_w - inset - 1, print_h - inset - 1),
        radius=rr,
        fill=fill,
        outline=stroke if sw > 0 else None,
        width=sw,
    )

    tx = (print_w - text_w) / 2 - text_bbox[0]
    ty = (print_h - text_h) / 2 - text_bbox[1]
    try:
        draw.multiline_text((tx, ty), text, font=font, fill=text_fill, spacing=4, align="center")
    except Exception:
        draw.multiline_text((tx, ty), text, font=font, fill="#1f2937", spacing=4, align="center")

    tag_img = _apply_opacity(tag_img, opacity)

    cx_disp, cy_disp = _origin_to_center(left, top, width * scale_x, height * scale_y, str(origin_x), str(origin_y))
    cx = round(cx_disp * sx) + offset_x
    cy = round(cy_disp * sy) + offset_y
    _paste_rotated(canvas, tag_img, cx, cy, angle)


def render_canvas(
    canvas_json: dict,
    product_type: str,
    transparent_bg: bool = True,
    with_cutting_line: bool = True,
    output_size: OutputSize = "A5",
    dpi: int = DPI,
) -> Image.Image:
    """
    Fabric.js JSON → PIL Image (지정 DPI + 3mm 재단선 포함)
    """
    final_w, final_h = OUTPUT_SIZES_PX.get(output_size, OUTPUT_SIZES_PX["A5"])
    canvas_w, canvas_h = CANVAS_DISPLAY_SIZES_PX.get(output_size, CANVAS_DISPLAY_SIZES_PX["A5"])

    # 출력 해상도(px) 자체를 기준으로 오브젝트 스케일 계산
    print_w = final_w
    print_h = final_h

    # 표시 px → 인쇄 px 스케일 비율
    sx = print_w / canvas_w
    sy = print_h / canvas_h

    # 작업물은 기존 인쇄 크기 기준 그대로 두고, 배경 캔버스만 선택 규격으로 변경
    offset_x = (final_w - print_w) // 2
    offset_y = (final_h - print_h) // 2

    if transparent_bg:
        result = Image.new("RGBA", (final_w, final_h), (0, 0, 0, 0))
    else:
        result = Image.new("RGBA", (final_w, final_h), (0, 0, 0, 0))

    objects = canvas_json.get("objects", [])
    logger.info("[renderer] product=%s objects=%d", product_type, len(objects))

    # 칼선 기능(생성/오프셋/렌더링) 임시 비활성화
    # if with_cutting_line:
    #     ...
    for obj in objects:
        obj_type = obj.get("type", "")
        logger.info("[renderer] obj type=%r keys=%s", obj_type, list(obj.keys()))
        if _is_name_tag_obj(obj):
            _render_name_tag_obj(result, obj, sx, sy, offset_x, offset_y)
        elif _obj_type(obj) == "image":
            _render_image_obj(result, obj, sx, sy, offset_x, offset_y, with_cutting_line=False)
        elif _is_text_obj(obj):
            _render_text_obj(result, obj, sx, sy, offset_x, offset_y, with_cutting_line=False)
        else:
            logger.warning("[renderer] unknown type=%r — skipped", obj_type)

    return result


def to_png_bytes(img: Image.Image, dpi: int = DPI) -> bytes:
    buf = io.BytesIO()
    img.convert("RGBA").save(buf, format="PNG", dpi=(dpi, dpi))
    return buf.getvalue()
