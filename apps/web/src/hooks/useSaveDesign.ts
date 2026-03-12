"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "pocketgoods-design-draft";

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

  // 저장된 드래프트 로드
  const loadDraft = useCallback((): SavedDraft | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
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
    setSavedAt(null);
    setIsDirty(false);
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

  return { save, loadDraft, clearDraft, markDirty, savedAt, isDirty };
}
