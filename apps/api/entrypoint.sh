#!/bin/sh

# Railway: GOOGLE_CREDENTIALS 환경변수(JSON 문자열) → 파일로 변환
if [ -n "$GOOGLE_CREDENTIALS" ]; then
  printf '%s' "$GOOGLE_CREDENTIALS" > /app/gcp-sa-key.json
  export GOOGLE_APPLICATION_CREDENTIALS=/app/gcp-sa-key.json
fi

exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
