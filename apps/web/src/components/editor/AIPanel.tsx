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

const STYLES: { value: Style; label: string; emoji: string }[] = [
  { value: "ghibli", label: "지브리", emoji: "🌿" },
  { value: "sd", label: "SD", emoji: "🎀" },
  { value: "steampunk", label: "스팀펑크", emoji: "⚙️" },
  { value: "custom", label: "커스텀", emoji: "✏️" },
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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showDailyLimitReached, setShowDailyLimitReached] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setUploadedPreview(URL.createObjectURL(file));
    setMode("from-upload");
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setShowLoginPrompt(false);
    setShowDailyLimitReached(false);

    try {
      const formData = new FormData();
      formData.append("prompt", prompt);
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
      const { data: { session } } = await supabase.auth.getSession();
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
          // 로그인 유저가 일일 한도 초과
          setShowDailyLimitReached(true);
          return;
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
    <div className="flex flex-col h-full p-4 gap-4 overflow-y-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-yellow-500" />
        <span className="text-sm font-semibold">AI 이미지 생성</span>
      </div>

      {/* 스타일 토글 */}
      <div className="grid grid-cols-2 gap-1.5">
        {STYLES.map((s) => (
          <button
            key={s.value}
            onClick={() => setStyle(s.value)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border p-1 text-xs font-medium transition-all ${
              style === s.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-zinc-200 hover:border-zinc-300 text-zinc-500"
            }`}
          >
            <span>{s.emoji}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* 모드 선택 */}
      <div className="grid grid-cols-2 gap-1.5">
        <ModeButton
          active={mode === "prompt-only"}
          icon={<Sparkles className="w-3.5 h-3.5" />}
          label="프롬프트"
          onClick={() => setMode("prompt-only")}
        />
       
        <ModeButton
          active={mode === "from-upload"}
          icon={<Upload className="w-3.5 h-3.5" />}
          label="사진 업로드"
          onClick={() => {
            setMode("from-upload");
            fileInputRef.current?.click();
          }}
        />
      </div>

      {/* 업로드 미리보기 */}
      {mode === "from-upload" && uploadedPreview && (
        <div
          className="relative w-full aspect-square rounded-lg overflow-hidden border border-zinc-200 cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <Image
            src={uploadedPreview}
            alt="업로드 이미지"
            fill
            className="object-contain"
          />
          <span className="absolute bottom-1 inset-x-0 text-center text-[10px] text-zinc-500">
            클릭해서 변경
          </span>
        </div>
      )}

      {/* 현재 디자인 모드 안내 */}
      {mode === "from-canvas" && (
        <p className="text-xs text-muted-foreground bg-zinc-50 rounded-lg p-2 border">
          현재 캔버스 디자인을 참고해서 AI가 새 이미지를 생성합니다.
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />

      {/* 프롬프트 입력 */}
      <div className="space-y-2">
        <Label className="text-xs">
          {style === "custom" ? "프롬프트를 자유롭게 입력하세요" : "어떤 캐릭터를 만들까요?"}
        </Label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            style === "custom"
              ? "스타일, 색감, 구도, 분위기 등을 자유롭게 묘사해주세요\n예) 수채화 느낌의 귀여운 고양이, 파스텔 톤"
              : "졸린 표정으로 하품하는 캐릭터"
          }
          className="text-sm resize-none"
          rows={style === "custom" ? 4 : 2}
        />
        {style === "custom" && (
          <p className="text-[10px] text-muted-foreground">
            스타일 제약 없이 입력한 프롬프트 그대로 생성됩니다.
          </p>
        )}
      </div>

      {/* 예시 프롬프트 (커스텀 모드에선 숨김) */}
      {style !== "custom" && (
        <div className="flex flex-wrap gap-1">
          {EXAMPLE_PROMPTS.map((ex) => (
            <button
              key={ex}
              onClick={() => setPrompt(ex)}
              className="text-[10px] px-2 py-0.5 rounded-full border border-zinc-200 hover:border-primary hover:bg-zinc-50 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* 생성 버튼 */}
      <Button
        className="w-full"
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            이미지 생성 중…
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            생성하기
          </>
        )}
      </Button>

      {/* 로그인 유저 일일 한도 초과 */}
      {showDailyLimitReached && (
        <div className="relative rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <button
            onClick={() => setShowDailyLimitReached(false)}
            className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-800">오늘 생성 횟수를 모두 사용했어요</span>
          </div>
          <p className="text-xs text-amber-700 leading-relaxed">
            일일 무료 생성 횟수(10회)를 모두 사용했습니다.
            <br />
            내일 다시 이용해주세요!
          </p>
        </div>
      )}

      {/* 비로그인 유저 로그인 유도 */}
      {showLoginPrompt && (
        <div className="relative rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
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
          <p className="text-xs text-muted-foreground leading-relaxed">
            오늘 무료 생성 횟수(2회)를 모두 사용했어요.
            <br />
            로그인하면{" "}
            <span className="font-semibold text-primary">하루 10회 무료</span>로
            이용할 수 있어요!
          </p>
          <Link
            href="/login?next=/design"
            className="flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors w-full"
          >
            <LogIn className="size-4" />
            로그인하고 더 만들기
          </Link>
        </div>
      )}

      {/* 에러 */}
      {error && (
        <p className="text-xs text-red-500 bg-red-50 rounded-lg p-2">{error}</p>
      )}

      {/* 생성 결과 */}
      {result && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label className="text-xs">생성된 이미지</Label>
            <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-zinc-200 bg-[url('/checkerboard.svg')]">
              <Image
                src={result}
                alt="AI 생성 결과"
                fill
                className="object-contain"
              />
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onAddGeneratedImage(result)}
            >
              <ImagePlus className="w-4 h-4 mr-2" />
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
          : "border-zinc-200 hover:border-zinc-300 text-zinc-500"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
