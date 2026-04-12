"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "pocketgoods-design-draft";
const SESSION_STORAGE_KEY = "pocketgoods-design-draft-session";
const MAX_LOCAL_STORAGE_CHARS = 4_000_000;

export interface SavedDraft {
  canvasJSON: object;
  thumbnail: string;
  productType: string;
  savedAt: string; // ISO string
}

export function useSaveDesign(
  getJSON: () => object,
  getDataURL: () => string,
  productType: string
) {
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);

  // 저장된 드래프트 로드
  const loadDraft = useCallback((): SavedDraft | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as SavedDraft;
    } catch {
      return null;
    }
  }, []);

  // 수동 저장
  const save = useCallback(() => {
    try {
      const draft: SavedDraft = {
        canvasJSON: getJSON(),
        thumbnail: getDataURL(),
        productType,
        savedAt: new Date().toISOString(),
      };
      const serialized = JSON.stringify(draft);
      try {
        if (serialized.length > MAX_LOCAL_STORAGE_CHARS) {
          throw new DOMException("Draft exceeds localStorage safety limit", "QuotaExceededError");
        }
        localStorage.setItem(STORAGE_KEY, serialized);
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        setSaveWarning(null);
      } catch (storageError) {
        localStorage.removeItem(STORAGE_KEY);
        try {
          sessionStorage.setItem(SESSION_STORAGE_KEY, serialized);
          setSaveWarning(
            "사진 용량이 커서 임시 저장소에만 저장했어요. 브라우저 탭을 닫기 전 주문/다운로드를 완료해주세요.",
          );
        } catch {
          setSaveWarning(
            "사진 용량이 커서 자동 저장을 건너뛰었어요. 주문/다운로드는 계속 사용할 수 있습니다.",
          );
          console.warn("Draft storage skipped:", storageError);
        }
      }
      const now = new Date();
      setSavedAt(now);
      setIsDirty(false);
    } catch (e) {
      console.error("저장 실패:", e);
    }
  }, [getJSON, getDataURL, productType]);

  // 드래프트 삭제
  const clearDraft = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setSavedAt(null);
    setIsDirty(false);
    setSaveWarning(null);
  }, []);

  // 변경 감지 — dirty 표시
  const markDirty = useCallback(() => setIsDirty(true), []);

  // 자동 저장 — 30초마다 (dirty 상태일 때만)
  useEffect(() => {
    if (!isDirty) return;
    const timer = setInterval(() => {
      save();
    }, 30_000);
    return () => clearInterval(timer);
  }, [isDirty, save]);

  // Ctrl+S 단축키
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [save]);

  return { save, loadDraft, clearDraft, markDirty, savedAt, isDirty, saveWarning };
}
