import json
import logging
import os
import tempfile
from pathlib import Path

from fastapi import HTTPException
from google import genai

logger = logging.getLogger(__name__)

DEFAULT_GCP_LOCATION = "global"
GOOGLE_CREDENTIALS_PATH_ENV = "GOOGLE_APPLICATION_CREDENTIALS"
GOOGLE_CREDENTIALS_JSON_ENV = "GOOGLE_CREDENTIALS"


def _materialize_google_credentials(log_tag: str) -> None:
    """Allow Railway-style GOOGLE_CREDENTIALS JSON to work as ADC.

    Google client libraries discover service-account files through
    GOOGLE_APPLICATION_CREDENTIALS. Railway secrets are easier to manage as one
    JSON environment variable, so write that value to a temporary file when the
    entrypoint has not already done it.
    """
    if os.getenv(GOOGLE_CREDENTIALS_PATH_ENV):
        return

    credentials_json = os.getenv(GOOGLE_CREDENTIALS_JSON_ENV)
    if not credentials_json:
        return

    credentials_path = Path(tempfile.gettempdir()) / "pocket-goods-gcp-sa-key.json"
    try:
        parsed_credentials = json.loads(credentials_json)
        credentials_path.write_text(
            json.dumps(parsed_credentials),
            encoding="utf-8",
        )
    except json.JSONDecodeError:
        # Preserve current Docker entrypoint behavior for preformatted content.
        credentials_path.write_text(credentials_json, encoding="utf-8")

    os.environ[GOOGLE_CREDENTIALS_PATH_ENV] = str(credentials_path)
    logger.info("[%s] Google ADC credentials materialized from GOOGLE_CREDENTIALS", log_tag)


def get_genai_client(log_tag: str) -> genai.Client:
    gcp_project = os.getenv("GCP_PROJECT_ID") or os.getenv("GOOGLE_CLOUD_PROJECT")
    gcp_location = (
        os.getenv("GCP_LOCATION")
        or os.getenv("GOOGLE_CLOUD_LOCATION")
        or DEFAULT_GCP_LOCATION
    )
    gemini_key = os.getenv("GEMINI_API_KEY")

    if gcp_project:
        _materialize_google_credentials(log_tag)
        client = genai.Client(
            vertexai=True,
            project=gcp_project,
            location=gcp_location,
        )
        logger.info(
            "[%s] Vertex AI 사용 (project=%s, location=%s)",
            log_tag,
            gcp_project,
            gcp_location,
        )
        return client

    if gemini_key:
        client = genai.Client(api_key=gemini_key)
        logger.info("[%s] Gemini API 키 사용", log_tag)
        return client

    raise HTTPException(
        status_code=500,
        detail=(
            "GCP_PROJECT_ID/GOOGLE_CLOUD_PROJECT 또는 GEMINI_API_KEY가 설정되지 않았습니다. "
            "Vertex AI를 사용할 경우 GCP_PROJECT_ID, GCP_LOCATION, GOOGLE_CREDENTIALS를 설정해주세요."
        ),
    )
