# 에디터/주문 변경 리뷰 노트

## 배경

2026-04-13 작업은 스티커 에디터와 주문 완료 흐름의 운영 요구를 맞추는 것이 목표입니다.
요구사항은 다음 다섯 가지로 묶입니다.

1. 분리된 이미지/칼선이 여러 스티커 섬으로 제작될 수 있음을 미리보기에서 경고한다.
2. 주문 완료 시 제작자(`kju7859@gmail.com`)에게 주문 메일을 즉시 보낸다.
3. 주문 메일의 이미지 파일은 칼선, 사용자 정보, 주문 시각, 주문 번호가 합성되지 않은 디자인만 포함한다.
4. PortOne 결제창 호출은 임시 비활성화한다.
5. A4/A5/A6 변경은 외부 캔버스 비율만 바꾸고 배치된 이미지는 확대/축소하지 않는다.
6. mm 작업 영역 경계선은 명확한 실선으로 표시한다.

## Code quality review checklist

### Preview/cutline UI

- 경고 copy는 한국어로 작성하고 주문 차단 사유와 단순 안내를 구분한다.
- 칼선 프리뷰 계산은 UI 표시용이며, 주문 메일 첨부 이미지를 오염시키지 않아야 한다.
- `canvas` 2D context에서 경고/칼선 프리뷰를 그린 뒤에도 원본 `payload.canvasJSON`은 변경하지 않는다.
- 여러 섬 감지는 작은 알파 노이즈를 경고로 오인하지 않도록 최소 면적 또는 connected-component 임계값을 둔다.

### Manual order completion

- 주문번호는 클라이언트/서버 중 한 곳에서 한 번만 생성하고, 메일 본문과 응답에 같은 값을 사용한다.
- 주문 시각은 서버 기준 ISO timestamp를 우선한다. 클라이언트 시간은 표시 보조값으로만 사용한다.
- 메일 수신자는 운영 요구에 따라 `kju7859@gmail.com`으로 고정하되, 향후 운영 전환을 위해 환경 변수 override를 허용할 수 있다.
- 메일 실패 시 사용자는 성공 메시지를 보지 않아야 하며, 재시도 가능 상태로 남겨야 한다.
- PortOne 관련 import/call은 임시 비활성 상태에서 번들 경고와 dead code를 만들지 않도록 분리한다.

### Print image/export contract

- 제작용 PNG는 `with_cutting_line=false` 또는 동일 의미의 계약을 명시적으로 사용한다.
- 주문자 정보, 주문번호, 주문 시각은 메일 본문/metadata에만 두고 이미지 픽셀에 합성하지 않는다.
- Supabase 업로드 실패와 메일 첨부 생성 실패는 구분해 로깅한다.
- 출력 사이즈별 렌더러 계약은 A4/A5/A6 enum을 공유하고 임의 문자열을 받지 않는다.

### Canvas sizing

- A4/A5/A6 선택 시 Fabric object의 `scaleX`, `scaleY`, `left`, `top`을 자동 배율로 재작성하지 않는다.
- 바깥 캔버스 크기와 mm 라벨만 선택 규격을 반영한다.
- `toJSON()`/`toDataURL()` export는 현재 화면 zoom이 아니라 원본 논리 좌표 기준으로 동작해야 한다.
- 경계선은 `border`/`ring`/overlay 모두 실선이어야 하며, preview cutline 점선과 혼동되지 않아야 한다.

## Manual QA checklist

1. `/design`에서 이미지를 두 개 이상 떨어뜨려 배치한다.
2. 미리보기를 열고 분리 제작 가능성 경고가 표시되는지 확인한다.
3. 빨간 칼선/안내가 화면용 preview에만 존재하고 주문 메일 이미지에는 들어가지 않는지 확인한다.
4. A6 → A5 → A4를 전환해 외부 흰색 캔버스 비율/크기는 바뀌고 기존 이미지 크기는 유지되는지 확인한다.
5. 주문자/배송 정보를 입력하고 주문 완료를 눌러 PortOne 결제창이 열리지 않는지 확인한다.
6. 제작자 메일에 주문번호, 서버 시각, 주문자 정보, 수량, 디자인 PNG가 포함되는지 확인한다.
7. 필수 입력 누락, 칼선 안전하지 않음, 메일 실패 시 사용자가 성공 완료 상태로 빠지지 않는지 확인한다.

## Verification commands

```bash
npm --prefix apps/web run lint
npx --prefix apps/web tsc --noEmit
npm --prefix apps/web run build
python -m compileall apps/api
```

테스트 러너가 추가되기 전까지는 위 정적 검증과 함께 수동 QA 체크리스트 결과를 PR 또는 작업 완료 보고에 남깁니다.
