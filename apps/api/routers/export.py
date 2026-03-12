"""
POST /api/export
Fabric.js JSON → 300 DPI PNG 생성 → Supabase Storage 업로드
"""
import base64
import logging
import uuid
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.cutting_line import generate_cutting_line_svg
from services.renderer import render_canvas, to_png_bytes, mm_to_px, PRINT_SIZES_MM
from services.storage import upload_print_file, upload_thumbnail

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["export"])


class ExportRequest(BaseModel):
    canvas_json: dict
    product_type: Literal["keyring", "sticker"] = "keyring"
    order_id: str | None = None   # 결제 완료 후 전달, 없으면 미리보기 전용
    save_to_storage: bool = False  # True면 Supabase 업로드


class ExportResponse(BaseModel):
    print_url: str | None = None    # Supabase signed URL (save_to_storage=True)
    thumbnail_url: str | None = None
    cutting_line_svg: str | None = None  # 스티커 칼선 SVG path (save_to_storage=True)


class PreviewExportResponse(BaseModel):
    png_base64: str
    cutting_line_svg: str | None = None  # 스티커+objects 있을 때만 포함


@router.post("/export")
async def export_design(req: ExportRequest):
    """
    1. Fabric.js JSON → Pillow 300 DPI PNG 합성
    2. save_to_storage=True면 Supabase에 업로드하고 URL 반환
    3. False면 PNG를 직접 응답 (미리보기 다운로드용)
    """
    try:
        img = render_canvas(req.canvas_json, req.product_type)
        png_bytes = to_png_bytes(img)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"렌더링 실패: {e}")

    # 미리보기 다운로드 — JSON 반환 (PNG base64 + 칼선 SVG)
    if not req.save_to_storage:
        png_b64 = base64.b64encode(png_bytes).decode()
        cutting_svg: str | None = None
        if req.product_type == "sticker" and req.canvas_json.get("objects"):
            try:
                img_transparent = render_canvas(
                    req.canvas_json, req.product_type, transparent_bg=True
                )
                path = generate_cutting_line_svg(img_transparent)
                if path:
                    w_mm, h_mm = PRINT_SIZES_MM.get(req.product_type, (60.0, 60.0))
                    pw = mm_to_px(w_mm)
                    ph = mm_to_px(h_mm)
                    cutting_svg = (
                        f'<svg xmlns="http://www.w3.org/2000/svg" '
                        f'viewBox="0 0 {pw} {ph}" width="{pw}" height="{ph}">'
                        f'<path d="{path}" fill="none" stroke="#ff00ff" stroke-width="2"/>'
                        f'</svg>'
                    )
            except Exception as e:
                logger.warning("[export] 칼선 미리보기 생성 실패 (무시): %s", e)
        return PreviewExportResponse(png_base64=png_b64, cutting_line_svg=cutting_svg)

    # 칼선 생성 — 투명 배경으로 재렌더링 (오브젝트가 있는 스티커만)
    cutting_line_svg: str | None = None
    if req.product_type == "sticker" and req.canvas_json.get("objects"):
        try:
            img_transparent = render_canvas(
                req.canvas_json, req.product_type, transparent_bg=True
            )
            cutting_line_svg = generate_cutting_line_svg(img_transparent)
        except Exception as e:
            logger.warning("[export] 칼선 생성 실패 (무시): %s", e)

    # Supabase 업로드
    order_id = req.order_id or str(uuid.uuid4())
    design_id = str(uuid.uuid4())

    try:
        print_url = upload_print_file(png_bytes, order_id)
        thumbnail_url = upload_thumbnail(png_bytes, design_id)
    except RuntimeError as e:
        # Supabase 미설정 시 — URL 없이 성공 처리 (개발 환경)
        logger.warning("[export] storage skip: %s", e)
        print_url = None
        thumbnail_url = None

    return ExportResponse(
        print_url=print_url,
        thumbnail_url=thumbnail_url,
        cutting_line_svg=cutting_line_svg,
    )
