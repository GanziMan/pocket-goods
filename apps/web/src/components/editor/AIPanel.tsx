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

interface AIPanelProps {
  onGetCanvasImage: () => string;
  onAddGeneratedImage: (src: string) => void;
  compact?: boolean;
}

type Mode = "prompt-only" | "from-canvas" | "from-upload";

type Style =
  | "everskies"
  | "sylvanian"
  | "animal-crossing"
  | "ios-emoji"
  | "maplestory"
  | "tanning-kitty"
  | "snoopy"
  | "snowglobe"
  | "custom";

type StyleFeedItem = {
  id: string;
  kicker: string;
  title: string;
  description: string;
  style: Style;
  preview: string;
  basePrompt: string;
};

const BACKGROUND_REMOVAL_PROMPT =
  "각 스타일은 최종 결과에서 배경이 제거되어야 하며 투명 PNG처럼 인물/캐릭터만 남겨주세요. 첨부된 이미지를 최대한 적극적으로 활용하고, 헤어스타일·의상·가방·액세서리·로고·문양이 있다면 가능한 한 똑같이 반영해주세요. 고화질로, 발끝까지 보이는 전신 또는 요청한 구도로 완성해주세요.";

const STYLE_FEED_PAGE_SIZE = 4;

const STYLE_FEED_ITEMS: StyleFeedItem[] = [
  {
    id: "sylvanian",
    kicker: "포근한 인형",
    title: "실바니안 만들기",
    description: "보송한 인형 질감과 순한 표정",
    style: "sylvanian",
    preview: "/ai-feed-previews/sylvanian.svg",
    basePrompt:
      `Transform the person in this photo into a Sylvanian Families (Calico Critters) animal figure. Convert them into a cute anthropomorphic animal & 🗳(choose an animal that best matches their vibe: a tiny cute beige bunny, rabbit, cat, puppy, bear) 🗳wearing a detailed miniature outfit that matches their original clothing. The figure have the signature Sylvanian look: soft flocked fur texture, tiny black dot eyes, a small pink nose, and a gentle expression. The figure should be isolated and centered on a plain, solid white background with neutral studio lighting. No furniture, no background elements, and no dollhouse decor.\n\n${BACKGROUND_REMOVAL_PROMPT}`,
  },
  {
    id: "everskies",
    kicker: "전신 픽셀",
    title: "픽셀",
    description: "Everskies 감성의 전신 픽셀 아트",
    style: "everskies",
    preview: "/ai-feed-previews/everskies.svg",
    basePrompt:
      `Everskies 스타일의 전신 픽셀 아트 일러스트를 만들어줘. 인물의 체형, 얼굴 표정, 복장과 헤어 스타일의 표현 방식을 모방해줘. 첨부한 이미지 속 인물의 헤어 스타일, 의상, 액세서리를 사용하여 발까지 나오게 인물 일러스트를 그려줘.\n\n${BACKGROUND_REMOVAL_PROMPT}`,
  },
  {
    id: "animal-crossing",
    kicker: "따뜻한 3D",
    title: "동물의 숲",
    description: "밝은 햇빛과 부드러운 그림자의 3D 캐릭터",
    style: "animal-crossing",
    preview: "/ai-feed-previews/animal-crossing.svg",
    basePrompt:
      `닌텐도 스위치 게임 동물의 숲 스타일의 3D 캐릭터 일러스트 화풍을 공부하고, 그 스타일의 이목구비, 의상. 헤어스타일을 따라 하는 얼굴 표현방식을 따라해. 첨부한 이미지 속 인물의 헤어스타일과 옷, 액세서리로 인물 일러스트를 그려줘. 배경은 투명하게 해줘. 자연광 아래의 밝은 햇빛과 부드러운 그림자 효과를 사용해 따뜻하고 발랄한 분위기로 만들어 줘. 실제 동물의숲 플레이 화면에 등장하는 캐릭터처럼 보여야 해, 3D인 점을 명확하게 보여줘.\n\n${BACKGROUND_REMOVAL_PROMPT}`,
  },
  {
    id: "ios-emoji",
    kicker: "3D 이모지",
    title: "iOS 이모지",
    description: "말랑한 표면 질감의 공식 이모지 느낌",
    style: "ios-emoji",
    preview: "/ai-feed-previews/ios-emoji.svg",
    basePrompt:
      `사진 속 인물을 애플 ios 이모지 스타일의 3D 배경화면 캐릭터로 만들어줘. 이목구비, 피부색, 표정, 표면 질감 등을 모방하고, 헤어 스타일, 머리 장식, 의상, 포즈까지 그대로 반영해줘. 배경은 투명색이며, 최종 이미지가 ios 공식 이모지처럼 보이게 해줘.\n\n${BACKGROUND_REMOVAL_PROMPT}`,
  },
  {
    id: "maplestory",
    kicker: "픽셀 RPG",
    title: "메이플 만들기",
    description: "스티커에 잘 어울리는 귀여운 픽셀 캐릭터",
    style: "maplestory",
    preview: "/ai-feed-previews/maplestory.svg",
    basePrompt:
      `메이플스토리 인게임 캐릭터의 픽셀 캐릭터 느낌으로 만들어줘. 이목구비, 의상, 헤어스타일을 반영한 얼굴표현을 해줘. 스타일, 옷 액세서리는 첨부한 사진을 그대로 반영해줘. 배경은 흰색으로 이미지를 만들어줘.\n\n${BACKGROUND_REMOVAL_PROMPT}`,
  },
  {
    id: "tanning-kitty",
    kicker: "라떼 태닝",
    title: "태닝키티",
    description: "귀엽고 단순한 산리오풍 2D 캐릭터",
    style: "tanning-kitty",
    preview: "/ai-feed-previews/tanning-kitty.svg",
    basePrompt:
      `첨부 사진을 아래 요청 스타일에 맞춰서 2D 캐릭터화해줘. 헬로키티 스타일로 원작의 얼굴과 몸 비율, 윤곽선은 그대로 유지해줘. 피부색은 밝은 라떼색, 햇볕에 건강하게 그을린 느낌으로 변경해줘 (지나치게 어두운 색은 피함). 원래의 리본, 액세서리, 옷은 사진 스타일에 맞게 조정해줘. 사용자 사진을 참고해서 헤어스타일과 옷 스타일은 그대로 반영해줘. 전체적으로 귀엽고 단순한 산리오 스타일 유지해주고 배경은 투명하게 만들어줘.\n\n${BACKGROUND_REMOVAL_PROMPT}`,
  },
  {
    id: "snoopy",
    kicker: "피너츠 3D",
    title: "스누피",
    description: "Peanuts 감성 3D와 스누피 캐릭터",
    style: "snoopy",
    preview: "/ai-feed-previews/snoopy.svg",
    basePrompt:
      `업로드한 이미지를 Peanuts-style 3d art로 변경해줘. 배경과 옷은 원본 이미지와 비슷하게 표현해주고 스타일만 바꿔줘. png 파일로 저장해주고 그 옆에 스누피 캐릭터 형태도 그대로 그려줘.\n\n${BACKGROUND_REMOVAL_PROMPT}`,
  },
  {
    id: "snowglobe",
    kicker: "아이소메트릭",
    title: "스노우볼",
    description: "귀엽고 고급스러운 3D 스노우볼",
    style: "snowglobe",
    preview: "/ai-feed-previews/snowglobe.svg",
    basePrompt:
      `이미지를 귀엽고 아기같은 차비 스타일의 3D 캐릭터로 만들어줘. 이걸 아이소메트릭 스타일로 만들어줘. 깔끔하고 미니멀한 스타일이어야해. 테마는 첨부 사진의 분위기와 인물에게 가장 잘 어울리는 콘셉트로 최대한 구체적으로 정해줘. 이제 이 사진으로 나만의 3D 스노우볼을 만들어줘. 캐릭터는 스노우볼 중앙에 배치해주고 스노우볼 배경색은 인물의 옷과 가장 잘 어울리는 색으로 해줘. 어울리는 소품도 추가해줘. 귀엽고 고급스럽게 만들어줘. 스노우 볼 안에 물방울처럼 떠다니는 스노우 입자 효과 넣어줘. 오르골 바닥에는 인물에게 어울리는 짧은 이름이나 문구를 필기체로 적어줘.\n\n${BACKGROUND_REMOVAL_PROMPT}`,
  },
];

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

  const [mode, setMode] = useState<Mode>("from-upload");
  const [style, setStyle] = useState<Style>("custom");
  const [prompt, setPrompt] = useState("");
  const [activeFeedId, setActiveFeedId] = useState<string | null>(null);
  const [feedPage, setFeedPage] = useState(0);
  const [promptExpanded, setPromptExpanded] = useState(false);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);

  const [result, setResult] = useState<string | null>(null);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<{ count: number; limit: number } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationHint, setValidationHint] = useState<string | null>(null);

  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showDailyLimitReached, setShowDailyLimitReached] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

    if (uploadedPreview) {
      URL.revokeObjectURL(uploadedPreview);
    }

    setUploadedFile(processed.file);
    setUploadedPreview(URL.createObjectURL(processed.file));
    setMode("from-upload");
  };

  const handleSelectFeedItem = (item: StyleFeedItem) => {
    if (activeFeedId === item.id) {
      setActiveFeedId(null);
      setStyle("custom");
      setPromptExpanded(true);
      setError(null);
      setValidationHint("스타일 선택을 해제했어요. 프롬프트를 입력해 자유롭게 생성할 수 있습니다.");
      return;
    }
    setActiveFeedId(item.id);
    setStyle(item.style);
    setPrompt("");
    setPromptExpanded(false);
    setError(null);
    setValidationHint(null);
  };

  const handleGenerate = async () => {
    const validationMessage = getGenerateValidationMessage();
    if (validationMessage) {
      setValidationHint(validationMessage);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setFallbackMessage(null);
    setShowLoginPrompt(false);
    setShowDailyLimitReached(false);

    try {
      const formData = new FormData();
      formData.append("prompt", finalPrompt);
      formData.append("style", activeFeed ? style : "custom");

      if (mode === "from-canvas") {
        const dataURL = onGetCanvasImage();
        const res = await fetch(dataURL);
        const blob = await res.blob();
        formData.append("canvas_image", blob, "canvas.png");
      }

      if (mode === "from-upload" && uploadedFile) {
        formData.append("upload_image", uploadedFile);
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
            setShowLoginPrompt(true);
            return;
          }

          const detail = err.detail ?? "";
          if (
            err.server_busy ||
            detail.includes("일시적") ||
            detail.toLowerCase().includes("temporarily")
          ) {
            setError(e.serverBusy ?? "서버가 일시적으로 혼잡합니다.");
            return;
          }

          setShowDailyLimitReached(true);
          return;
        }

        const err = await response.json();
        throw new Error(err.detail ?? e.generateFailed ?? "생성 실패");
      }

      const data = await response.json();

      setResult(data.image);

      if (data.remaining !== undefined && data.daily_limit !== undefined) {
        setRemaining({
          count: data.remaining,
          limit: data.daily_limit,
        });
      }

      if (data.fallback) {
        setFallbackMessage(data.fallback_message ?? e.fallbackDefault);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : e.errorFallback ?? "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const getGenerateValidationMessage = () => {
    if (activeFeed && !uploadedFile) return "스타일 변환은 기준 사진이 필요해요. 먼저 사진을 업로드해주세요.";
    if (!activeFeed && !prompt.trim()) return "스타일을 선택하지 않은 경우 만들고 싶은 이미지를 프롬프트로 입력해주세요.";
    return null;
  };

  const generateValidationMessage = getGenerateValidationMessage();

  useEffect(() => {
    setValidationHint(generateValidationMessage);
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
              {activeFeed ? "선택된 스타일을 다시 누르면 해제돼요" : "최대 4개 스타일을 한눈에 선택하세요"}
            </p>
          </div>
          {!activeFeed && (
            <div className="text-[10px] font-semibold text-zinc-400">
              {feedPage + 1}/{feedPageCount}
            </div>
          )}
        </div>

        {activeFeed && (
          <button
            type="button"
            onClick={() => {
              setActiveFeedId(null);
              setStyle("custom");
              setPromptExpanded(true);
              setValidationHint("스타일 선택을 해제했어요. 프롬프트를 입력해 자유롭게 생성할 수 있습니다.");
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

        {!activeFeed && (
          <div className="relative mt-3">
            {feedPage > 0 && (
              <button
                type="button"
                onClick={() => setFeedPage((page) => Math.max(0, page - 1))}
                className="absolute -left-2 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full border border-zinc-200 bg-white/95 text-zinc-700 shadow-md backdrop-blur transition hover:-translate-x-0.5 hover:bg-white"
                aria-label="이전 추천 스타일 보기"
              >
                <ChevronLeft className="size-4" />
              </button>
            )}
            {feedPage < feedPageCount - 1 && (
              <button
                type="button"
                onClick={() => setFeedPage((page) => Math.min(feedPageCount - 1, page + 1))}
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
            setMode("from-upload");
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
            onClick={() => setPromptExpanded(true)}
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
                  onClick={() => setPromptExpanded(false)}
                  className="text-[10px] font-medium text-muted-foreground hover:text-foreground"
                >
                  최소화
                </button>
              )}
            </div>

            <Textarea
              value={prompt}
              onChange={(ev) => setPrompt(ev.target.value)}
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
            onClick={() => setShowDailyLimitReached(false)}
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
            onClick={() => setShowLoginPrompt(false)}
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
