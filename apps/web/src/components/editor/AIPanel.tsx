"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  Upload,
  Loader2,
  ImagePlus,
  LogIn,
  X,
  Flame,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useLocale, tpl } from "@/lib/i18n/client";
import { useImagePreprocessor } from "@/hooks/useImagePreprocessor";
import { STYLE_FEED_ITEMS, STYLE_FEED_PAGE_SIZE, type Style, type StyleFeedItem } from "@/lib/ai-style-feed";

interface AIPanelProps {
  onGetCanvasImage: () => string;
  onAddGeneratedImage: (src: string) => void;
  compact?: boolean;
}

type Mode = "prompt-only" | "from-canvas" | "from-upload";

type AIPanelDraft = {
  mode: Mode;
  style: Style;
  prompt: string;
  activeFeedId: string | null;
  feedPage: number;
  promptExpanded: boolean;
  uploadedPreview: string | null;
  uploadedFileName: string;
  uploadedFileType: string;
  result: string | null;
  fallbackMessage: string | null;
  remaining: { count: number; limit: number } | null;
  loading: boolean;
  error: string | null;
  validationHint: string | null;
  showLoginPrompt: boolean;
  showDailyLimitReached: boolean;
};

const AI_PANEL_DRAFT_STORAGE_KEY = "pocketgoods-ai-panel-draft-v1";

const DEFAULT_AI_PANEL_DRAFT: AIPanelDraft = {
  mode: "from-upload",
  style: "custom",
  prompt: "",
  activeFeedId: null,
  feedPage: 0,
  promptExpanded: false,
  uploadedPreview: null,
  uploadedFileName: "upload.png",
  uploadedFileType: "image/png",
  result: null,
  fallbackMessage: null,
  remaining: null,
  loading: false,
  error: null,
  validationHint: null,
  showLoginPrompt: false,
  showDailyLimitReached: false,
};

let aiPanelDraft: AIPanelDraft = { ...DEFAULT_AI_PANEL_DRAFT };
let aiPanelDraftLoaded = false;
let aiGenerationPromise: Promise<void> | null = null;
const aiPanelSubscribers = new Set<(draft: AIPanelDraft) => void>();

function readStoredAIPanelDraft(): AIPanelDraft {
  if (typeof window === "undefined") return aiPanelDraft;
  if (aiPanelDraftLoaded) return aiPanelDraft;
  aiPanelDraftLoaded = true;
  try {
    const raw = sessionStorage.getItem(AI_PANEL_DRAFT_STORAGE_KEY);
    if (raw) {
      aiPanelDraft = {
        ...DEFAULT_AI_PANEL_DRAFT,
        ...JSON.parse(raw),
        loading: aiGenerationPromise ? aiPanelDraft.loading : false,
      };
    }
  } catch {
    aiPanelDraft = { ...DEFAULT_AI_PANEL_DRAFT };
  }
  return aiPanelDraft;
}

function persistAIPanelDraft(draft: AIPanelDraft) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(AI_PANEL_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Large data URLs can exceed storage quota. In-memory state still protects
    // drawer/tab transitions in the current session.
  }
}

function updateAIPanelDraft(patch: Partial<AIPanelDraft>) {
  aiPanelDraft = { ...readStoredAIPanelDraft(), ...patch };
  persistAIPanelDraft(aiPanelDraft);
  aiPanelSubscribers.forEach((subscriber) => subscriber(aiPanelDraft));
}

function subscribeAIPanelDraft(subscriber: (draft: AIPanelDraft) => void) {
  aiPanelSubscribers.add(subscriber);
  return () => {
    aiPanelSubscribers.delete(subscriber);
  };
}

function isAiGenerationRunning() {
  return aiGenerationPromise !== null;
}

function startAiGeneration(promise: Promise<void>) {
  aiGenerationPromise = promise.finally(() => {
    aiGenerationPromise = null;
    updateAIPanelDraft({ loading: false });
  });
}

export default function AIPanel({
  onGetCanvasImage,
  onAddGeneratedImage,
  compact = false,
}: AIPanelProps) {
  const { t } = useLocale();
  const e = t.editor;
  const ip = t.imageProcessing;

  const {
    processFile,
    processing: preprocessing,
    currentStep,
    errors: preprocessErrors,
    reset: resetPreprocess,
  } = useImagePreprocessor();

  const [draft, setDraft] = useState<AIPanelDraft>(() => readStoredAIPanelDraft());
  const {
    mode,
    style,
    prompt,
    activeFeedId,
    feedPage,
    promptExpanded,
    uploadedPreview,
    uploadedFileName,
    uploadedFileType,
    result,
    fallbackMessage,
    remaining,
    loading,
    error,
    validationHint,
    showLoginPrompt,
    showDailyLimitReached,
  } = draft;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const feedScrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeAIPanelDraft(setDraft), []);

  const activeFeed = useMemo(
    () => STYLE_FEED_ITEMS.find((item) => item.id === activeFeedId) ?? null,
    [activeFeedId],
  );
  const feedPageCount = Math.ceil(STYLE_FEED_ITEMS.length / STYLE_FEED_PAGE_SIZE);
  const visibleFeedItems = useMemo(
    () =>
      STYLE_FEED_ITEMS.slice(
        feedPage * STYLE_FEED_PAGE_SIZE,
        feedPage * STYLE_FEED_PAGE_SIZE + STYLE_FEED_PAGE_SIZE,
      ),
    [feedPage],
  );

  const finalPrompt = useMemo(() => {
    if (activeFeed) {
      const extraPrompt = prompt.trim();
      return extraPrompt
        ? `${activeFeed.basePrompt}\n\n추가 요청: ${extraPrompt}`
        : activeFeed.basePrompt;
    }
    return prompt.trim();
  }, [activeFeed, prompt]);

  const handleUpload = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;

    resetPreprocess();
    const processed = await processFile(file);
    if (!processed) return;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error ?? new Error("이미지 읽기에 실패했습니다."));
      reader.readAsDataURL(processed.file);
    });

    updateAIPanelDraft({
      uploadedPreview: dataUrl,
      uploadedFileName: processed.file.name || file.name || "upload.png",
      uploadedFileType: processed.file.type || file.type || "image/png",
      mode: "from-upload",
      error: null,
      validationHint: null,
    });
  };

  const handleSelectFeedItem = (item: StyleFeedItem) => {
    if (activeFeedId === item.id) {
      updateAIPanelDraft({
        activeFeedId: null,
        style: "custom",
        promptExpanded: true,
        error: null,
        validationHint: "스타일 선택을 해제했어요. 프롬프트를 입력해 자유롭게 생성할 수 있습니다.",
      });
      return;
    }
    updateAIPanelDraft({
      activeFeedId: item.id,
      style: item.style,
      prompt: "",
      promptExpanded: false,
      error: null,
      validationHint: null,
    });
  };

  const scrollCompactFeed = (direction: "prev" | "next") => {
    const scroller = feedScrollerRef.current;
    if (!scroller) return;
    const delta = scroller.clientWidth * 0.82 * (direction === "next" ? 1 : -1);
    scroller.scrollBy({ left: delta, behavior: "smooth" });
  };

  const handleGenerate = async () => {
    if (isAiGenerationRunning()) {
      updateAIPanelDraft({ validationHint: "이미 생성이 진행 중이에요. 잠시만 기다려주세요." });
      return;
    }
    const validationMessage = getGenerateValidationMessage();
    if (validationMessage) {
      updateAIPanelDraft({ validationHint: validationMessage });
      return;
    }

    updateAIPanelDraft({
      loading: true,
      error: null,
      result: null,
      fallbackMessage: null,
      showLoginPrompt: false,
      showDailyLimitReached: false,
      validationHint: null,
    });

    startAiGeneration((async () => {
      const formData = new FormData();
      formData.append("prompt", finalPrompt);
      formData.append("style", activeFeed ? style : "custom");

      if (mode === "from-canvas") {
        const dataURL = onGetCanvasImage();
        const res = await fetch(dataURL);
        const blob = await res.blob();
        formData.append("canvas_image", blob, "canvas.png");
      }

      if (mode === "from-upload" && uploadedPreview) {
        const uploadBlob = await fetch(uploadedPreview).then((res) => res.blob());
        formData.append(
          "upload_image",
          uploadBlob,
          uploadedFileName || `upload.${uploadedFileType.includes("jpeg") ? "jpg" : "png"}`,
        );
      }

      const headers: HeadersInit = {};
      const supabase = createClient();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/generate-image`,
        {
          method: "POST",
          body: formData,
          headers,
        },
      );

      if (!response.ok) {
        if (response.status === 429) {
          const err = await response.json();

          if (err.login_required) {
            updateAIPanelDraft({ showLoginPrompt: true });
            return;
          }

          const detail = err.detail ?? "";
          if (
            err.server_busy ||
            detail.includes("일시적") ||
            detail.toLowerCase().includes("temporarily")
          ) {
            updateAIPanelDraft({ error: e.serverBusy ?? "서버가 일시적으로 혼잡합니다." });
            return;
          }

          updateAIPanelDraft({ showDailyLimitReached: true });
          return;
        }

        const err = await response.json();
        throw new Error(err.detail ?? e.generateFailed ?? "생성 실패");
      }

      const data = await response.json();

      updateAIPanelDraft({
        result: data.image,
        remaining: data.remaining !== undefined && data.daily_limit !== undefined
          ? {
          count: data.remaining,
          limit: data.daily_limit,
            }
          : remaining,
        fallbackMessage: data.fallback ? data.fallback_message ?? e.fallbackDefault : null,
      });
    })()
      .catch((err) => {
        updateAIPanelDraft({
          error: err instanceof Error ? err.message : e.errorFallback ?? "오류가 발생했습니다.",
        });
      }));
  };

  const getGenerateValidationMessage = () => {
    if (activeFeed && !uploadedPreview) return "스타일 변환은 기준 사진이 필요해요. 먼저 사진을 업로드해주세요.";
    if (!activeFeed && !prompt.trim()) return "스타일을 선택하지 않은 경우 만들고 싶은 이미지를 프롬프트로 입력해주세요.";
    return null;
  };

  const generateValidationMessage = getGenerateValidationMessage();

  useEffect(() => {
    updateAIPanelDraft({ validationHint: generateValidationMessage });
  }, [generateValidationMessage]);

  return (
    <div
      className={`flex flex-col ${
        compact ? "gap-3 p-3" : "h-full gap-4 overflow-y-auto p-4"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-semibold">{e.aiTitle ?? "AI 이미지 생성"}</span>
        </div>

        {remaining && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              remaining.count <= 2
                ? "bg-red-50 text-red-600"
                : "bg-zinc-100 text-zinc-500"
            }`}
          >
            {tpl(e.remaining, { count: remaining.count, limit: remaining.limit })}
          </span>
        )}
      </div>

      <section className="relative rounded-3xl border border-zinc-200/80 bg-gradient-to-b from-zinc-50 to-white p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="min-w-0 space-y-0.5">
            <Label className="inline-flex items-center gap-1 text-xs font-extrabold">
              <Flame className="size-3.5 text-orange-500" />
              요즘 뜨는
              <span className="rounded-full bg-orange-50 px-1.5 py-0.5 text-[9px] font-bold text-orange-600">
                추천
              </span>
            </Label>
            <p className="text-[10px] text-muted-foreground">
              {activeFeed ? "선택된 스타일을 다시 누르면 해제돼요" : "인기 스타일을 모아뒀어요."}
            </p>
          </div>
          {!activeFeed && !compact && (
            <div className="text-[10px] font-semibold text-zinc-400">
              {feedPage + 1}/{feedPageCount}
            </div>
          )}
        </div>

        {activeFeed && (
          <button
            type="button"
            onClick={() => {
              updateAIPanelDraft({
                activeFeedId: null,
                style: "custom",
                promptExpanded: true,
                validationHint: "스타일 선택을 해제했어요. 프롬프트를 입력해 자유롭게 생성할 수 있습니다.",
              });
            }}
            className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white p-2 text-left shadow-sm"
          >
            <div className="relative h-44 overflow-hidden rounded-xl">
              <Image src={activeFeed.preview} alt={`${activeFeed.title} 선택됨`} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 rounded-2xl bg-white/95 px-3 py-2 text-center shadow-sm">
                <p className="text-sm font-bold">{activeFeed.title}</p>
                <p className="mt-0.5 text-[10px] text-zinc-500">다시 누르거나 이 영역을 누르면 선택 해제</p>
              </div>
            </div>
          </button>
        )}

        {!activeFeed && compact && (
          <div className="relative mt-3">
            <button
              type="button"
              onClick={() => scrollCompactFeed("prev")}
              className="absolute -left-2 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-zinc-200 bg-white/95 text-zinc-700 shadow-md backdrop-blur"
              aria-label="이전 추천 스타일 보기"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollCompactFeed("next")}
              className="absolute -right-2 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-zinc-200 bg-white/95 text-zinc-700 shadow-md backdrop-blur"
              aria-label="다음 추천 스타일 보기"
            >
              <ChevronRight className="size-4" />
            </button>
            <div
              ref={feedScrollerRef}
              className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              role="listbox"
              aria-label="AI 이미지 스타일 피드"
            >
              {STYLE_FEED_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectFeedItem(item)}
                  className="group relative h-36 min-w-[74%] snap-center select-none overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left shadow-sm transition-all active:scale-[0.98]"
                  aria-pressed={activeFeedId === item.id}
                >
                  <Image
                    src={item.preview}
                    alt={`${item.title} 미리보기`}
                    fill
                    sizes="80vw"
                    loading={item.id === "sylvanian" ? "eager" : "lazy"}
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-white/0" />
                  <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 shadow-sm backdrop-blur">
                    {item.kicker}
                  </div>
                  <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
                    <p className="text-center text-sm font-extrabold leading-tight">{item.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-center text-[10px] text-zinc-500">{item.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!activeFeed && !compact && (
          <div className="relative mt-3">
            {feedPage > 0 && (
              <button
                type="button"
                onClick={() => updateAIPanelDraft({ feedPage: Math.max(0, feedPage - 1) })}
                className="absolute -left-2 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full border border-zinc-200 bg-white/95 text-zinc-700 shadow-md backdrop-blur transition hover:-translate-x-0.5 hover:bg-white"
                aria-label="이전 추천 스타일 보기"
              >
                <ChevronLeft className="size-4" />
              </button>
            )}
            {feedPage < feedPageCount - 1 && (
              <button
                type="button"
                onClick={() => updateAIPanelDraft({ feedPage: Math.min(feedPageCount - 1, feedPage + 1) })}
                className="absolute -right-2 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full border border-zinc-200 bg-white/95 text-zinc-700 shadow-md backdrop-blur transition hover:translate-x-0.5 hover:bg-white"
                aria-label="다음 추천 스타일 보기"
              >
                <ChevronRight className="size-4" />
              </button>
            )}
            <div className="grid grid-cols-2 gap-2" role="listbox" aria-label="AI 이미지 스타일 피드">
              {visibleFeedItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectFeedItem(item)}
                  className="group relative h-28 select-none overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-lg"
                  aria-pressed={activeFeedId === item.id}
                >
                  <Image
                    src={item.preview}
                    alt={`${item.title} 미리보기`}
                    fill
                    sizes="120px"
                    loading={item.id === "sylvanian" ? "eager" : "lazy"}
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-white/0" />
                  <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-semibold text-zinc-700 shadow-sm backdrop-blur">
                    {item.kicker}
                  </div>
                  <div className="absolute inset-x-2 bottom-2 rounded-xl bg-white/95 px-2 py-1.5 shadow-sm backdrop-blur">
                    <p className="text-center text-xs font-bold leading-tight">{item.title}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-1.5">
        <ModeButton
          active={mode === "from-upload"}
          icon={<Upload className="h-3.5 w-3.5" />}
          label={e.modeUpload ?? "사진 업로드"}
          onClick={() => {
            updateAIPanelDraft({ mode: "from-upload" });
            fileInputRef.current?.click();
          }}
        />
      </div>

      {mode === "from-upload" && preprocessing && (
        <div
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-zinc-200 ${
            compact ? "mx-auto h-32 w-32" : "aspect-square w-full"
          }`}
        >
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-[10px] text-muted-foreground">
            {currentStep === "converting"
              ? ip.converting
              : currentStep === "compressing"
                ? ip.compressing
                : ip.processing}
          </p>
        </div>
      )}

      {mode === "from-upload" && !preprocessing && uploadedPreview && (
        <div
          className={`relative cursor-pointer overflow-hidden rounded-lg border border-zinc-200 ${
            compact ? "mx-auto h-32 w-32" : "aspect-square w-full"
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <Image src={uploadedPreview} alt={e.uploadPreviewAlt} fill className="object-contain" />
          <span className="absolute inset-x-0 bottom-1 text-center text-[10px] text-zinc-500">
            {e.uploadChangeHint ?? "클릭해서 변경"}
          </span>
        </div>
      )}

      {preprocessErrors.length > 0 && (
        <div className="space-y-1 rounded-lg bg-red-50 p-2">
          {preprocessErrors.map((err) => (
            <p key={err.type} className="text-[10px] text-red-500">
              {err.type === "file-too-large"
                ? tpl(ip.fileTooLarge, { maxMB: 20 })
                : err.type === "file-too-small"
                  ? tpl(ip.imageTooSmall, { minPx: 200 })
                  : err.type === "unsupported-type"
                    ? ip.unsupportedFormat
                    : ip.invalidImage}
            </p>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={handleUpload}
      />

      <div className="space-y-2">
        {activeFeed && !promptExpanded ? (
          <button
            type="button"
            onClick={() => updateAIPanelDraft({ promptExpanded: true })}
            className="flex w-full items-center justify-between rounded-2xl border border-dashed border-zinc-300 bg-white px-3 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-400 hover:shadow-md"
          >
            <span className="min-w-0">
              <span className="block text-xs font-semibold">+ 추가 프롬프트 입력하기</span>
              <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                {prompt.trim() || `${activeFeed.title} 기본 프롬프트로 바로 생성돼요`}
              </span>
            </span>
            <Plus className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        ) : (
          <div className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <Label className="text-xs">
                {activeFeed
                  ? e.promptLabelExtra ?? "추가 프롬프트 입력하기"
                  : e.promptLabel ?? "어떤 캐릭터를 만들까요?"}
              </Label>
              {activeFeed && (
                <button
                  type="button"
                  onClick={() => updateAIPanelDraft({ promptExpanded: false })}
                  className="text-[10px] font-medium text-muted-foreground hover:text-foreground"
                >
                  최소화
                </button>
              )}
            </div>

            <Textarea
              value={prompt}
              onChange={(ev) => updateAIPanelDraft({ prompt: ev.target.value })}
              placeholder={
                activeFeed
                  ? e.promptPlaceholderExtra ?? "원하는 디테일을 추가로 입력하세요 (선택)"
                  : e.promptPlaceholder ?? "졸린 표정으로 하품하는 캐릭터"
              }
              className="resize-none text-sm"
              rows={activeFeed ? 2 : 3}
            />
          </div>
        )}
      </div>

      {validationHint && (
        <p className="rounded-xl bg-amber-50 p-2 text-[11px] text-amber-700">{validationHint}</p>
      )}

      {loading && (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="relative h-2 bg-zinc-100">
            <div className="absolute inset-y-0 left-0 w-1/2 animate-[pulse_1.2s_ease-in-out_infinite] rounded-r-full bg-zinc-950" />
            <div className="absolute inset-y-0 left-0 w-full animate-[pulse_1.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-zinc-300/80 to-transparent" />
          </div>
          <div className="space-y-2 p-3">
            <div className="flex items-center gap-2">
              <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white">
                <Sparkles className="size-4 animate-pulse" />
                <span className="absolute inset-0 animate-ping rounded-full bg-zinc-950/20" />
              </span>
              <div>
                <p className="text-xs font-extrabold">Gemini에 요청을 보냈어요</p>
                <p className="text-[10px] text-zinc-500">탭을 닫거나 내려도 생성은 계속 진행됩니다.</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-[10px] font-semibold text-zinc-500">
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-center">요청 전송</span>
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-center">이미지 생성</span>
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-center">배경 정리</span>
            </div>
          </div>
        </div>
      )}

      <Button
        className={`h-10 w-full rounded-xl shadow-sm ${
          generateValidationMessage
            ? "bg-zinc-200 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-400"
            : ""
        }`}
        onClick={handleGenerate}
        disabled={loading || Boolean(generateValidationMessage)}
        title={generateValidationMessage ?? undefined}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {e.generating ?? "이미지 생성 중…"}
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            {e.generateBtn ?? "생성하기"}
          </>
        )}
      </Button>

      {showDailyLimitReached && (
        <div className="relative space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <button
            type="button"
            onClick={() => updateAIPanelDraft({ showDailyLimitReached: false })}
            className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-800">
              {e.limitTitle ?? "오늘 생성 한도를 모두 사용했습니다"}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-amber-700">
            {e.limitDesc}
            <br />
            {e.limitSuffix}
          </p>
        </div>
      )}

      {showLoginPrompt && (
        <div className="relative space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <button
            type="button"
            onClick={() => updateAIPanelDraft({ showLoginPrompt: false })}
            className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span className="text-sm font-semibold">
              {e.loginTitle ?? "더 많이 만들어보세요!"}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {e.loginDesc}
            <br />
            {e.loginPrefix}
            <span className="font-semibold text-primary">{e.loginBenefit}</span>
            {e.loginSuffix}
          </p>
          <Link
            href="/login?next=/design"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors"
          >
            <LogIn className="size-4" />
            {e.loginBtn ?? "로그인하기"}
          </Link>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 p-2 text-xs text-red-500">{error}</p>}

      {result && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label className="text-xs">{e.generatedLabel ?? "생성된 이미지"}</Label>

            {fallbackMessage && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] text-amber-700">
                {fallbackMessage}
              </p>
            )}

            <div
              className={`relative overflow-hidden rounded-lg border border-zinc-200 bg-[url('/checkerboard.svg')] ${
                compact ? "mx-auto h-40 w-40" : "aspect-square w-full"
              }`}
            >
              <Image
                src={result}
                alt={e.generatedAlt ?? "AI 생성 결과"}
                fill
                className="object-contain"
              />
            </div>

            <Button variant="outline" className="w-full" onClick={() => onAddGeneratedImage(result)}>
              <ImagePlus className="mr-2 h-4 w-4" />
              {e.addToCanvas ?? "캔버스에 추가"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function ModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-[10px] transition-all ${
        active
          ? "border-zinc-950 bg-zinc-950 text-white shadow-sm"
          : "border-zinc-200 bg-white text-zinc-600 shadow-sm hover:-translate-y-0.5 hover:border-zinc-300 hover:text-zinc-950"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
