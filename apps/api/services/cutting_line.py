"""
스티커용 칼선 SVG 자동 생성 서비스

파이프라인:
  alpha threshold → binary mask → 최대 blob 유지(노이즈/hole 제거)
  → dilate(offset_px) → RETR_EXTERNAL contour → approxPolyDP 단순화
  → Chaikin 스무딩 → SVG path 문자열 출력

mm 기반 offset으로 변경 시:
  offset_px = mm_to_px(offset_mm, dpi)
  예: mm_to_px(3.5, 300) → 2px
"""
import logging
from typing import Optional

import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────
# 단위 변환
# ─────────────────────────────────────────

def mm_to_px(mm: float, dpi: int = 300) -> int:
    """
    mm → 픽셀 변환.
    offset을 mm 단위로 지정할 때 사용한다.
    예: mm_to_px(3.5, 300) = 2
    """
    return round(mm * dpi / 25.4)


# ─────────────────────────────────────────
# 내부 유틸
# ─────────────────────────────────────────

def _alpha_to_binary_mask(image: Image.Image, alpha_threshold: float = 0.1) -> np.ndarray:
    """
    PIL RGBA 이미지 알파 채널 → 이진 마스크 (uint8, 0 or 255).
    alpha_threshold: 0.0~1.0 — 이 값 이상이면 불투명으로 처리.
    0.1로 설정 시 AI 생성 이미지의 반투명 엣지 노이즈를 대부분 제거한다.
    """
    if not (0.0 <= alpha_threshold <= 1.0):
        raise ValueError(f"alpha_threshold must be in [0.0, 1.0], got {alpha_threshold}")
    if image.mode != "RGBA":
        image = image.convert("RGBA")
    alpha = np.array(image.split()[3], dtype=np.uint8)
    thresh_val = int(alpha_threshold * 255)
    _, binary = cv2.threshold(alpha, thresh_val, 255, cv2.THRESH_BINARY)
    return binary


def _keep_largest_blob(binary: np.ndarray) -> np.ndarray:
    """
    연결 요소 분석(connected components)으로 가장 큰 blob만 유지.
    내부 hole, 작은 노이즈 점 모두 제거된다.
    connectivity=8: 대각선 방향도 연결로 처리.
    """
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(
        binary, connectivity=8
    )
    if num_labels <= 1:
        return binary  # 배경만 있음

    # label 0은 배경이므로 제외, 나머지 중 가장 큰 것 선택
    areas = stats[1:, cv2.CC_STAT_AREA]
    largest_label = int(np.argmax(areas)) + 1
    mask = np.zeros_like(binary)
    mask[labels == largest_label] = 255
    return mask


def _dilate(binary: np.ndarray, offset_px: int) -> np.ndarray:
    """
    원형(MORPH_ELLIPSE) 커널로 binary mask를 offset_px만큼 팽창.
    원형 커널 사용 이유: 직사각형 커널보다 모서리가 자연스럽게 둥글게 나온다.
    """
    if offset_px < 1:
        raise ValueError(f"offset_px must be >= 1, got {offset_px}")
    kernel_size = offset_px * 2 + 1
    kernel = cv2.getStructuringElement(
        cv2.MORPH_ELLIPSE, (kernel_size, kernel_size)
    )
    return cv2.dilate(binary, kernel, iterations=1)


def _extract_outer_contour(binary: np.ndarray) -> Optional[np.ndarray]:
    """
    RETR_EXTERNAL: 가장 바깥 contour만 추출. 내부 hole 자동 무시.
    CHAIN_APPROX_NONE: 모든 점 유지 (이후 단계에서 줄임).
    여러 contour 중 면적이 가장 큰 것 하나만 반환.
    """
    contours, _ = cv2.findContours(
        binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE
    )
    if not contours:
        return None
    return max(contours, key=cv2.contourArea)


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


def _simplify_contour(contour: np.ndarray, epsilon_factor: float = 0.002) -> np.ndarray:
    """
    Ramer-Douglas-Peucker 알고리즘으로 점 수 감소.
    epsilon = 둘레 × epsilon_factor (기본 0.2%).
    값이 작을수록 정밀하지만 점이 많아짐. 0.002가 안정적 기준.
    """
    perimeter = cv2.arcLength(contour, closed=True)
    epsilon = epsilon_factor * perimeter
    return cv2.approxPolyDP(contour, epsilon, closed=True)


def _chaikin_smooth(points: np.ndarray, iterations: int = 2) -> np.ndarray:
    """
    Chaikin corner cutting 알고리즘으로 부드러운 곡선 생성.
    각 엣지를 1/4, 3/4 지점으로 분할해 뾰족한 모서리를 제거한다.
    iterations=2: 스티커 칼선에 충분한 부드러움, 과도한 변형 없음.
    """
    pts = points.reshape(-1, 2).astype(np.float64)
    for _ in range(iterations):
        new_pts = []
        n = len(pts)
        for i in range(n):
            p0 = pts[i]
            p1 = pts[(i + 1) % n]
            new_pts.append(0.75 * p0 + 0.25 * p1)
            new_pts.append(0.25 * p0 + 0.75 * p1)
        pts = np.array(new_pts)
    return pts


def _points_to_svg_path(points: np.ndarray) -> str:
    """
    좌표 배열 → SVG path d 속성 문자열.
    소수점 1자리로 반올림해 파일 크기 최소화.
    사용 예:
      <path d="{result}" fill="none" stroke="#ff00ff" stroke-width="2"/>
    """
    pts = points.reshape(-1, 2)
    if len(pts) == 0:
        raise ValueError("points array is empty — cannot build SVG path")
    parts = [f"M {pts[0][0]:.1f} {pts[0][1]:.1f}"]
    for x, y in pts[1:]:
        parts.append(f"L {x:.1f} {y:.1f}")
    parts.append("Z")
    return " ".join(parts)


# ─────────────────────────────────────────
# 공개 API
# ─────────────────────────────────────────

def generate_cutting_line_svg(
    image: Image.Image,
    offset_px: int = 2,
    alpha_threshold: float = 0.1,
    dpi: int = 300,
) -> Optional[str]:
    """
    투명 배경 PNG로부터 스티커 칼선 SVG path를 생성한다.

    파라미터:
        image           : PIL RGBA 이미지 (투명 배경)
        offset_px       : 칼선 여백(px). 기본 2px ≈ 3.5mm @300DPI
                          mm 기반으로 변경: offset_px = mm_to_px(3.5, dpi)
        alpha_threshold : 불투명 기준 (0.0~1.0). 기본 0.1
        dpi             : 출력 DPI. 현재는 로깅용, mm 변환 시 사용

    반환:
        SVG path d 속성 문자열, 실패 시 None

    SVG 완성 예시:
        w, h = image.size
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}">'
              f'<path d="{result}" fill="none" stroke="#ff00ff" stroke-width="2"/>'
              f'</svg>'

    41px → mm 기반으로 바꾸려면:
        offset_px=mm_to_px(offset_mm=3.5, dpi=dpi) 로 호출
    """
    logger.info(
        "[cutting_line] start offset_px=%d alpha_threshold=%.2f dpi=%d size=%s",
        offset_px, alpha_threshold, dpi, image.size,
    )
    try:
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
    except Exception as e:
        logger.exception("[cutting_line] 칼선 생성 실패: %s", e)
        return None
