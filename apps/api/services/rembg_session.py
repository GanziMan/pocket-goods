# rembg 모델 lazy-load 싱글턴 (첫 요청 시 로드 — 서버 기동 시간 단축)
# generate.py, profile.py 등 여러 라우터에서 공유하여 메모리 중복 로드 방지

_rembg_session = None


def get_rembg_session():
    global _rembg_session
    if _rembg_session is None:
        from rembg import new_session as rembg_new_session
        _rembg_session = rembg_new_session("u2net")
    return _rembg_session
