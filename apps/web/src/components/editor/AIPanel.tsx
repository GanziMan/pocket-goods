"use client";

import { useMemo, useRef, useState } from "react";
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

type Style =
  | "ghibli"
  | "sd"
  | "steampunk"
  | "fairly-odd"
  | "powerpuff"
  | "akatsuki"
  | "custom";

type StyleFeedItem = {
  id: string;
  title: string;
  style: Style;
  preview: string;
  basePrompt: string;
};

const STYLE_FEED_ITEMS: StyleFeedItem[] = [
  {
    id: "sylvanian",
    title: "실바니안 만들기",
    style: "custom",
    preview: "/logo.png",
    basePrompt:
      "Transform the person in this photo into a Sylvanian Families (Calico Critters) animal figure. Convert them into a cute anthropomorphic animal (choose an animal that best matches their vibe: tiny beige bunny, rabbit, cat, puppy, bear) wearing a detailed miniature outfit matching their original clothing. Use soft flocked fur texture, tiny black dot eyes, small pink nose, and a gentle expression. Keep the figure isolated and centered on plain white background with neutral studio lighting. No furniture, no background elements, no dollhouse decor.",
  },
  {
    id: "everskies",
    title: "Everskies 만들기",
    style: "custom",
    preview: "/logo.png",
    basePrompt:
      "1. Everskies의 픽셀 아트 스타일로 사진을 바꿔주세요. 2. 인체 비율, 얼굴 표정, 의상, 헤어스타일을 그대로 모방해주세요. 3. 첨부 사진 속 인물의 헤어스타일, 옷, 액세서리를 참고해 인물 일러스트를 그려주세요. 4. 배경은 흰색, 인물은 전신으로 그려주세요.",
  },
];

const DEFAULT_EXAMPLE_PROMPTS: Partial<Record<Style, string[]>> = {
  ghibli: ["숲속의 따뜻한 분위기", "햇살이 비치는 평화로운 장면"],
  sd: ["졸린 표정으로 하품하는", "왕관 쓰고 의기양양한", "하트 들고 수줍어하는"],
  steampunk: ["황동 장치와 톱니바퀴가 많은", "빅토리아풍 기계 도시 배경"],
  "fairly-odd": ["마법 요정 느낌으로", "채도가 높은 만화 스타일"],
  powerpuff: ["크고 동그란 눈으로", "심플한 카툰 전신 캐릭터"],
  custom: ["구도, 표정, 색감, 배경을 자세히 적어주세요"],
};

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
  const [style, setStyle] = useState<Style>("ghibli");
  const [prompt, setPrompt] = useState("");
  const [activeFeedId, setActiveFeedId] = useState<string | null>(null);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);

  const [result, setResult] = useState<string | null>(null);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<{ count: number; limit: number } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showDailyLimitReached, setShowDailyLimitReached] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeFeed = useMemo(
    () => STYLE_FEED_ITEMS.find((item) => item.id === activeFeedId) ?? null,
    [activeFeedId],
  );

  const finalPrompt = useMemo(() => {
    if (activeFeed) {
      return activeFeed.basePrompt;
    }
    return prompt.trim();
  }, [activeFeed, prompt]);

  const examplePrompts =
    e?.examplePrompts?.[style as keyof typeof e.examplePrompts] ??
    DEFAULT_EXAMPLE_PROMPTS[style] ??
    [];

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
    setActiveFeedId(item.id);
    setStyle(item.style);
    setPrompt(item.basePrompt);
    setError(null);
  };

  const handleGenerate = async () => {
    if (!finalPrompt.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setFallbackMessage(null);
    setShowLoginPrompt(false);
    setShowDailyLimitReached(false);

    try {
      const formData = new FormData();
      formData.append("prompt", finalPrompt);
      formData.append("style", style);

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

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">둘러보기</Label>
          <span className="text-[10px] text-muted-foreground">좌우로 넘겨 선택</span>
        </div>

        <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
          {STYLE_FEED_ITEMS.map((item) => {
            const isActive = activeFeedId === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectFeedItem(item)}
                className={`group relative h-56 min-w-[220px] snap-start overflow-hidden rounded-2xl border text-left transition-all ${
                  isActive
                    ? "border-primary shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
                    : "border-zinc-200 hover:-translate-y-0.5 hover:border-zinc-300"
                }`}
              >
                <Image
                  src={item.preview}
                  alt={`${item.title} 미리보기`}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-white/95 px-3 py-2 text-center text-sm font-semibold shadow-sm">
                  {item.title}
                </div>
              </button>
            );
          })}
        </div>
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

      {!activeFeed && (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">
                {style === "custom"
                  ? e.promptLabelCustom ?? "프롬프트를 자유롭게 입력하세요"
                  : e.promptLabel ?? "어떤 캐릭터를 만들까요?"}
              </Label>

            </div>

            <Textarea
              value={prompt}
              onChange={(ev) => setPrompt(ev.target.value)}
              placeholder={
                style === "custom"
                  ? e.promptPlaceholderCustom ?? "스타일, 색감, 구도, 분위기 등을 자유롭게 묘사해주세요"
                  : e.promptPlaceholder ?? "졸린 표정으로 하품하는 캐릭터"
              }
              className="resize-none text-sm"
              rows={style === "custom" ? 4 : 3}
            />

            {style === "custom" && (
              <p className="text-[10px] text-muted-foreground">
                {e.customHint ?? "스타일, 인물, 구도, 배경을 구체적으로 적을수록 결과가 좋아집니다."}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground">
              {e.exampleHint ?? "예시 프롬프트"}
            </p>
            <div
              className={
                compact
                  ? "scrollbar-hide -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1"
                  : "flex flex-wrap gap-1"
              }
            >
              {examplePrompts.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setPrompt(ex)}
                  className={`rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] transition-colors hover:border-primary hover:bg-zinc-50 ${
                    compact ? "shrink-0 whitespace-nowrap" : ""
                  }`}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <Button className="w-full" onClick={handleGenerate} disabled={loading || !finalPrompt.trim()}>
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
          ? "border-primary bg-primary/5 text-primary"
          : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
