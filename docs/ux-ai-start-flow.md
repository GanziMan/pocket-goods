# UX AI 시작 흐름 리뷰 (2026-04-16)

이 문서는 “처음 들어온 사용자가 빈 캔버스에서 쉽게 AI 만들기를 시작하는 흐름”을 기준으로
랜딩(`/`)과 에디터(`/design`) UX를 점검하고, 구현/리뷰/QA가 같은 기준으로 판단할 수 있게 정리한
작업 계약서입니다.

## 목표

- 전체 디자인은 시각 요소보다 **첫 행동이 명확한 구조**를 우선합니다.
- 랜딩의 주요 CTA는 사용자를 곧바로 `/design`으로 보내고, 에디터에서는 빈 캔버스 진입 시
  AI 생성 흐름을 가장 먼저 보여줍니다.
- 모바일에서는 하단 조작 버튼이 좁은 화면에 과밀하게 보이지 않도록 주요 행동과 보조 행동을
  구분합니다.
- 데스크톱과 모바일 모두 기존 주문/미리보기/저장 계약을 유지합니다.

## 현재 코드 표면 리뷰

| 영역 | 주요 파일 | 리뷰 메모 |
| --- | --- | --- |
| 랜딩 최초 CTA | `apps/web/src/components/landing/HeroSection.tsx` | CTA가 `/design` 단일 진입으로 정리되어 있어 시작 경로가 단순합니다. 버튼 copy는 “만들기 시작” 성격을 유지해야 합니다. |
| 에디터 오케스트레이션 | `apps/web/src/components/editor/EditorLayout.tsx` | 모바일 drawer state는 `mobilePanel` 하나로 관리됩니다. 빈 캔버스 최초 진입 자동 오픈을 추가할 경우 이 state를 재사용하는 것이 가장 작은 변경입니다. |
| 모바일 버튼 | `apps/web/src/components/editor/MobileActionBar.tsx` | 현재 undo/redo/add/delete/preview/order/cart가 모두 같은 하단 row에 있어 작은 화면에서 과밀합니다. 핵심 CTA(추가/AI 시작)와 보조 작업(삭제, 주문함)을 시각적으로 분리해야 합니다. |
| 에셋/AI 패널 | `apps/web/src/components/editor/AssetPanel.tsx`, `AIPanel.tsx` | 에셋 패널의 기본 탭은 이미 `ai`입니다. 따라서 모바일에서 drawer만 열리면 AI 생성 화면이 첫 화면으로 노출됩니다. |
| 캔버스 안내 | `apps/web/src/components/canvas/DesignCanvas.tsx` | `showGuide={isCanvasReady && !hasObjects}` 계약이 있어 빈 캔버스 상태를 UI hint로 표현할 수 있습니다. 자동 drawer와 안내 copy가 서로 충돌하지 않게 해야 합니다. |

## UX 동작 계약

### 랜딩(`/`)

1. 히어로 CTA는 하나의 주요 행동을 유지합니다: `/design` 진입.
2. CTA 주변에 보조 버튼을 추가하더라도 같은 시각 무게를 주지 않습니다.
3. copy는 “스티커/굿즈 만들기 시작”처럼 결과와 다음 행동을 함께 알려야 합니다.

### 데스크톱 에디터(`/design`, `md` 이상)

1. 좌측 패널은 항상 보이며 기본 탭은 AI입니다.
2. 빈 캔버스에서도 사용자가 별도 탐색 없이 AI style feed, 업로드, 생성 버튼을 볼 수 있어야 합니다.
3. 미리보기/주문/주문함은 상단 toolbar에 남겨 주문 흐름 계약을 유지합니다.
4. 용지 크기와 줌 컨트롤은 캔버스 하단에 유지해 작업 맥락에서 벗어나지 않게 합니다.

### 모바일 에디터(`/design`, `md` 미만)

1. 저장된 draft 복원이 없고 캔버스가 비어 있는 최초 진입이면 AI drawer를 자동으로 엽니다.
2. 자동 오픈은 한 세션에서 반복되지 않아야 합니다. 사용자가 닫은 뒤 resize나 canvas ready 이벤트로 다시 열리면 안 됩니다.
3. draft 복원 confirm에서 사용자가 복원을 선택한 경우에는 자동 AI drawer를 열지 않습니다.
4. 하단 action bar의 주요 CTA는 “AI/추가 시작”으로 보이게 하고, 보조 행동은 좁은 버튼/아이콘만으로 과도하게 경쟁하지 않게 합니다.
5. 하단 action bar는 iOS safe area를 침범하지 않고, preview/order/cart 접근성을 유지합니다.

## 버튼 배치 원칙

- **Primary:** AI 생성/이미지·텍스트 추가 진입. 모바일에서 가장 눈에 띄는 버튼입니다.
- **Secondary:** 미리보기/주문. 제작 흐름 후반 행동이므로 primary보다 낮은 시각 무게를 둡니다.
- **Utility:** undo/redo/delete/cart. 자주 쓰지만 시작 흐름을 방해하지 않도록 묶거나 작은 affordance로 둡니다.
- **Danger:** 삭제는 선택 상태가 없을 때 disabled이고, 활성화되어도 primary CTA와 같은 색을 쓰지 않습니다.

## 구현 체크리스트

- [ ] `AssetPanel` 기본 탭은 `ai`로 유지한다.
- [ ] 모바일 최초 빈 캔버스 자동 drawer는 `EditorLayout`의 모바일 state를 재사용한다.
- [ ] 자동 drawer 조건은 `isCanvasReady`, `hasObjects`, draft 복원 결과, 모바일 media query를 함께 고려한다.
- [ ] 자동 drawer는 session-level guard 또는 component ref guard로 한 번만 실행한다.
- [ ] 모바일 하단 action bar에서 버튼 텍스트가 작은 폭에서 줄바꿈/겹침 없이 보인다.
- [ ] preview/order/cart, save, draft restore, A4/A5/A6 전환 기존 동작을 유지한다.

## QA 체크리스트

### 수동 QA

1. 모바일 폭(예: 390px)에서 `/design` 최초 진입 → AI drawer가 자동으로 열리고 AI 탭이 보이는지 확인.
2. drawer를 닫은 뒤 화면 회전/resize → 자동으로 다시 열리지 않는지 확인.
3. canvas에 이미지를 추가한 뒤 새로고침 및 draft 복원 선택 → AI drawer가 자동으로 덮지 않는지 확인.
4. 모바일 하단 버튼에서 주요 CTA, 미리보기, 주문, 주문함이 모두 접근 가능한지 확인.
5. 데스크톱 폭에서 좌측 AI 패널이 기본 노출되고 자동 drawer 로직이 실행되지 않는지 확인.

### 명령어 검증

```bash
npm --prefix apps/web run lint
npx --prefix apps/web tsc --noEmit
npm --prefix apps/web run test
npm --prefix apps/web run build
```

## 회귀 위험

- draft 복원 confirm과 자동 drawer가 동시에 동작하면 사용자가 복원 여부를 판단하기 전에 UI가 바뀔 수 있습니다.
  복원 로직 완료 후 자동 drawer 여부를 결정해야 합니다.
- `hasObjects`가 canvas load 직후 잠시 false인 경우 복원된 draft를 빈 캔버스로 오인할 수 있습니다.
  복원 시도 완료 상태를 별도로 둔 뒤 판단하는 편이 안전합니다.
- action bar 버튼을 줄일 때 주문함 접근을 숨기면 기존 주문 묶음 흐름이 퇴행합니다.
