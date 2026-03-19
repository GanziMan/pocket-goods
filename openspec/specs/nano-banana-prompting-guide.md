# Nano Banana (Gemini Image Generation) Prompting Guide

이 문서는 Gemini 3 제품군의 이미지 생성 모델인 **Nano Banana** 시리즈를 활용하여 고품질 에셋을 생성하고 편집하기 위한 기술 사양 및 프롬프트 가이드라인입니다.

---

## 1. 모델 라인업 및 기술 사양 (Model Specs)

| 모델명 | API 식별자 (Model ID) | 최적화 타겟 | 프로젝트 사용 위치 |
| :--- | :--- | :--- | :--- |
| **Nano Banana 2** | `gemini-3.1-flash-image-preview` | 속도 & 대량 생성 | `routers/generate.py` (굿즈 이미지 생성) |
| **Nano Banana Pro** | `gemini-3-pro-image-preview` | 전문 디자인 & 추론 | 미사용 (고정밀 필요 시 활용) |
| **Nano Banana** | `gemini-2.5-flash-image` | 저지연 & 효율성 | `routers/profile.py` (AI 프로필 생성) |

### 주요 기술 제한 (Limits)
* **해상도:** 1K, 2K, 4K 지원 (3.1 Flash는 512px 추가 지원).
* **가로세로 비율:** 1:1, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9.
    * *Nano Banana 2 전용:* 1:4, 4:1, 1:8, 8:1 추가 지원.
* **입력:** 최대 **14개**의 참조 이미지(Object 10개, 캐릭터 4~5개) 혼합 가능.
* **컨텍스트:** 3.1 Flash(131K), 3 Pro(65K) 입력 토큰 지원.
* **지식 컷오프:** 2025년 1월 (실시간 데이터는 Google 검색 그라운딩 활용).

---

## 2. 프롬프트 프레임워크 (Frameworks)

### 2.1 기본 생성 공식 (Text-to-Image)
단순 키워드 나열보다 서사적인 묘사가 중요합니다.
> **공식:** `[주체] + [동작] + [장소/맥락] + [구도] + [스타일]`
* **예시:** "브라운 드레스를 입은 모델이(주체) 자신감 있게 포즈를 취함(동작). 체리 레드 스튜디오 배경(맥락). 센터 프레임 미디엄 샷(구도). 고대비 시네마틱 조명의 패션 잡지 스타일(스타일)."

### 2.2 멀티모달 생성 (With References)
기존 이미지의 구조나 질감을 가져와 새 이미지를 만듭니다.
> **공식:** `[참조 이미지들] + [관계 지침] + [새로운 시나리오]`

---

## 3. 크리에이티브 디렉터 컨트롤 (Advanced Controls)

### 조명 (Lighting)
* **Studio:** "Three-point softbox setup" (제품 촬영 시 균일한 조명)
* **Dramatic:** "Chiaroscuro lighting", "Golden hour backlighting"

### 카메라 & 렌즈 (Camera)
* **Perspective:** "Low-angle shot", "Aerial view", "Fish-eye lens"
* **Focus:** "Shallow depth of field (f/1.8)", "Macro lens"
* **Hardware:** "GoPro" (왜곡된 액션감), "Fujifilm" (색감), "Disposable camera" (노스탤지어)

### 질감 & 재질 (Materiality)
* 구체적 소재: "Navy blue tweed", "Matte black ceramic", "Polished concrete"

---

## 4. 핵심 기능 가이드 (Core Features)

### 검색 그라운딩 (Search Grounding)
실시간 웹 정보를 기반으로 이미지를 생성합니다.
* **방법:** `[검색 요청] + [데이터 분석] + [시각적 번역]`
* **예시:** "샌프란시스코의 현재 날씨를 검색해서, 그 날씨에 맞는 옷차림을 한 캐릭터 이미지를 만들어줘."

### 고정밀 텍스트 렌더링
* **따옴표:** 출력할 텍스트는 반드시 **따옴표**(`"TEXT"`)로 감쌉니다.
* **폰트:** 스타일 명시 (예: "Bold sans-serif font", "Century Gothic")
* **현지화:** 한국어, 아랍어 등 10개 국어 이상의 정확한 텍스트 생성 지원.

### 사고 모드 (Thinking Mode)
* `thinking_level`: `high`(품질 우선) 또는 `minimal`(속도 우선) 설정 가능. 복잡한 구도일수록 `high` 권장.

---

## 5. 이미지 편집 및 수정 (Editing)

* **인페인팅 (Inpainting):** 특정 영역만 수정 (예: "소파만 가죽 소재로 변경").
* **스타일 전이:** 화풍 변환 (예: "도시 사진을 고흐 화풍으로 변환").
* **충실도 유지:** 얼굴이나 로고 등의 세부 정보를 유지하며 수정 요청 가능.

---

## 6. 권장 사항 (Best Practices)

1.  **긍정문 사용:** "차가 없는 거리" 대신 **"텅 빈 거리(Empty street)"**라고 설명.
2.  **구체성:** "판타지 갑옷" 대신 **"은박 무늬가 새겨진 엘프 판금 갑옷"**으로 상세 묘사.
3.  **반복 수정:** 멀티턴 대화를 통해 미세 조정(Iteration) 권장.

---

## 7. 프로젝트 적용 현황

### generate.py (굿즈 이미지 생성)
- **모델:** Nano Banana 2 (`gemini-3.1-flash-image-preview`)
- **스타일:** ghibli, sd, steampunk, akatsuki, custom
- **후처리:** rembg로 배경 제거 (누끼)

### profile.py (AI 프로필 생성)
- **모델:** Nano Banana (`gemini-2.5-flash-image`)
- **스타일:** id-photo, instagram, ghibli
- **후처리:** 없음 (배경 유지)

### 개선 가능 사항
- [ ] 프롬프트에 프레임워크 공식(주체+동작+장소+구도+스타일) 적용
- [ ] 복잡한 구도에 `thinking_level: high` 옵션 추가
- [ ] Nano Banana Pro 모델을 고품질 옵션으로 제공
- [ ] 해상도/비율 옵션을 사용자에게 노출
