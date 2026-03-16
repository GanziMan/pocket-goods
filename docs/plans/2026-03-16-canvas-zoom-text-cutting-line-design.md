# 캔버스 줌 & 텍스트 칼선 Design

**Date:** 2026-03-16

---

## Feature 1: 캔버스 뷰포트 줌

### 목표
굿노트 스타일의 줌 인/아웃. 논리 캔버스 크기(420×595px)는 고정, 뷰포트만 확대/축소.

### 스펙
- **줌 레벨:** 50% ~ 200%, 기본 100%, 25% 단위 스텝
- **스크롤 휠:** 마우스 위치 기준 줌 (`canvas.zoomToPoint`)
- **줌 버튼:** 툴바에 `-` / `현재%` / `+` 버튼 추가
- **스크롤:** 줌 시 캔버스가 컨테이너보다 커지면 `overflow: auto`로 스크롤 가능
- **적용 대상:** keyring, sticker 동일

### 변경 파일
- `apps/web/src/components/canvas/useCanvas.ts` — `zoom`, `zoomIn`, `zoomOut`, `setZoom` 추가
- `apps/web/src/components/canvas/DesignCanvas.tsx` — wheel 이벤트 핸들러 연결
- `apps/web/src/components/editor/Toolbar.tsx` — 줌 버튼 UI 추가
- `apps/web/src/components/editor/EditorLayout.tsx` — zoom 상태 및 핸들러 연결

### 기술 구현
```ts
// 스크롤 휠 줌
canvas.on('mouse:wheel', (opt) => {
  const delta = opt.e.deltaY;
  let zoom = canvas.getZoom();
  zoom *= 0.999 ** delta;
  zoom = Math.min(Math.max(zoom, 0.5), 2.0);
  canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
  opt.e.preventDefault();
});
```

---

## Feature 2: 텍스트 칼선

### 목표
칼선 SVG 생성 시 이미지 오브젝트뿐 아니라 텍스트 오브젝트도 포함.

### 현재 문제
`cutting_line.py`의 `_keep_largest_blob`이 가장 큰 연결 요소만 남겨 텍스트 blob이 제거됨.
`_extract_outer_contour`도 가장 큰 contour 하나만 반환.

### 스펙
- `_keep_largest_blob` 단계 제거 → 전체 이진 마스크 유지
- `_extract_outer_contour` → 모든 외곽 contour 리스트 반환으로 변경
- 각 contour 독립적으로 `approxPolyDP` 단순화 + Chaikin 스무딩
- 최종 SVG path: 모든 contour를 `M`으로 이어 붙인 복합 경로 (단일 `<path>` 요소)
- 텍스트는 `transparent_bg=True` 렌더 시 이미 불투명 픽셀로 찍히므로 렌더러 변경 불필요

### 변경 파일
- `apps/api/services/cutting_line.py`
  - `_keep_largest_blob` 제거
  - `_extract_outer_contour` → `_extract_all_outer_contours` 로 변경 (복수 반환)
  - `generate_cutting_line_svg` 내부 파이프라인 수정

### 기술 구현
```python
def _extract_all_outer_contours(binary: np.ndarray) -> list[np.ndarray]:
    contours, _ = cv2.findContours(
        binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE
    )
    # 노이즈 제거: 면적 100px 미만 제외
    return [c for c in contours if cv2.contourArea(c) >= 100]

# generate_cutting_line_svg에서 복합 path 조합
paths = []
for contour in contours:
    simplified = _simplify_contour(contour)
    smoothed = _chaikin_smooth(simplified)
    paths.append(_points_to_svg_path(smoothed))
return " ".join(paths)  # M으로 이어진 복합 경로
```
