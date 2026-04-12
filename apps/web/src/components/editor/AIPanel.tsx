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
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLocale, tpl } from "@/lib/i18n/client";
import { useImagePreprocessor } from "@/hooks/useImagePreprocessor";

interface AIPanelProps {
  onGetCanvasImage: () => string;
  onAddGeneratedImage: (src: string) => void;
  compact?: boolean;
}

type Mode = "prompt-only" | "from-canvas" | "from-upload";

type Style = "everskies" | "sylvanian" | "maplestory" | "minimi" | "custom";

type StyleFeedItem = {
  id: string;
  kicker: string;
  title: string;
  description: string;
  style: Style;
  preview: string;
  basePrompt: string;
};

const STYLE_FEED_ITEMS: StyleFeedItem[] = [
  {
    id: "everskies",
    kicker: "OOTD 아바타",
    title: "EverSkies 만들기",
    description: "패션 아바타처럼 또렷하고 트렌디하게",
    style: "everskies",
    preview: "/ai-feed-previews/everskies.svg",
    basePrompt:
      "Everskies 아바타 감성의 패션 일러스트로 변환해주세요. 트렌디한 의상 레이어링, 또렷한 메이크업, 선명한 외곽선과 현대적인 색 조합을 살리고 원본의 헤어·의상·액세서리 특징은 유지해주세요. 배경은 투명으로 유지해주세요.",
  },
  {
    id: "sylvanian",
    kicker: "포근한 인형",
    title: "실바니안 만들기",
    description: "보송한 인형 질감과 순한 표정",
    style: "sylvanian",
    preview: "/ai-feed-previews/sylvanian.svg",
    basePrompt:
      "실바니안 인형 감성으로 변환해주세요. 보송한 플록 질감, 둥글고 순한 얼굴, 따뜻한 톤의 의상과 작은 소품 디테일을 살리고 원본의 핵심 특징은 귀엽게 재해석해주세요. 배경은 투명으로 유지해주세요.",
  },
  {
    id: "maplestory",
    kicker: "픽셀 RPG",
    title: "메이플 만들기",
    description: "스티커에 잘 어울리는 귀여운 픽셀 캐릭터",
    style: "maplestory",
    preview: "/ai-feed-previews/maplestory.svg",
    basePrompt:
      "메이플스토리 인게임 캐릭터 감성의 귀여운 2D 픽셀 RPG 아바타로 변환해주세요. 큰 눈, 작은 몸, 선명한 색감, 헤어스타일과 의상·액세서리의 특징을 반영하고 스티커처럼 또렷한 외곽을 유지해주세요. 배경은 투명으로 유지해주세요.",
  },
  {
    id: "minimi",
    kicker: "미니 스티커",
    title: "미니미 만들기",
    description: "작고 단순한 굿즈용 미니 캐릭터",
    style: "minimi",
    preview: "/ai-feed-previews/minimi.svg",
    basePrompt:
      "미니미 굿즈 캐릭터로 변환해주세요. 작고 단순한 비율, 동글동글한 얼굴과 짧은 팔다리, 깔끔한 라인, 부드러운 파스텔 색감으로 표현하고 원본의 헤어·의상 특징은 알아볼 수 있게 유지해주세요. 배경은 투명으로 유지해주세요.",
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
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/generate-image`,
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
          <div className="mt-3 grid grid-cols-2 gap-2" role="listbox" aria-label="AI 이미지 스타일 피드">
            {STYLE_FEED_ITEMS.slice(0, 4).map((item) => (
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
                    loading={item.id === "everskies" ? "eager" : "lazy"}
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
