# 칼선 SVG 다운로드 Design

**Date:** 2026-03-13

## 목표

미리보기 Export 버튼 클릭 시 PNG와 칼선 SVG 파일을 함께 다운로드한다.
스티커 제품(`product_type=sticker`)에만 적용.

## 변경 파일

- `apps/api/routers/export.py`
- `apps/web/src/components/editor/EditorLayout.tsx`

## API 변경

### 기존 (`save_to_storage=False`)
raw `image/png` blob 반환.

### 변경 후
JSON 반환:

```json
{
  "png_base64": "iVBOR...",
  "cutting_line_svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"W\" height=\"H\"><path d=\"M ...\" fill=\"none\" stroke=\"#ff00ff\" stroke-width=\"2\"/></svg>"
}
```

- `cutting_line_svg`: 스티커이고 objects가 있을 때만 생성. 아니면 `null`.
- SVG 크기: 인쇄 해상도 기준 (`print_w x print_h` px, 300 DPI).
- `generate_cutting_line_svg`는 path string만 반환 — `export.py`에서 `<svg>` 태그로 감싸 완성.

## 프론트엔드 변경

`handleExportPreview` 로직:

1. `POST /api/export` (save_to_storage: false)
2. JSON 파싱 → `png_base64`, `cutting_line_svg`
3. PNG: base64 → Blob → `<a>` 다운로드
4. `cutting_line_svg`가 있으면: SVG 문자열 → Blob → `<a>` 다운로드

다운로드 파일명:
- PNG: `pocketgoods-print-sticker-{timestamp}.png`
- SVG: `pocketgoods-cutting-line-{timestamp}.svg`

## 인쇄 해상도 계산

`export.py`에서 칼선 SVG 크기:

```python
from services.renderer import mm_to_px, PRINT_SIZES_MM
w_mm, h_mm = PRINT_SIZES_MM.get(product_type, (60.0, 60.0))
print_w = mm_to_px(w_mm)
print_h = mm_to_px(h_mm)
svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{print_w}" height="{print_h}">...'
```
