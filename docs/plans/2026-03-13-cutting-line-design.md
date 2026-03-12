# 칼선 자동 생성 Design

**Date:** 2026-03-13

## 목표
Export 시 캐릭터 이미지 외곽에 인쇄용 칼선(Magenta)을 자동으로 추가한다.

## 칼선 스펙
- 색상: RGB(255, 0, 255) / CMYK(0, 100, 0, 0) — 마젠타
- 오프셋: 캐릭터 실루엣에서 바깥으로 2px (인쇄 해상도 기준)
- 기존 빨간 재단선 사각형 제거

## 처리 방식
1. 이미지 오브젝트가 RGBA(투명 배경)인 경우에만 칼선 계산
2. 알파 채널에 `ImageFilter.MaxFilter(size=5)` 적용 → 2px 팽창
3. 팽창 알파 - 원본 알파 = 외곽 링 마스크
4. 마젠타(255, 0, 255) 레이어에 외곽 링 마스크 적용
5. 캐릭터보다 먼저 캔버스에 합성 (칼선이 캐릭터 아래)

## 변경 파일
- `apps/api/services/renderer.py`
  - `_render_image_obj` 앞에 `_render_cutting_line` 호출 추가
  - 기존 빨간 재단선 `draw.rectangle(...)` 제거