"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Upload,
  LayoutTemplate,
  Loader2,
  ImagePlus,
} from "lucide-react";
import Image from "next/image";

interface AIPanelProps {
  onGetCanvasImage: () => string; // toDataURL()
  onAddGeneratedImage: (src: string) => void; // addCharacter()
}

type Mode = "prompt-only" | "from-canvas" | "from-upload";
type Style = "ghibli" | "sd" | "steampunk";

const STYLES: { value: Style; label: string; emoji: string }[] = [
  { value: "ghibli", label: "지브리풍", emoji: "🌿" },
  { value: "sd", label: "SD 캐릭터", emoji: "🎀" },
  { value: "steampunk", label: "스팀펑크", emoji: "⚙️" },
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
  const [loadingStep, setLoadingStep] = useState<"generating" | "removing-bg">(
    "generating",
  );
  const [error, setError] = useState<string | null>(null);
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
    setLoadingStep("generating");
    setError(null);
    setResult(null);

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

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/generate-image`,
        { method: "POST", body: formData },
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail ?? "생성 실패");
      }

      const data = await response.json();
      let finalImage: string = data.image;

      // 자동 누끼 처리 (항상 적용)
      setLoadingStep("removing-bg");
      const { removeBackground } = await import("@imgly/background-removal");
      const blob = await removeBackground(finalImage);
      finalImage = URL.createObjectURL(blob);

      setResult(finalImage);
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
      <div className="flex gap-1.5">
        {STYLES.map((s) => (
          <button
            key={s.value}
            onClick={() => setStyle(s.value)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-all ${
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
      <div className="grid grid-cols-3 gap-1.5">
        <ModeButton
          active={mode === "prompt-only"}
          icon={<Sparkles className="w-3.5 h-3.5" />}
          label="프롬프트"
          onClick={() => setMode("prompt-only")}
        />
        <ModeButton
          active={mode === "from-canvas"}
          icon={<LayoutTemplate className="w-3.5 h-3.5" />}
          label="현재 디자인"
          onClick={() => setMode("from-canvas")}
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
        <Label className="text-xs">어떤 캐릭터를 만들까요?</Label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="졸린 표정으로 하품하는 캐릭터"
          className="text-sm resize-none"
          rows={3}
        />
      </div>

      {/* 예시 프롬프트 */}
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

      {/* 생성 버튼 */}
      <Button
        className="w-full"
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {loadingStep === "generating" ? "이미지 생성 중…" : "누끼 따는 중…"}
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            생성하기
          </>
        )}
      </Button>

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
