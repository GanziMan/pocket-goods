# 프론트엔드 메모리 누수 수정 Task Spec

**Date:** 2026-03-13

---

## Task 1: AIPanel — uploadedPreview blob URL 누수

**파일:** `apps/web/src/components/editor/AIPanel.tsx`

**문제:**
`URL.createObjectURL(file)`로 생성한 `uploadedPreview`가 파일 교체 또는 컴포넌트 언마운트 시 revoke되지 않아 메모리에 누적된다.

**수정 방향:**
- 새 파일 업로드 시 기존 `uploadedPreview` URL revoke 후 교체
- 컴포넌트 언마운트 시 `useEffect` cleanup에서 revoke

```ts
// handleUpload에서 기존 URL revoke
if (uploadedPreview) URL.revokeObjectURL(uploadedPreview);
setUploadedPreview(URL.createObjectURL(file));

// 언마운트 cleanup
useEffect(() => {
  return () => {
    if (uploadedPreview) URL.revokeObjectURL(uploadedPreview);
  };
}, [uploadedPreview]);
```

---

## Task 2: AIPanel — result blob URL 누수

**파일:** `apps/web/src/components/editor/AIPanel.tsx`

**문제:**
`removeBackground()`가 반환하는 blob을 `URL.createObjectURL(blob)`으로 변환해 `result` state에 저장하지만, 새 생성 또는 언마운트 시 revoke되지 않는다. AI 생성을 반복할수록 누수가 누적된다.

**수정 방향:**
- 새 생성 시작(`handleGenerate`) 직전 기존 `result` URL revoke
- 컴포넌트 언마운트 시 cleanup에서 revoke

```ts
// handleGenerate 진입 시
if (result) URL.revokeObjectURL(result);
setResult(null);

// 언마운트 cleanup
useEffect(() => {
  return () => {
    if (result) URL.revokeObjectURL(result);
  };
}, [result]);
```

---

## Task 3: useCanvas — addText/addSticker 언마운트 race condition

**파일:** `apps/web/src/components/canvas/useCanvas.ts`

**문제:**
`import("fabric").then(...)` 내부에서 `fabricRef.current!`를 사용하는데, promise resolve 전에 컴포넌트가 언마운트되면 `fabricRef.current`가 `null`임에도 `!`로 강제 접근해 런타임 에러 발생 가능.

**수정 방향:**
- `then` 콜백 진입 시 `fabricRef.current` null 체크 추가

```ts
import("fabric").then(({ IText }) => {
  const canvas = fabricRef.current;
  if (!canvas) return;  // 언마운트 가드
  ...
});
```

`addText`, `addSticker` 두 곳 모두 적용.
