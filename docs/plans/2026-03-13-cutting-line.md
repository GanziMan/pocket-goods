# 칼선 자동 생성 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Export 시 RGBA 캐릭터 이미지 외곽에 마젠타(255, 0, 255) 칼선을 2px 오프셋으로 자동 추가한다.

**Architecture:** `renderer.py`의 `_render_image_obj` 앞에 `_render_cutting_line`을 호출해 알파 채널 팽창(MaxFilter) → 외곽 링 마스크 → 마젠타 레이어를 캔버스에 합성한다. 기존 빨간 재단선 사각형은 제거한다.

**Tech Stack:** Python 3.13, Pillow (ImageFilter.MaxFilter, ImageChops)

---

### Task 1: 칼선 함수 추가 및 빨간 재단선 제거

**Files:**
- Modify: `apps/api/services/renderer.py`

**Step 1: `_render_cutting_line` 함수 추가**

`_render_image_obj` 함수 바로 위에 아래 함수를 추가한다:

```python
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

    alpha = obj_img.split()[3]  # 원본 알파 채널

    # 2px 팽창: MaxFilter(size = offset*2+1 = 5)
    dilated = alpha.filter(ImageFilter.MaxFilter(size=CUTTING_LINE_OFFSET_PX * 2 + 1))

    # 팽창 알파 - 원본 알파 = 외곽 링 마스크
    outline_alpha = ImageChops.subtract(dilated, alpha)

    # 마젠타 레이어 생성
    magenta = Image.new("RGBA", obj_img.size, CUTTING_LINE_COLOR)
    magenta.putalpha(outline_alpha)

    _paste_rotated(canvas, magenta, cx, cy, angle)
```

**Step 2: `_render_image_obj` 안에서 칼선 먼저 호출**

`_render_image_obj` 함수 안의 `_paste_rotated(canvas, img, cx, cy, angle)` 바로 앞에 칼선 호출을 추가한다:

```python
    # 칼선 먼저 합성 (캐릭터 아래에 위치)
    _render_cutting_line(canvas, img, cx, cy, angle)
    _paste_rotated(canvas, img, cx, cy, angle)
```

**Step 3: 빨간 재단선 제거**

`render_canvas` 함수 맨 아래의 아래 블록을 완전히 삭제한다:

```python
    # 재단선 가이드 (빨간 점선) — 인쇄용이므로 포함
    draw = ImageDraw.Draw(result)
    draw.rectangle(
        [bleed_px, bleed_px, final_w - bleed_px - 1, final_h - bleed_px - 1],
        outline=(255, 0, 0, 120),
        width=2,
    )
```

**Step 4: 커밋**

```bash
cd /Users/kimbeomsu/Desktop/pocket-goods
git add apps/api/services/renderer.py
git commit -m "feat: add magenta cutting line (2px offset) and remove red guide rect"
git push origin main
```

---

### Task 2: 동작 확인

**Step 1: API 서버 실행**

```bash
cd apps/api
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Step 2: 테스트 요청 전송**

투명 배경 PNG가 포함된 Fabric.js JSON으로 `/api/export` 호출:

```bash
curl -X POST http://localhost:8000/api/export \
  -H "Content-Type: application/json" \
  -d '{"canvas_json": {"objects": [], "background": ""}, "product_type": "keyring"}' \
  -o test-output.png
```

**Step 3: 결과 확인**

- 캐릭터 이미지 외곽에 마젠타(분홍) 2px 테두리가 보이면 성공
- 빨간 사각형 재단선이 없으면 성공
