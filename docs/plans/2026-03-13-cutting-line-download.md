# 칼선 SVG 다운로드 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 미리보기 Export 클릭 시 PNG와 칼선 SVG 파일을 함께 다운로드한다 (스티커 전용).

**Architecture:** `save_to_storage=False` 응답 포맷을 raw PNG blob에서 `{ png_base64, cutting_line_svg? }` JSON으로 변경한다. 프론트엔드에서 JSON을 파싱해 PNG와 SVG를 각각 다운로드 트리거한다.

**Tech Stack:** Python 3.12, FastAPI, Pillow, OpenCV; Next.js 15, TypeScript

---

### Task 1: export.py — 응답 포맷 변경

**Files:**
- Modify: `apps/api/routers/export.py`

**Step 1: 상단 import에 `base64` 추가**

`export.py` 상단 import 블록:

```python
import base64
import logging
import uuid
from typing import Literal
```

**Step 2: `render_canvas` import에 `mm_to_px`, `PRINT_SIZES_MM` 추가**

```python
from services.renderer import render_canvas, to_png_bytes, mm_to_px, PRINT_SIZES_MM
```

**Step 3: `save_to_storage=False` 분기 교체**

기존 코드 (14~19번째 줄):
```python
    # 미리보기 다운로드 — 파일 직접 반환
    if not req.save_to_storage:
        return Response(
            content=png_bytes,
            media_type="image/png",
            headers={
                "Content-Disposition": f'attachment; filename="pocketgoods-print-{req.product_type}.png"'
            },
        )
```

교체할 코드:
```python
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
                        f'<svg xmlns="http://www.w3.org/2000/svg" width="{pw}" height="{ph}">'
                        f'<path d="{path}" fill="none" stroke="#ff00ff" stroke-width="2"/>'
                        f'</svg>'
                    )
            except Exception as e:
                logger.warning("[export] 칼선 미리보기 생성 실패 (무시): %s", e)
        return {"png_base64": png_b64, "cutting_line_svg": cutting_svg}
```

`Response` import는 더 이상 사용하지 않으므로 제거:
```python
from fastapi import APIRouter, HTTPException
```

**Step 4: 서버 실행 후 수동 확인**

```bash
cd apps/api && uvicorn main:app --reload --port 8000
```

`curl`로 응답 포맷 확인:
```bash
curl -s -X POST http://localhost:8000/api/export \
  -H "Content-Type: application/json" \
  -d '{"canvas_json":{"objects":[],"background":"#ffffff"},"product_type":"keyring","save_to_storage":false}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(list(d.keys()))"
```

Expected: `['png_base64', 'cutting_line_svg']`

**Step 5: Commit**

```bash
git add apps/api/routers/export.py
git commit -m "feat: return JSON with png_base64 and cutting_line_svg on preview export"
```

---

### Task 2: EditorLayout.tsx — 다운로드 로직 변경

**Files:**
- Modify: `apps/web/src/components/editor/EditorLayout.tsx`

**Step 1: `handleExportPreview` 교체**

기존 try 블록 내부:
```typescript
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/export`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            canvas_json: toJSON(),
            product_type: productType,
            save_to_storage: false,
          }),
        }
      );
      if (!res.ok) throw new Error("Export 실패");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pocketgoods-print-${productType}-${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(url);
```

교체할 코드:
```typescript
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/export`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            canvas_json: toJSON(),
            product_type: productType,
            save_to_storage: false,
          }),
        }
      );
      if (!res.ok) throw new Error("Export 실패");
      const data = await res.json() as { png_base64: string; cutting_line_svg: string | null };
      const ts = Date.now();

      // PNG 다운로드
      const pngBytes = Uint8Array.from(atob(data.png_base64), (c) => c.charCodeAt(0));
      const pngBlob = new Blob([pngBytes], { type: "image/png" });
      const pngUrl = URL.createObjectURL(pngBlob);
      const pngLink = document.createElement("a");
      pngLink.href = pngUrl;
      pngLink.download = `pocketgoods-print-${productType}-${ts}.png`;
      pngLink.click();
      URL.revokeObjectURL(pngUrl);

      // 칼선 SVG 다운로드 (스티커만)
      if (data.cutting_line_svg) {
        const svgBlob = new Blob([data.cutting_line_svg], { type: "image/svg+xml" });
        const svgUrl = URL.createObjectURL(svgBlob);
        const svgLink = document.createElement("a");
        svgLink.href = svgUrl;
        svgLink.download = `pocketgoods-cutting-line-${ts}.svg`;
        svgLink.click();
        URL.revokeObjectURL(svgUrl);
      }
```

**Step 2: 브라우저에서 수동 확인**

1. `npm run dev` 실행
2. 에디터에서 스티커 제품 선택
3. 캐릭터 이미지 추가
4. 미리보기 클릭
5. PNG + SVG 두 파일 다운로드 확인
6. SVG 파일을 브라우저에서 열어 마젠타 칼선 윤곽 확인

키링 제품에서는 PNG만 다운로드되는지 확인.

**Step 3: Commit**

```bash
git add apps/web/src/components/editor/EditorLayout.tsx
git commit -m "feat: download cutting line SVG alongside PNG on preview export"
```
