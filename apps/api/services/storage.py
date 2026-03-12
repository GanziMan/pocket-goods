"""
Storage stub — Supabase 미사용 시 항상 None 반환
실제 업로드가 필요할 때 supabase SDK와 함께 구현 예정
"""


def upload_print_file(png_bytes: bytes, order_id: str) -> str | None:
    return None


def upload_thumbnail(png_bytes: bytes, design_id: str) -> str | None:
    return None
