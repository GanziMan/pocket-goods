# 칼선 품질 개선 — 인쇄소 납품 수준

**날짜:** 2026-03-16
**상태:** 완료

---

## 목표
기존 칼선이 offset 0.17mm, polyline(L) 명령, 인접 blob 미합치기 등으로 실제 커팅기에서 사용 불가 → 인쇄소 납품 가능한 수준으로 개선.

## 변경 파일
- `apps/api/services/cutting_line.py` — SVG 칼선 생성 파이프라인 전면 개선
- `apps/api/services/renderer.py` — 래스터 프리뷰 칼선 품질 개선

---

## 변경 사항

### cutting_line.py

#### 1. Offset 증가 (2px → 30px = 2.5mm @300DPI)
- `DEFAULT_OFFSET_MM = 2.5`, `DEFAULT_OFFSET_PX = mm_to_px(2.5, 300)` 상수 추가
- `generate_cutting_line_svg` 기본값 변경

#### 2. Morphological Close (인접 blob 병합)
- `_morphological_close(binary, gap_px=24)` — dilate→erode로 2mm 이내 blob 병합
- 파이프라인에서 `_alpha_to_binary_mask` 직후, `_dilate` 전에 실행

#### 3. SVG Bezier 곡선 (L → C 명령)
- `_catmull_rom_to_cubic_bezier()` — Catmull-Rom → cubic bezier 제어점 변환 (표준 /6.0 divisor)
- `_points_to_svg_bezier_path()` — `M ... C ... C ... Z` 형식 출력
- 기존 `_points_to_svg_path`는 fallback으로 유지

#### 4. 뾰족한 꼭짓점 필터링
- `_filter_sharp_corners(points, min_angle_deg=30)` — 커팅기 최소 회전 반경 보장
- 뾰족한 점은 인접 점 중점으로 대체

#### 5. Chaikin 스무딩 3회 (기존 2회)

#### 최종 파이프라인 순서
```
alpha_mask → morphological_close(24px) → dilate(30px) → extract_contours
→ per contour: simplify(RDP) → chaikin(3회) → filter_sharp_corners → bezier_svg_path
```

### renderer.py (래스터 프리뷰 칼선)

#### 1. OpenCV 원형 커널 도입
- Pillow `MaxFilter`(정사각형) → `cv2.dilate` + `MORPH_ELLIPSE` — 모서리가 둥글고 균일

#### 2. 알파 노이즈 제거
- `cv2.threshold(25)` — AI 생성 이미지의 미세 노이즈 픽셀(alpha 1~5) 제거

#### 3. GaussianBlur 스무딩
- 이진화 전 `GaussianBlur(7,7)` — 거친 엣지와 세밀한 요철 스무딩

#### 4. Anti-aliased 아웃라인
- 바깥/안쪽 이중 팽창으로 일정한 두께의 띠 생성
- 최종 아웃라인에 `GaussianBlur(3,3)` anti-aliasing 적용
- offset 2px → 6px로 증가 (세밀한 요철 자연스럽게 넘김)

### renderer.py — 통합 칼선 (2-pass 렌더링)

#### 5. 텍스트 오브젝트 칼선 지원
- `_render_text_obj`에 `with_cutting_line` 파라미터 추가
- `render_canvas` 호출 시 텍스트에도 칼선 파라미터 전달

#### 6. 겹친 오브젝트 통합 칼선 (2-pass 방식)
- 기존: 오브젝트마다 개별 `_render_cutting_line` → 겹친 부분에 칼선 중복
- 변경: 2-pass 렌더링으로 전환
  - Pass 1: 모든 오브젝트를 투명 레이어에 칼선 없이 렌더
  - Pass 2: 합쳐진 알파 채널로 `_render_combined_cutting_line` 생성 → 배경 위에 합성
  - Pass 3: 오브젝트를 칼선 위에 합성
- `_render_combined_cutting_line()` 신규 함수: morphological close(24px) + 원형 커널 팽창 + anti-aliasing
- `CUTTING_LINE_CLOSE_GAP_PX = 24` 상수 추가 (~2mm @300DPI 이내 인접 오브젝트 병합)

---

## 코드 리뷰 반영 사항
- `_catmull_rom_to_cubic_bezier`: 잘못된 `alpha=0.5` (divisor 3.0) → 표준 `/6.0` divisor로 수정
- `renderer.py`: 상수 중복 제거 시도했으나 래스터 프리뷰 offset(6px)과 SVG offset(30px)은 용도가 다르므로 별도 유지
- AI 생성 이미지 알파 노이즈로 인한 흩어진 칼선 점 → threshold 추가로 해결
