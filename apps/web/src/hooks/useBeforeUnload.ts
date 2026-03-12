"use client";

import { useEffect } from "react";

export function useBeforeUnload(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // 모던 브라우저는 커스텀 메시지 무시하고 기본 메시지 표시
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [enabled]);
}
