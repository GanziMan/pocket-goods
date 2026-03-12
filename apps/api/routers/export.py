"""
POST /api/export
Fabric.js JSON → 300 DPI PNG 생성 → Supabase Storage 업로드
"""
import logging
import uuid
from typing import Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from services.cutting_line import generate_cutting_line_svg
from services.renderer import render_canvas, to_png_bytes
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
    cutting_line_svg: str | None = None  # 스티커 칼선 SVG path — save_to_storage=True 시에만 포함


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

    # 미리보기 다운로드 — 파일 직접 반환
    if not req.save_to_storage:
        return Response(
            content=png_bytes,
            media_type="image/png",
            headers={
                "Content-Disposition": f'attachment; filename="pocketgoods-print-{req.product_type}.png"'
            },
        )

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
