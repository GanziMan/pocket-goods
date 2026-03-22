"""Rate-limit & auth helpers shared by generate / profile routers."""

import logging
import os
from collections import defaultdict
from datetime import date
from typing import Optional

from fastapi import Request
from supabase import create_client as create_supabase_client

logger = logging.getLogger(__name__)

# IP별 일일 요청 제한 (비로그인)
DAILY_LIMIT_ANONYMOUS = 2
# 유저별 일일 요청 제한 (로그인)
DAILY_LIMIT_USER = 5

_usage: dict[str, dict[str, int]] = defaultdict(lambda: {"date": "", "count": 0})


def check_rate_limit(key: str, limit: int) -> int:
    """남은 횟수를 반환. 0이면 제한 초과."""
    today = date.today().isoformat()
    entry = _usage[key]
    if entry["date"] != today:
        entry["date"] = today
        entry["count"] = 0
    remaining = limit - entry["count"]
    return remaining


def increment_usage(key: str) -> None:
    _usage[key]["count"] += 1


def get_usage_count(key: str) -> int:
    return _usage[key]["count"]


def get_user_id_from_token(request: Request) -> Optional[str]:
    """Authorization 헤더에서 Supabase JWT를 검증하고 user_id를 반환."""
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header[7:]
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        logger.warning("[auth] SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 미설정")
        return None

    try:
        supabase = create_supabase_client(supabase_url, supabase_key)
        user_response = supabase.auth.get_user(token)
        if user_response and user_response.user:
            return user_response.user.id
    except Exception as e:
        logger.warning("[auth] 토큰 검증 실패: %s", e)

    return None
