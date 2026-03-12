"""
폰트 관리 — 최초 실행 시 NotoSansKR 다운로드 후 캐시
"""
import os
from pathlib import Path

import requests
from PIL import ImageFont

FONTS_DIR = Path(__file__).parent.parent / "fonts"

# Google Fonts static CDN URL (NotoSansKR Regular / Bold)
FONT_URLS = {
    "NotoSansKR-Regular": "https://fonts.gstatic.com/s/notosanskr/v36/PbykFmXiEBPT4ITbgNA5Cgm20xz64px_1hVWr0wuPNGmlQNMEfD4.0.woff2",
    "NotoSansKR-Bold": "https://fonts.gstatic.com/s/notosanskr/v36/PbykFmXiEBPT4ITbgNA5Cgm20xz64px_1hVWr0wuPNGmlQNMEfD4.9.woff2",
}

# woff2 대신 ttf 직접 링크 (GitHub mirror)
FONT_TTF_URLS = {
    "NotoSansKR-Regular": (
        "https://github.com/notofonts/noto-cjk/raw/main/Sans/OTF/Korean/"
        "NotoSansCJKkr-Regular.otf"
    ),
    "NotoSansKR-Bold": (
        "https://github.com/notofonts/noto-cjk/raw/main/Sans/OTF/Korean/"
        "NotoSansCJKkr-Bold.otf"
    ),
}

# 더 가벼운 대안 — 공개 CDN의 TTF
FONT_FALLBACK_URLS = {
    "NotoSansKR-Regular": (
        "https://cdn.jsdelivr.net/npm/@expo-google-fonts/noto-sans-kr@0.2.3"
        "/NotoSansKR_400Regular.ttf"
    ),
    "NotoSansKR-Bold": (
        "https://cdn.jsdelivr.net/npm/@expo-google-fonts/noto-sans-kr@0.2.3"
        "/NotoSansKR_700Bold.ttf"
    ),
}


def _get_font_path(name: str) -> Path:
    return FONTS_DIR / f"{name}.ttf"


def ensure_fonts() -> None:
    """서버 시작 시 폰트 파일 존재 확인 — 없으면 다운로드"""
    FONTS_DIR.mkdir(exist_ok=True)
    for name, url in FONT_FALLBACK_URLS.items():
        path = _get_font_path(name)
        if not path.exists():
            print(f"[fonts] Downloading {name}...")
            try:
                r = requests.get(url, timeout=30)
                r.raise_for_status()
                path.write_bytes(r.content)
                print(f"[fonts] Saved {path}")
            except Exception as e:
                print(f"[fonts] Failed to download {name}: {e}")


# 폰트패밀리 문자열 → TTF 파일 매핑
_FAMILY_MAP: dict[str, str] = {
    "geist, arial, sans-serif": "NotoSansKR-Regular",
    "nanum gothic, malgun gothic, sans-serif": "NotoSansKR-Regular",
    "nanum myeongjo, georgia, serif": "NotoSansKR-Regular",
    "nanum pen script, cursive": "NotoSansKR-Regular",
    "jua, sans-serif": "NotoSansKR-Regular",
    "arial": "NotoSansKR-Regular",
    "default": "NotoSansKR-Regular",
}


def get_pil_font(family: str, size: int) -> ImageFont.FreeTypeFont:
    key = family.lower().strip()
    font_name = _FAMILY_MAP.get(key, "NotoSansKR-Regular")
    path = _get_font_path(font_name)
    if path.exists():
        try:
            return ImageFont.truetype(str(path), size)
        except Exception:
            pass
    return ImageFont.load_default(size=size)
