# Canvas Zoom & Text Cutting Line Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** (1) 캔버스 뷰포트 줌 인/아웃 (스크롤 휠 + 버튼), (2) 텍스트 오브젝트도 칼선에 포함

**Architecture:**
- 줌은 Fabric.js `canvas.setZoom()` / `canvas.zoomToPoint()`로 뷰포트만 조작, 논리 캔버스 크기(420×595px) 불변.
- 텍스트 칼선은 `cutting_line.py` 내 `_keep_largest_blob` 제거 + `_extract_outer_contour` → `_extract_all_outer_contours` 변경으로 모든 blob 포함.

**Tech Stack:** Fabric.js 6+, React 18, FastAPI/Python, OpenCV (cv2)

---

## Task 1: 텍스트 칼선 — cutting_line.py 수정

**Files:**
- Modify: `apps/api/services/cutting_line.py`

### Step 1: `_extract_all_outer_contours` 함수 추가

`_extract_outer_contour` 함수 바로 아래에 새 함수를 추가한다.

```python
def _extract_all_outer_contours(binary: np.ndarray) -> list[np.ndarray]:
    """
    RETR_EXTERNAL: 가장 바깥 contour만 추출. 내부 hole 자동 무시.
    면적 100px 미만의 작은 노이즈 contour 제거.
    텍스트, 이미지 등 여러 blob을 모두 반환한다.
    """
    contours, _ = cv2.findContours(
        binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE
    )
    return [c for c in contours if cv2.contourArea(c) >= 100]
```

### Step 2: `generate_cutting_line_svg` 파이프라인 수정

`generate_cutting_line_svg` 함수 내부를 아래와 같이 변경:

**변경 전 (`_keep_largest_blob` 포함, 단일 contour):**
```python
binary = _alpha_to_binary_mask(image, alpha_threshold)
binary = _keep_largest_blob(binary)
dilated = _dilate(binary, offset_px)
contour = _extract_outer_contour(dilated)
if contour is None:
    logger.warning("[cutting_line] contour not found — returning None")
    return None
simplified = _simplify_contour(contour)
smoothed = _chaikin_smooth(simplified, iterations=2)
path = _points_to_svg_path(smoothed)
logger.info("[cutting_line] done path_len=%d", len(path))
return path
```

**변경 후 (`_keep_largest_blob` 제거, 복수 contour):**
```python
binary = _alpha_to_binary_mask(image, alpha_threshold)
# _keep_largest_blob 단계 제거 — 텍스트/이미지 모든 blob 유지
dilated = _dilate(binary, offset_px)
contours = _extract_all_outer_contours(dilated)
if not contours:
    logger.warning("[cutting_line] contour not found — returning None")
    return None
paths = []
for contour in contours:
    simplified = _simplify_contour(contour)
    smoothed = _chaikin_smooth(simplified, iterations=2)
    paths.append(_points_to_svg_path(smoothed))
path = " ".join(paths)
logger.info("[cutting_line] done contours=%d path_len=%d", len(contours), len(path))
return path
```

### Step 3: 수동 테스트

로컬에서 텍스트가 포함된 스티커 디자인으로 미리보기 다운로드 후 SVG 파일을 열어 텍스트 영역 칼선 포함 여부 확인.

### Step 4: Commit

```bash
git add apps/api/services/cutting_line.py
git commit -m "feat: include text blobs in cutting line SVG (multi-contour)"
```

---

## Task 2: useCanvas — zoom 상태 및 핸들러 추가

**Files:**
- Modify: `apps/web/src/components/canvas/useCanvas.ts`

### Step 1: `UseCanvasReturn` 인터페이스에 zoom 관련 필드 추가

`UseCanvasReturn` interface (line 21)에 추가:

```ts
zoom: number;
zoomIn: () => void;
zoomOut: () => void;
setZoom: (level: number) => void;
```

### Step 2: zoom state 및 상수 추가

`MAX_HISTORY` 상수 근처에 추가:

```ts
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.25;
```

`isCanvasReady` useState 근처에 추가:

```ts
const [zoom, setZoomState] = useState(1.0);
```

### Step 3: zoomIn / zoomOut / setZoom 콜백 추가

`setProductType` 콜백 아래에 추가:

```ts
const zoomIn = useCallback(() => {
  const canvas = fabricRef.current;
  if (!canvas) return;
  const next = Math.min(
    Math.round((canvas.getZoom() + ZOOM_STEP) * 100) / 100,
    ZOOM_MAX
  );
  canvas.setZoom(next);
  canvas.renderAll();
  setZoomState(next);
}, []);

const zoomOut = useCallback(() => {
  const canvas = fabricRef.current;
  if (!canvas) return;
  const next = Math.max(
    Math.round((canvas.getZoom() - ZOOM_STEP) * 100) / 100,
    ZOOM_MIN
  );
  canvas.setZoom(next);
  canvas.renderAll();
  setZoomState(next);
}, []);

const setZoom = useCallback((level: number) => {
  const canvas = fabricRef.current;
  if (!canvas) return;
  const clamped = Math.min(Math.max(level, ZOOM_MIN), ZOOM_MAX);
  canvas.setZoom(clamped);
  canvas.renderAll();
  setZoomState(clamped);
}, []);
```

### Step 4: 스크롤 휠 줌 이벤트 등록

`initCanvas` 함수 내부, `canvas.on("object:added", saveHistory)` 등록 바로 아래에 추가:

```ts
canvas.on("mouse:wheel", (opt) => {
  const delta = opt.e.deltaY;
  let z = canvas.getZoom();
  z *= 0.999 ** delta;
  z = Math.min(Math.max(z, ZOOM_MIN), ZOOM_MAX);
  canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, z);
  setZoomState(Math.round(z * 100) / 100);
  opt.e.preventDefault();
  opt.e.stopPropagation();
});
```

### Step 5: return 객체에 zoom 필드 추가

`return { ... }` 블록에 추가:

```ts
zoom,
zoomIn,
zoomOut,
setZoom,
```

### Step 6: Commit

```bash
git add apps/web/src/components/canvas/useCanvas.ts
git commit -m "feat: add viewport zoom (wheel + zoomIn/zoomOut/setZoom) to useCanvas"
```

---

## Task 3: DesignCanvas — 컨테이너 overflow 및 wheel 이벤트 처리

**Files:**
- Modify: `apps/web/src/components/canvas/DesignCanvas.tsx`

### Step 1: props에 zoom 추가

```ts
interface DesignCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  productType: ProductType;
  zoom: number;
}
```

### Step 2: 컨테이너를 zoom 기반 크기로 변경

줌이 100% 초과 시 캔버스가 컨테이너보다 커지므로, 외부 wrapper에 `overflow: auto`를 주고 내부 캔버스 wrapper 크기를 `width * zoom` 으로 설정:

```tsx
export default function DesignCanvas({
  canvasRef,
  productType,
  zoom,
}: DesignCanvasProps) {
  const { width, height } = PRODUCT_CANVAS_SIZE[productType];

  return (
    <div className="flex items-center justify-center w-full h-full bg-zinc-100 overflow-auto">
      <div
        className="relative shadow-2xl rounded-sm overflow-hidden ring-1 ring-zinc-200 shrink-0"
        style={{ width: width * zoom, height: height * zoom }}
      >
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
```

> 참고: Fabric.js `setZoom`은 canvas element 내부 픽셀 스케일을 바꾸지 않는다. 컨테이너 크기를 zoom에 맞게 조정해야 레이아웃이 자연스럽다.

### Step 3: Commit

```bash
git add apps/web/src/components/canvas/DesignCanvas.tsx
git commit -m "feat: resize DesignCanvas container based on zoom level"
```

---

## Task 4: Toolbar — 줌 버튼 UI 추가

**Files:**
- Modify: `apps/web/src/components/editor/Toolbar.tsx`

### Step 1: ToolbarProps에 zoom 필드 추가

```ts
interface ToolbarProps {
  // ... 기존 필드 ...
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}
```

### Step 2: ZoomOut/ZoomIn 아이콘 import 추가

```ts
import {
  // ... 기존 ...
  ZoomIn,
  ZoomOut,
} from "lucide-react";
```

### Step 3: 줌 버튼 UI 추가

편집 액션 `<div>` (Undo/Redo) 바로 아래에 추가:

```tsx
{/* 줌 */}
<div className="flex items-center gap-1">
  <Button
    variant="ghost"
    size="icon"
    onClick={onZoomOut}
    disabled={zoom <= 0.5}
    title="줌 아웃"
  >
    <ZoomOut className="w-4 h-4" />
  </Button>
  <span className="text-xs text-zinc-500 w-10 text-center tabular-nums">
    {Math.round(zoom * 100)}%
  </span>
  <Button
    variant="ghost"
    size="icon"
    onClick={onZoomIn}
    disabled={zoom >= 2.0}
    title="줌 인"
  >
    <ZoomIn className="w-4 h-4" />
  </Button>
</div>
```

### Step 4: Commit

```bash
git add apps/web/src/components/editor/Toolbar.tsx
git commit -m "feat: add zoom in/out buttons and current zoom% to Toolbar"
```

---

## Task 5: EditorLayout — zoom 상태 연결

**Files:**
- Modify: `apps/web/src/components/editor/EditorLayout.tsx`

### Step 1: useCanvas에서 zoom 관련 값 구조분해

```ts
const {
  // ... 기존 ...
  zoom,
  zoomIn,
  zoomOut,
} = useCanvas(productType);
```

### Step 2: `<Toolbar>`에 zoom props 전달

```tsx
<Toolbar
  // ... 기존 props ...
  zoom={zoom}
  onZoomIn={zoomIn}
  onZoomOut={zoomOut}
/>
```

### Step 3: `<DesignCanvas>`에 zoom prop 전달

```tsx
<DesignCanvas
  canvasRef={canvasRef}
  productType={productType}
  zoom={zoom}
/>
```

### Step 4: Commit

```bash
git add apps/web/src/components/editor/EditorLayout.tsx
git commit -m "feat: wire zoom state from useCanvas to Toolbar and DesignCanvas"
```

---

## 완료 확인

1. 스크롤 휠 → 마우스 포인터 기준 줌 인/아웃 동작
2. 툴바 `-` / `%` / `+` 버튼으로 25% 단위 줌 조절
3. 줌 50%~200% 범위 클램핑 확인
4. 스티커에 텍스트 추가 후 미리보기 → SVG 칼선에 텍스트 영역 포함 확인
5. 이미지만 있는 스티커 → 기존 칼선과 동일하게 동작 확인
