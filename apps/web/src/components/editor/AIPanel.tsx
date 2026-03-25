"use client";

import { useState, useRef } from "react";
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
  WandSparkles,
  Plus,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface AIPanelProps {
  onGetCanvasImage: () => string; // toDataURL()
  onAddGeneratedImage: (src: string) => void; // addCharacter()
}

type Mode = "prompt-only" | "from-canvas" | "from-upload";
type Style = "ghibli" | "sd" | "steampunk" | "akatsuki" | "custom";
type StyleFeedItem = {
  id: string;
  title: string;
  style: Style;
  preview: string;
  basePrompt: string;
};

const STYLES: { value: Style; label: string; emoji: string }[] = [
  { value: "ghibli", label: "지브리", emoji: "🌿" },
  { value: "sd", label: "SD", emoji: "🎀" },
  { value: "steampunk", label: "스팀펑크", emoji: "⚙️" },
  { value: "custom", label: "커스텀", emoji: "✏️" },
];

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

const EXAMPLE_PROMPTS = [
  "졸린 표정으로 하품하는",
  "왕관 쓰고 의기양양한",
  "하트 들고 수줍어하는",
  "선글라스 끼고 쿨한",
];

export default function AIPanel({
  onGetCanvasImage,
  onAddGeneratedImage,
}: AIPanelProps) {
  const [mode, setMode] = useState<Mode>("prompt-only");
  const [style, setStyle] = useState<Style>("ghibli");
  const [prompt, setPrompt] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [activeFeedId, setActiveFeedId] = useState<string | null>(null);
  const [showCustomPromptInput, setShowCustomPromptInput] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeFeed = STYLE_FEED_ITEMS.find((item) => item.id === activeFeedId);
  const finalPrompt = activeFeed
    ? [activeFeed.basePrompt, customPrompt.trim()]
        .filter(Boolean)
        .join("\n\n추가 요청: ")
    : prompt;

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setUploadedPreview(URL.createObjectURL(file));
    setMode("from-upload");
  };

  const handleSelectFeedItem = (item: StyleFeedItem) => {
    setActiveFeedId(item.id);
    setStyle(item.style);
    setPrompt(item.basePrompt);
    setShowCustomPromptInput(false);
    setCustomPrompt("");
    setError(null);
  };

  const handleGenerate = async () => {
    if (!finalPrompt.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

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

      // 로그인 유저는 토큰을 헤더에 포함
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
        { method: "POST", body: formData, headers },
      );

      if (!response.ok) {
        if (response.status === 429) {
          const err = await response.json();
          if (err.login_required) {
            setShowLoginPrompt(true);
            return;
          }
          throw new Error(err.detail ?? "일일 생성 횟수를 초과했습니다.");
        }
        const err = await response.json();
        throw new Error(err.detail ?? "생성 실패");
      }

      const data = await response.json();
      setResult(data.image);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-yellow-500" />
        <span className="text-sm font-semibold">AI 이미지 생성</span>
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

      <div className="grid grid-cols-2 gap-1.5">
        <ModeButton
          active={mode === "prompt-only"}
          icon={<WandSparkles className="h-3.5 w-3.5" />}
          label="프롬프트"
          onClick={() => setMode("prompt-only")}
        />
        <ModeButton
          active={mode === "from-upload"}
          icon={<Upload className="h-3.5 w-3.5" />}
          label="사진 업로드"
          onClick={() => {
            setMode("from-upload");
            fileInputRef.current?.click();
          }}
        />
      </div>

      {mode === "from-upload" && uploadedPreview && (
        <div
          className="relative aspect-square w-full cursor-pointer overflow-hidden rounded-lg border border-zinc-200"
          onClick={() => fileInputRef.current?.click()}
        >
          <Image src={uploadedPreview} alt="업로드 이미지" fill className="object-contain" />
          <span className="absolute inset-x-0 bottom-1 text-center text-[10px] text-zinc-500">
            클릭해서 변경
          </span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />

      {!activeFeed && (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            {STYLES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStyle(s.value)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border p-1 text-xs font-medium transition-all ${
                  style === s.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                }`}
              >
                <span>{s.emoji}</span>
                {s.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">
              {style === "custom"
                ? "프롬프트를 자유롭게 입력하세요"
                : "어떤 캐릭터를 만들까요?"}
            </Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                style === "custom"
                  ? "스타일, 색감, 구도, 분위기 등을 자유롭게 묘사해주세요"
                  : "졸린 표정으로 하품하는 캐릭터"
              }
              className="resize-none text-sm"
              rows={style === "custom" ? 4 : 2}
            />
          </div>

          {style !== "custom" && (
            <div className="flex flex-wrap gap-1">
              {EXAMPLE_PROMPTS.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setPrompt(ex)}
                  className="rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] transition-colors hover:border-primary hover:bg-zinc-50"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {activeFeed && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-700">선택된 스타일</p>
            <button
              type="button"
              className="text-[11px] text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline"
              onClick={() => {
                setActiveFeedId(null);
                setPrompt("");
                setStyle("ghibli");
                setCustomPrompt("");
                setShowCustomPromptInput(false);
              }}
            >
              선택 해제
            </button>
          </div>
          <p className="text-sm font-medium">{activeFeed.title}</p>
          <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-zinc-500">
            {activeFeed.basePrompt}
          </p>
        </div>
      )}

      {activeFeed && (
        <div className="space-y-2">
          {!showCustomPromptInput ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full border-zinc-300 bg-white text-sm font-medium"
              onClick={() => setShowCustomPromptInput(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              + 추가 프롬프트 입력하기
            </Button>
          ) : (
            <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <Label className="text-xs">추가 프롬프트</Label>
              <Textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="원하는 디테일(표정/포즈/소품 등)을 추가로 입력하세요"
                className="resize-none bg-white text-sm"
                rows={3}
              />
            </div>
          )}
        </div>
      )}

      <Button className="w-full" onClick={handleGenerate} disabled={loading || !finalPrompt.trim()}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            이미지 생성 중…
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            생성하기
          </>
        )}
      </Button>

      {showLoginPrompt && (
        <div className="relative space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <button
            onClick={() => setShowLoginPrompt(false)}
            className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span className="text-sm font-semibold">더 많이 만들어보세요!</span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            오늘 무료 생성 횟수(2회)를 모두 사용했어요.
            <br />
            카카오 로그인하면 <span className="font-semibold text-primary">하루 10회 무료</span>로 이용할 수
            있어요!
          </p>
          <Link
            href="/login?next=/design"
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors"
            style={{ backgroundColor: "#FEE500", color: "#191919" }}
          >
            <LogIn className="size-4" />
            카카오로 시작하기
          </Link>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 p-2 text-xs text-red-500">{error}</p>}

      {result && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label className="text-xs">생성된 이미지</Label>
            <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-zinc-200 bg-[url('/checkerboard.svg')]">
              <Image src={result} alt="AI 생성 결과" fill className="object-contain" />
            </div>
            <Button variant="outline" className="w-full" onClick={() => onAddGeneratedImage(result)}>
              <ImagePlus className="mr-2 h-4 w-4" />
              캔버스에 추가
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
