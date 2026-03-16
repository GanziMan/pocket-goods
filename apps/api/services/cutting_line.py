"""
스티커용 칼선 SVG 자동 생성 서비스

파이프라인:
  alpha threshold → binary mask → morphological close (인접 blob 병합)
  → dilate(offset_px) → RETR_EXTERNAL contours (모든 blob)
  → per contour: RDP 단순화 → Chaikin 스무딩(3회) → 뾰족한 꼭짓점 필터링
  → cubic bezier SVG path 출력
"""
import logging
from typing import Optional

import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────
# 단위 변환 & 기본 상수
# ─────────────────────────────────────────

def mm_to_px(mm: float, dpi: int = 300) -> int:
    """mm → 픽셀 변환."""
    return round(mm * dpi / 25.4)


DEFAULT_OFFSET_MM = 2.5
DEFAULT_OFFSET_PX = mm_to_px(DEFAULT_OFFSET_MM, 300)  # 30px @300DPI


# ─────────────────────────────────────────
# 내부 유틸
# ─────────────────────────────────────────

def _alpha_to_binary_mask(image: Image.Image, alpha_threshold: float = 0.1) -> np.ndarray:
    """
    PIL RGBA 이미지 알파 채널 → 이진 마스크 (uint8, 0 or 255).
    alpha_threshold: 0.0~1.0 — 이 값 이상이면 불투명으로 처리.
    """
    if not (0.0 <= alpha_threshold <= 1.0):
        raise ValueError(f"alpha_threshold must be in [0.0, 1.0], got {alpha_threshold}")
    if image.mode != "RGBA":
        image = image.convert("RGBA")
    alpha = np.array(image.split()[3], dtype=np.uint8)
    thresh_val = int(alpha_threshold * 255)
    _, binary = cv2.threshold(alpha, thresh_val, 255, cv2.THRESH_BINARY)
    return binary


def _morphological_close(binary: np.ndarray, gap_px: int = 24) -> np.ndarray:
    """
    dilate→erode(morphological close)로 인접 blob을 병합한다.
    gap_px: 병합할 최대 간격(px). 기본 24px ≈ 2mm @300DPI.
    텍스트+이미지가 가까이 있을 때 하나의 칼선으로 합쳐준다.
    """
    if gap_px < 1:
        return binary
    kernel_size = gap_px * 2 + 1
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    return cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=1)


def _dilate(binary: np.ndarray, offset_px: int) -> np.ndarray:
    """
    원형(MORPH_ELLIPSE) 커널로 binary mask를 offset_px만큼 팽창.
    """
    if offset_px < 1:
        raise ValueError(f"offset_px must be >= 1, got {offset_px}")
    kernel_size = offset_px * 2 + 1
    kernel = cv2.getStructuringElement(
        cv2.MORPH_ELLIPSE, (kernel_size, kernel_size)
    )
    return cv2.dilate(binary, kernel, iterations=1)


def _extract_all_outer_contours(binary: np.ndarray) -> list[np.ndarray]:
    """
    RETR_EXTERNAL: 가장 바깥 contour만 추출. 내부 hole 자동 무시.
    면적 100px 미만의 작은 노이즈 contour 제거.
    """
    contours, _ = cv2.findContours(
        binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE
    )
    return [c for c in contours if cv2.contourArea(c) >= 100]


def _simplify_contour(contour: np.ndarray, epsilon_factor: float = 0.002) -> np.ndarray:
    """
    Ramer-Douglas-Peucker 알고리즘으로 점 수 감소.
    epsilon = 둘레 × epsilon_factor (기본 0.2%).
    """
    perimeter = cv2.arcLength(contour, closed=True)
    epsilon = epsilon_factor * perimeter
    return cv2.approxPolyDP(contour, epsilon, closed=True)


def _chaikin_smooth(points: np.ndarray, iterations: int = 3) -> np.ndarray:
    """
    Chaikin corner cutting 알고리즘으로 부드러운 곡선 생성.
    iterations=3: 인쇄소 납품 수준의 부드러움.
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


def _filter_sharp_corners(points: np.ndarray, min_angle_deg: float = 30.0) -> np.ndarray:
    """
    뾰족한 꼭짓점(min_angle_deg 미만) 제거 — 커팅기 최소 회전 반경 보장.
    각 점에서 이전/다음 점과 이루는 각도를 계산하고,
    너무 뾰족한 점은 인접 점 중점으로 대체한다.
    """
    pts = points.reshape(-1, 2).astype(np.float64)
    n = len(pts)
    if n < 4:
        return pts

    result = []
    for i in range(n):
        prev_pt = pts[(i - 1) % n]
        curr_pt = pts[i]
        next_pt = pts[(i + 1) % n]

        v1 = prev_pt - curr_pt
        v2 = next_pt - curr_pt

        len1 = np.linalg.norm(v1)
        len2 = np.linalg.norm(v2)

        if len1 < 1e-6 or len2 < 1e-6:
            continue

        cos_angle = np.dot(v1, v2) / (len1 * len2)
        cos_angle = np.clip(cos_angle, -1.0, 1.0)
        angle_deg = np.degrees(np.arccos(cos_angle))

        if angle_deg < min_angle_deg:
            # 뾰족한 점 → 이전/다음 중점으로 대체
            result.append((prev_pt + next_pt) / 2.0)
        else:
            result.append(curr_pt)

    return np.array(result) if result else pts


def _catmull_rom_to_cubic_bezier(p0: np.ndarray, p1: np.ndarray, p2: np.ndarray, p3: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """
    Catmull-Rom 스플라인 세그먼트(p0,p1,p2,p3) → cubic bezier 제어점(cp1, cp2) 변환.
    p1→p2 구간의 bezier 제어점을 반환한다.
    표준 uniform Catmull-Rom 변환 공식 사용 (divisor=6).
    """
    cp1 = p1 + (p2 - p0) / 6.0
    cp2 = p2 - (p3 - p1) / 6.0
    return cp1, cp2


def _points_to_svg_bezier_path(points: np.ndarray) -> str:
    """
    좌표 배열 → SVG cubic bezier path (M ... C ... C ... Z).
    Catmull-Rom 스플라인으로 자연스러운 곡선을 생성한다.
    """
    pts = points.reshape(-1, 2)
    n = len(pts)
    if n == 0:
        raise ValueError("points array is empty — cannot build SVG path")
    if n < 3:
        return _points_to_svg_path(points)

    parts = [f"M {pts[0][0]:.1f} {pts[0][1]:.1f}"]
    for i in range(n):
        p0 = pts[(i - 1) % n]
        p1 = pts[i]
        p2 = pts[(i + 1) % n]
        p3 = pts[(i + 2) % n]

        cp1, cp2 = _catmull_rom_to_cubic_bezier(p0, p1, p2, p3)
        parts.append(
            f"C {cp1[0]:.1f} {cp1[1]:.1f} {cp2[0]:.1f} {cp2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}"
        )
    parts.append("Z")
    return " ".join(parts)


def _points_to_svg_path(points: np.ndarray) -> str:
    """
    좌표 배열 → SVG polyline path (M ... L ... Z). Fallback용.
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
    offset_px: int = DEFAULT_OFFSET_PX,
    alpha_threshold: float = 0.1,
    dpi: int = 300,
    close_gap_px: int = 24,
) -> Optional[str]:
    """
    투명 배경 PNG로부터 스티커 칼선 SVG path를 생성한다.

    파라미터:
        image           : PIL RGBA 이미지 (투명 배경)
        offset_px       : 칼선 여백(px). 기본 30px ≈ 2.5mm @300DPI
        alpha_threshold : 불투명 기준 (0.0~1.0). 기본 0.1
        dpi             : 출력 DPI
        close_gap_px    : 인접 blob 병합 간격(px). 기본 24px ≈ 2mm @300DPI

    반환:
        SVG path d 속성 문자열 (cubic bezier), 실패 시 None
    """
    logger.info(
        "[cutting_line] start offset_px=%d close_gap_px=%d alpha_threshold=%.2f dpi=%d size=%s",
        offset_px, close_gap_px, alpha_threshold, dpi, image.size,
    )
    try:
        binary = _alpha_to_binary_mask(image, alpha_threshold)
        closed = _morphological_close(binary, close_gap_px)
        dilated = _dilate(closed, offset_px)
        contours = _extract_all_outer_contours(dilated)
        if not contours:
            logger.warning("[cutting_line] contour not found — returning None")
            return None
        paths = []
        for contour in contours:
            simplified = _simplify_contour(contour)
            smoothed = _chaikin_smooth(simplified, iterations=3)
            filtered = _filter_sharp_corners(smoothed, min_angle_deg=30.0)
            paths.append(_points_to_svg_bezier_path(filtered))
        path = " ".join(paths)
        logger.info("[cutting_line] done contours=%d path_len=%d", len(contours), len(path))
        return path
    except Exception as e:
        logger.exception("[cutting_line] 칼선 생성 실패: %s", e)
        return None
