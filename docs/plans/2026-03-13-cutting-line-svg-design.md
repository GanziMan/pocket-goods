# 스티커 칼선 SVG 자동 생성 Design

**Date:** 2026-03-13

## 목표
투명 배경 PNG로부터 스티커용 칼선 SVG path를 자동 생성해 export 응답에 포함한다.

## 파이프라인
```
alpha threshold(0.1)
→ binary mask
→ 최대 blob만 유지 (내부 hole, 노이즈 제거)
→ dilate(offset_px=41)
→ cv2.findContours(RETR_EXTERNAL) — 외곽 contour만
→ cv2.approxPolyDP 단순화
→ Chaikin 스무딩 (2회)
→ SVG path 문자열 출력
```

## 파라미터
| 파라미터 | 기본값 | 설명 |
|---------|--------|------|
| `offset_px` | 41 | 칼선 여백 (px) |
| `alpha_threshold` | 0.1 | 투명도 기준 (0~1) |
| `dpi` | 300 | 출력 DPI (mm 변환용) |

mm 기반 offset으로 변경 시: `offset_px = round(offset_mm * dpi / 25.4)`

## 변경 파일
- **Create:** `apps/api/services/cutting_line.py`
- **Modify:** `apps/api/requirements.txt` — opencv-python-headless, numpy 추가
- **Modify:** `apps/api/routers/export.py` — ExportResponse에 `cutting_line_svg` 필드 추가

## 라이브러리 선택 근거
- **OpenCV:** `RETR_EXTERNAL`로 내부 hole 자동 제외, `approxPolyDP`로 단순화, 업계 표준
- **numpy:** OpenCV와 함께 필수
- **headless 버전:** 서버 환경에 GUI 불필요
