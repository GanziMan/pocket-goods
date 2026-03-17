# 에디터 UX 개선 — Backspace 삭제 & 캔버스 하단 줌 컨트롤

## 배경
그림판과 유사한 UX를 위해 두 가지 개선이 필요하다.

## 변경 사항

### 1. Backspace / Delete 키 → 선택 요소 삭제
- A5 캔버스에서 요소 선택 후 `Backspace` 또는 `Delete` 키를 누르면 휴지통 버튼과 동일하게 삭제
- `<input>`, `<textarea>`, `contenteditable` 등 텍스트 입력 중에는 동작하지 않음
- 구현 위치: `EditorLayout.tsx` — `useEffect` 로 `window` keydown 이벤트 등록

### 2. 줌 컨트롤을 캔버스 하단으로 이동
- 현재: 데스크탑 Toolbar 상단, 모바일 MobileActionBar 하단
- 변경: `<main>` 영역 내 캔버스 바로 아래 고정 바 (데스크탑 + 모바일 공통)
- 그림판처럼 `[-] 100% [+]` 형태로 표시

## 영향 파일
| 파일 | 변경 내용 |
|------|-----------|
| `EditorLayout.tsx` | Backspace 핸들러 추가, main 영역에 ZoomBar 삽입 |
| `Toolbar.tsx` | zoom 관련 props 및 JSX 제거 |
| `MobileActionBar.tsx` | zoom 관련 props 및 JSX 제거 |

## 주의사항
- Fabric.js 텍스트 편집 모드(IText) 중에는 Backspace가 캔버스 내부에서 소비되므로 window 핸들러까지 도달하지 않음 → 별도 처리 불필요
