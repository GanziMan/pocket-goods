import base64
import io
import logging
import os
import time
from typing import Optional

from google import genai
from google.genai import types
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image

from services.rate_limit import (
    DAILY_LIMIT_ANONYMOUS,
    DAILY_LIMIT_USER,
    check_rate_limit,
    get_usage_count,
    get_user_id_from_token,
    increment_usage,
)

from services.rembg_session import get_rembg_session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["generate"])

NANO_BANANA_MODEL_PRIMARY = "gemini-3.1-flash-image-preview"
NANO_BANANA_MODEL_FALLBACK = "gemini-2.5-flash-image"
STYLE_PROMPTS: dict[str, str] = {
    "ghibli": """
[주체] 사용자 요청 또는 첨부 이미지의 캐릭터를 중심으로 한 장면.
[스타일]
- Studio Ghibli(스튜디오 지브리) 극장판 애니메이션 수준의 퀄리티.
- 미야자키 하야오 감독 특유의 손그림 수채화 터치: 부드럽고 따뜻한 파스텔 톤(연한 살구색, 옅은 민트, 연보라), 수채화 종이 위에 물감이 스며든 듯한 자연스러운 그라데이션.
- 캐릭터 외곽선은 부드럽고 둥근 갈색~진갈색 선으로, 검은색 외곽선은 사용하지 않음.
- 눈은 크고 반짝이며, 홍채에 수채화 그라데이션 적용. 표정은 따뜻하고 감성적.
- 머리카락은 뭉탱이 덩어리로 표현, 한 올 한 올이 아닌 부드러운 매스(mass) 형태.
- 옷과 소품은 소박하고 자연스러운 질감(면, 린넨, 나무 등).
[조명] 따뜻한 오후 햇살. 캐릭터 뒤에서 부드러운 역광(rim light)으로 윤곽을 은은하게 강조. 전체적으로 골든아워 톤.
[구도] 캐릭터 전신(full-body)이 화면 중앙에 위치. 캐릭터가 캔버스의 약 75%를 차지. 사방에 약간의 여백. 정면 또는 살짝 3/4 앵글.
[출력] 배경은 완전히 투명(transparent/누끼). 캐릭터만 단독 존재. 아크릴 키링·투명 스티커 인쇄에 적합한 선명한 외곽.
[금지] 텍스트, 글자, 말풍선, 워터마크, 프레임 테두리, 뭉개진 디테일, 변형된 손가락 절대 포함 금지.
""",
    "sd": """
[주체] 사용자 요청 또는 첨부 이미지의 캐릭터를 SD(슈퍼 디포르메)/치비(chibi)로 변환.
[스타일]
- 일본 SD 피규어/가챠폰 스타일의 극도로 귀여운 치비 캐릭터.
- 2~2.5등신 비율: 매우 큰 머리(전체의 40~50%), 짧고 뭉툭한 팔다리, 작은 몸통.
- 눈: 얼굴의 1/3 차지할 만큼 크고 둥글게. 별 모양 또는 하트 모양 하이라이트. 홍채에 그라데이션.
- 입: 작고 귀여운 ω형 또는 ▽형.
- 굵고 균일한 검은 외곽선(2~3px 두께). 선 끊김 없이 완전히 닫힌 외곽.
- 밝고 채도 높은 셀 애니메이션 색감. 단순하고 깔끔한 색면(flat color) + 최소한의 셀 셰이딩(1단계).
[조명] 균일한 플랫 라이팅. 그림자는 최소한의 1단 셀 셰이딩만. 깔끔한 일러스트 느낌.
[구도] 캐릭터 전신(full-body) 중앙 배치. 캔버스의 약 80%를 차지. 위아래 여백 균등.
[출력] 배경 완전 투명(누끼). 캐릭터만 단독 존재. 아크릴 키링·투명 스티커 인쇄에 적합하도록 외곽선이 완전히 닫혀야 함.
[금지] 텍스트, 글자, 말풍선, 워터마크, 프레임 테두리, 변형된 손가락, 비대칭 눈 절대 포함 금지.
""",
    "fairly-odd": """
[주체] 사용자 요청 또는 첨부 이미지의 캐릭터를 "The Fairly OddParents" 스타일로 변환.
[스타일]
- Butch Hartman의 Nickelodeon 카툰 스타일을 정확히 재현.
- 레퍼런스: Timmy Turner, Cosmo, Wanda의 화풍과 동일한 느낌.
- 극도로 굵고 깔끔한 검은 외곽선(3~4px). 모든 형태가 선으로 확실히 구분.
- 색상: 밝고 채도 높은 플랫 컬러. 그라데이션 없음. 각 색면이 단일 색상으로 채워짐.
- 머리: 과장되게 큰 비율(몸의 1/2~1/3). 뾰족하거나 각진 형태의 머리 실루엣.
- 눈: 매우 크고 동그란 눈, 흰 눈동자에 검은 홍채. 눈이 얼굴의 대부분 차지.
- 턱: 뾰족하게 각진 턱(V자 형태).
- 코: 극도로 작은 점 또는 짧은 삼각형.
- 몸: 심플하게 단순화된 형태, 과장된 비율.
[조명] 완전 플랫. 그림자 없음. 밝고 균일한 단색 면으로만 구성.
[구도] 캐릭터 전신(full-body) 중앙 배치. 캔버스의 약 75% 차지.
[출력] 배경 완전 투명(누끼). 캐릭터만 단독 존재. 외곽선이 명확하고 닫혀 있어 스티커 커팅에 적합.
[금지] 그라데이션, 리얼리스틱 셰이딩, 텍스트, 말풍선, 워터마크, 프레임 테두리 절대 금지.
""",
    "powerpuff": """
[주체] 사용자 요청 또는 첨부 이미지의 캐릭터를 "The Powerpuff Girls" 스타일로 변환.
[스타일]
- Craig McCracken의 Cartoon Network 원작 화풍을 정확히 재현.
- 레퍼런스: Blossom, Bubbles, Buttercup의 디자인과 동일한 느낌.
- 눈: 극단적으로 큰 타원형(얼굴의 60% 이상). 홍채가 눈 전체를 채움. 각 눈에 큰 원형 하이라이트 1개.
- 코: 없음. 코를 그리지 않는다.
- 입: 매우 작은 선 또는 점. 얼굴 하단에 위치.
- 몸: 뭉툭하고 둥근 타원형 몸통. 목 없음(머리가 몸에 바로 연결).
- 팔: 가는 선 형태, 손가락 없는 둥근 원형 손(mitten hands).
- 다리: 짧고 뭉툭한 원통형, 검은색 메리제인 구두.
- 외곽선: 굵고 균일한 검은 선(3~4px). 완전히 닫힌 외곽.
- 색상: 밝은 파스텔~비비드 플랫 컬러. 그라데이션 없음.
[조명] 완전 플랫. 그림자 완전 없음. 밝고 균일한 단색 면.
[구도] 캐릭터 전신(full-body) 중앙 배치. 캔버스의 약 80% 차지.
[출력] 배경 완전 투명(누끼). 캐릭터만 단독 존재.
[금지] 코, 리얼리스틱 셰이딩, 그라데이션, 텍스트, 워터마크, 프레임 테두리 절대 금지. 손가락을 그리지 않는다.
""",
    "akatsuki": """
[주체] 사용자 요청 또는 첨부 이미지의 캐릭터를 나루토 아카츠키(暁) 멤버 스타일로 변환.
[스타일]
- 마사시 키시모토의 NARUTO 원작 화풍을 재현.
- 레퍼런스: 이타치, 페인(나가토), 데이다라 등 아카츠키 멤버의 디자인.
- 복장: 검은 바탕에 붉은 구름(赤雲) 문양이 들어간 긴 망토(아카츠키 로브). 높은 칼라로 턱까지 가림. 망토 안은 어두운 의상.
- 눈: 날카롭고 강렬. 샤링안(3개의 점이 원형 배열) 또는 린네간(동심원 패턴) 중 택 1. 눈빛에 강한 존재감.
- 이마보호대(히타이아테): 금속 플레이트에 마을 문양 + 가로줄(누케닌 표시).
- 전체적으로 날카롭고 각진 선화, 극적인 분위기.
[조명] 드라마틱 로우키. 캐릭터 뒤에서 붉은 림라이트. 얼굴 반쪽에 강한 명암 대비.
[구도] 캐릭터 전신 또는 상반신. 약간의 로우앵글로 위압감 연출. 캔버스의 75~85% 차지. 중앙 배치.
[출력] 배경 완전 투명(누끼). 캐릭터만 단독 존재. 선명한 외곽선.
[금지] 텍스트, 글자, 워터마크, 프레임 테두리, 뭉개진 디테일 절대 금지.
""",
    "everskies": """
[주체] 사용자 요청 또는 첨부 이미지의 인물을 Everskies 아바타 감성으로 변환.
[스타일]
- 패션 중심의 스타일라이즈된 비율, 트렌디한 의상 레이어링, 선명한 메이크업 표현.
- 깔끔하고 선명한 외곽선 + 현대적인 색 조합.
- 원본 인물의 헤어, 의상, 액세서리 핵심 특징은 유지.
[구도] 캐릭터 중심 구도, 전신 또는 3/4 샷.
[출력] 배경은 완전히 투명(누끼). 캐릭터만 단독 존재.
[금지] 텍스트, 워터마크, 프레임 테두리 금지.
""",
    "sylvanian": """
[주체] 사용자 요청 또는 첨부 이미지의 캐릭터를 실바니안 인형 감성으로 변환.
[스타일]
- 보송한 플록 질감, 둥글고 순한 얼굴, 아기자기한 소품과 의상 디테일.
- 따뜻하고 부드러운 톤, 귀엽고 포근한 분위기.
- 원본의 헤어/의상 포인트를 최대한 유지하되 인형 스타일로 재해석.
[구도] 캐릭터 단독 중심 구도.
[출력] 배경은 완전히 투명(누끼). 캐릭터만 단독 존재.
[금지] 텍스트, 워터마크, 프레임 테두리 금지.
""",
    "animal-crossing": """
닌텐도 스위치 게임 동물의 숲 스타일의 3D 캐릭터 일러스트 화풍을 공부하고, 그 스타일의 이목구비, 의상. 헤어스타일을 따라 하는 얼굴 표현방식을 따라해. 첨부한 이미지 속 인물의 헤어스타일과 옷, 액세서리로 인물 일러스트를 그려줘. 배경은 투명하게 해줘. 자연광 아래의 밝은 햇빛과 부드러운 그림자 효과를 사용해 따뜻하고 발랄한 분위기로 만들어 줘. 실제 동물의숲 플레이 화면에 등장하는 캐릭터처럼 보여야 해, 3D인 점을 명확하게 보여줘.
""",
    "ios-emoji": """
사진 속 인물을 애플 ios 이모지 스타일의 3D 배경화면 캐릭터로 만들어줘. 이목구비, 피부색, 표정, 표면 질감 등을 모방하고, 헤어 스타일, 머리 장식, 의상, 포즈까지 그대로 반영해줘. 배경은 투명색이며, 최종 이미지가 ios 공식 이모지처럼 보이게 해줘.
""",
    "maplestory": """
메이플스토리 인게임 캐릭터의 픽셀 캐릭터 느낌으로 만들어줘. 이목구비, 의상, 헤어스타일을 반영한 얼굴표현을 해줘. 스타일, 옷 액세서리는 첨부한 사진을 그대로 반영해줘. 굿즈 제작에 적합하도록 캐릭터 외곽은 선명하게 닫고, 배경은 완전히 투명하게 만들어줘.
""",
    "minimi": """
[주체] 사용자 요청 또는 첨부 이미지의 인물/캐릭터를 미니미 굿즈 캐릭터로 변환.
[스타일]
- 작고 단순한 2~3등신 비율, 동글동글한 얼굴, 짧은 팔다리.
- 원본의 헤어스타일, 의상, 액세서리, 대표 색상은 알아볼 수 있게 유지.
- 선은 깔끔하고 부드럽게 닫힌 외곽선, 색감은 밝은 파스텔과 선명한 포인트 컬러.
- 작은 아크릴 키링/스티커로 인쇄해도 알아보기 쉬운 단순한 실루엣.
[구도] 캐릭터 단독 전신 중심 구도, 캔버스의 75~85% 차지.
[출력] 배경은 완전히 투명(누끼). 캐릭터만 단독 존재.
[금지] 텍스트, 워터마크, 프레임 테두리, 복잡한 배경, 과도한 디테일 금지.
""",
    "tanning-kitty": """
첨부 사진을 아래 요청 스타일에 맞춰서 2D 캐릭터화해줘. 헬로키티 스타일로 원작의 얼굴과 몸 비율, 윤곽선은 그대로 유지해줘. 피부색은 밝은 라떼색, 햇볕에 건강하게 그을린 느낌으로 변경해줘 (지나치게 어두운 색은 피함). 원래의 리본, 액세서리, 옷은 사진 스타일에 맞게 조정해줘. 사용자 사진을 참고해서 헤어스타일과 옷 스타일은 그대로 반영해줘. 전체적으로 귀엽고 단순한 산리오 스타일 유지해주고 배경은 투명하게 만들어줘.
""",
    "snoopy": """
업로드한 이미지를 Peanuts-style 3d art로 변경해줘. 배경과 옷은 원본 이미지와 비슷하게 표현해주고 스타일만 바꿔줘. png 파일로 저장해주고 그 옆에 스누피 캐릭터 형태도 그대로 그려줘.
""",
    "snowglobe": """
이미지를 귀엽고 아기같은 차비 스타일의 3D 캐릭터로 만들어줘.
이걸 아이소메트릭 스타일로 만들어줘. 깔끔하고 미니멀한 스타일이어야해.
테마는 첨부 사진의 분위기와 인물에게 가장 잘 어울리는 콘셉트로 최대한 구체적으로 정해줘.
이 사진으로 나만의 3D 스노우볼을 만들어줘.
캐릭터는 스노우볼 중앙에 배치하고, 스노우볼 배경색은 인물의 옷과 가장 잘 어울리는 색으로 정해줘.
어울리는 소품도 추가해줘. 귀엽고 고급스럽게 만들어줘.
스노우볼 안에 물방울처럼 떠다니는 스노우 입자 효과를 넣어줘.
오르골 바닥에는 인물에게 어울리는 짧은 이름이나 문구를 필기체로 적어줘.
최종 결과는 배경을 제거한 투명 PNG로 사용할 수 있게 캐릭터/스노우볼만 남겨줘.
""",
    "custom": """
[지시] 사용자의 요청을 최대한 충실하게 따른다.
[구도] 캐릭터가 화면 중앙에 위치하는 풀바디 샷. 캐릭터가 캔버스의 약 75%를 차지.
[출력] 배경은 완전히 투명(누끼). 캐릭터만 단독 존재. 아크릴 키링·투명 스티커 인쇄에 적합한 선명한 외곽선.
[금지] 텍스트, 글자, 워터마크, 프레임 테두리 절대 포함 금지. 별도 지시가 없는 한 배경을 그리지 않는다.
""",
}

def _image_to_base64(image: Image.Image, fmt: str = "PNG") -> str:
    buffer = io.BytesIO()
    image.save(buffer, format=fmt)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def _pil_to_part(image: Image.Image, mime: str = "image/png") -> types.Part:
    buffer = io.BytesIO()
    fmt = "PNG" if mime == "image/png" else "JPEG"
    image.save(buffer, format=fmt)
    return types.Part.from_bytes(data=buffer.getvalue(), mime_type=mime)




@router.post("/generate-image")
async def generate_image(
    request: Request,
    prompt: str = Form(...),
    style: str = Form(default="everskies"),
    canvas_image: Optional[UploadFile] = File(default=None),
    upload_image: Optional[UploadFile] = File(default=None),
):
    """
    프롬프트 + 선택적 이미지(캔버스 캡처 or 사용자 업로드)를 받아
    Nano Banana 2로 이미지를 생성합니다.
    """
    # 인증 확인: 토큰이 있으면 user_id 기반, 없으면 IP 기반
    has_token = request.headers.get("authorization", "").startswith("Bearer ")
    user_id = get_user_id_from_token(request)
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown").split(",")[0].strip()

    if user_id:
        rate_key = f"user:{user_id}"
        daily_limit = DAILY_LIMIT_USER
    else:
        rate_key = f"ip:{client_ip}"
        daily_limit = DAILY_LIMIT_ANONYMOUS

    remaining = check_rate_limit(rate_key, daily_limit)
    if remaining <= 0:
        logger.warning("[generate] rate limit 초과 key=%s", rate_key)
        detail = f"일일 생성 횟수({daily_limit}회)를 초과했습니다. 내일 다시 이용해주세요."
        # 토큰을 보냈지만 검증 실패한 경우는 login_required=False
        error_body = {"detail": detail, "login_required": not has_token and user_id is None}
        return JSONResponse(status_code=429, content=error_body)

    # Vertex AI 우선, 없으면 Gemini API 키 fallback
    gcp_project = os.getenv("GCP_PROJECT_ID")
    gcp_location = os.getenv("GCP_LOCATION", "us-central1")
    gemini_key = os.getenv("GEMINI_API_KEY")

    if gcp_project:
        client = genai.Client(
            vertexai=True,
            project=gcp_project,
            location=gcp_location,
        )
        logger.info("[generate] Vertex AI 사용 (project=%s, location=%s)", gcp_project, gcp_location)
    elif gemini_key:
        client = genai.Client(api_key=gemini_key)
        logger.info("[generate] Gemini API 키 사용")
    else:
        raise HTTPException(status_code=500, detail="GCP_PROJECT_ID 또는 GEMINI_API_KEY가 설정되지 않았습니다.")
    style_prompt = STYLE_PROMPTS.get(style, STYLE_PROMPTS["everskies"])

    # 프롬프트 + 이미지 파트 조합
    parts: list = []

    if canvas_image:
        canvas_bytes = await canvas_image.read()
        pil_img = Image.open(io.BytesIO(canvas_bytes)).convert("RGBA")
        parts.append(_pil_to_part(pil_img, "image/png"))
        parts.append(
            f"{style_prompt}\n\n"
            f"[참고 이미지] 첨부된 것은 사용자가 현재 작업 중인 디자인이다. "
            f"이 디자인의 전체적인 분위기와 배치를 참고하면서, 위 스타일로 새로운 캐릭터/요소를 생성해줘.\n"
            f"사용자 요청: {prompt}"
        )
        logger.info("[generate] mode=canvas_image style=%s prompt=%r", style, prompt)
    elif upload_image:
        upload_bytes = await upload_image.read()
        pil_img = Image.open(io.BytesIO(upload_bytes)).convert("RGB")
        parts.append(_pil_to_part(pil_img, "image/jpeg"))
        parts.append(
            f"{style_prompt}\n\n"
            f"[변환 지시] 첨부된 사진의 인물/캐릭터를 위 스타일로 변환해줘. "
            f"원본의 핵심 특징(외형, 의상, 색상, 포즈)을 최대한 유지하면서 해당 스타일의 화풍으로 다시 그려라. "
            f"완전히 다른 캐릭터가 되어서는 안 된다.\n"
            f"사용자 추가 요청: {prompt}"
        )
        logger.info("[generate] mode=upload_image style=%s prompt=%r", style, prompt)
    else:
        parts.append(f"{style_prompt}\n\n사용자 요청: {prompt}")
        logger.info("[generate] mode=text_only style=%s prompt=%r", style, prompt)

    models_to_try = [NANO_BANANA_MODEL_PRIMARY, NANO_BANANA_MODEL_FALLBACK]
    last_error: Exception | None = None

    for model_id in models_to_try:
        try:
            logger.info("[generate] Gemini API 호출 시작 model=%s", model_id)
            t0 = time.monotonic()

            response = await client.aio.models.generate_content(
                model=model_id,
                contents=parts,
                config=types.GenerateContentConfig(
                    response_modalities=["TEXT", "IMAGE"],
                ),
            )

            elapsed = time.monotonic() - t0
            logger.info("[generate] Gemini 응답 수신 model=%s (%.1fs)", model_id, elapsed)

            # 응답에서 이미지 추출 + rembg 누끼 처리
            for part in response.candidates[0].content.parts:
                if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                    raw_bytes = part.inline_data.data
                    logger.info("[generate] 이미지 추출 성공 size=%dB — rembg 누끼 시작", len(raw_bytes))

                    t1 = time.monotonic()
                    from rembg import remove as rembg_remove
                    removed = rembg_remove(raw_bytes, session=get_rembg_session())
                    logger.info("[generate] rembg 완료 (%.1fs)", time.monotonic() - t1)

                    image_b64 = base64.b64encode(removed).decode("utf-8")
                    increment_usage(rate_key)
                    used_fallback = model_id == NANO_BANANA_MODEL_FALLBACK
                    used_count = get_usage_count(rate_key)
                    logger.info("[generate] key=%s 오늘 %d/%d회 사용", rate_key, used_count, daily_limit)
                    return JSONResponse({
                        "success": True,
                        "image": f"data:image/png;base64,{image_b64}",
                        "remaining": daily_limit - used_count,
                        "daily_limit": daily_limit,
                        **({"fallback": True, "fallback_message": "서버 과부하로 경량 모델로 생성되었어요. 품질이 다소 낮을 수 있습니다."} if used_fallback else {}),
                    })

            logger.warning("[generate] 응답에 이미지 없음 model=%s", model_id)
            raise HTTPException(status_code=500, detail="이미지가 생성되지 않았습니다.")

        except HTTPException:
            raise
        except Exception as e:
            is_quota = "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e)
            if is_quota and model_id == NANO_BANANA_MODEL_PRIMARY:
                logger.warning("[generate] %s 429 발생 → fallback %s", model_id, NANO_BANANA_MODEL_FALLBACK)
                last_error = e
                continue
            logger.exception("[generate] 오류 발생: %s", e)
            if is_quota:
                raise HTTPException(
                    status_code=429,
                    detail="AI 서버가 일시적으로 바빠요. 잠시 후 다시 시도해주세요.",
                )
            raise HTTPException(status_code=500, detail=str(e))

    # 모든 모델 실패
    logger.exception("[generate] 모든 모델 실패: %s", last_error)
    raise HTTPException(status_code=429, detail="AI 서버가 일시적으로 바빠요. 잠시 후 다시 시도해주세요.")
