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
  HelpCircle,
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

const EXAMPLE_PROMPTS: Record<Style, string[]> = {
  ghibli: [
    "숲속에서 꽃을 들고 미소짓는 소녀",
    "빗속에서 빨간 우산을 쓰고 서 있는 고양이",
    "구름 위에 앉아 별을 바라보는 아이",
    "바람에 머리카락 날리며 들판을 뛰어가는 강아지",
  ],
  sd: [
    "왕관 쓰고 의기양양하게 포즈 취하는 기사",
    "하트 쿠션을 안고 수줍게 웃는 토끼",
    "마법 지팡이 들고 주문 외우는 마녀",
    "선글라스 끼고 쿨하게 서 있는 고양이",
  ],
  steampunk: [
    "황동 고글 쓰고 기계 팔을 가진 발명가",
    "증기 기관 비행선 위에 서 있는 모험가",
    "톱니바퀴 장식 드레스 입은 귀족 고양이",
    "시계탑 앞에서 나침반을 들여다보는 탐험가",
  ],
  akatsuki: [
    "붉은 구름 망토 입고 절벽 위에 서 있는 닌자",
    "샤링안 눈으로 정면을 응시하는 인물",
    "검은 망토 휘날리며 달빛 아래 서 있는 그림자",
    "폭풍 속에서 인술을 펼치는 전사",
  ],
  custom: [
    "수채화 느낌의 귀여운 고양이, 파스텔 톤 배경",
    "픽셀아트 스타일의 용사 캐릭터, 검을 들고 서 있는",
    "미니멀한 라인아트 강아지, 흰색 배경",
    "팝아트 스타일 초상화, 앤디워홀 느낌의 강렬한 색감",
  ],
};

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
  const [showGuide, setShowGuide] = useState(false);
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
        <div className="flex items-center justify-between">
          <Label className="text-xs">
            {style === "custom" ? "프롬프트를 자유롭게 입력하세요" : "어떤 캐릭터를 만들까요?"}
          </Label>
          <button
            onClick={() => setShowGuide((v) => !v)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
          >
            <HelpCircle className="w-3 h-3" />
            작성 팁
          </button>
        </div>

        {/* 프롬프트 작성 가이드 */}
        {showGuide && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
            <p className="text-[11px] font-semibold text-blue-800">
              이렇게 쓰면 더 좋은 결과가 나와요
            </p>
            <div className="space-y-1.5 text-[10px] text-blue-700 leading-relaxed">
              <p><span className="font-semibold">1. 누구를</span> — 캐릭터/대상을 구체적으로</p>
              <p className="pl-3 text-blue-600">예) 갈색 푸들, 턱시도 입은 고양이</p>
              <p><span className="font-semibold">2. 뭘 하는지</span> — 동작이나 표정</p>
              <p className="pl-3 text-blue-600">예) 하품하는, 꽃을 들고 미소짓는</p>
              <p><span className="font-semibold">3. 어디서</span> — 장소나 배경 분위기</p>
              <p className="pl-3 text-blue-600">예) 벚꽃 아래, 별이 빛나는 밤하늘</p>
            </div>
            <div className="border-t border-blue-200 pt-1.5 mt-1.5">
              <p className="text-[10px] text-blue-600">
                <span className="font-semibold">Tip:</span> &quot;없는&quot; 대신 &quot;있는&quot;으로 표현하세요.
                <br />
                &quot;안경 안 쓴&quot; → &quot;맨눈의&quot;
              </p>
            </div>
          </div>
        )}

        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            style === "custom"
              ? "스타일, 대상, 동작, 분위기를 구체적으로 묘사해주세요\n예) 수채화 느낌의 귀여운 고양이가 창가에 앉아 비를 바라보는"
              : "누가 + 뭘 하는지 + 어디서\n예) 빗속에서 빨간 우산을 쓰고 서 있는 고양이"
          }
          className="text-sm resize-none"
          rows={3}
        />
        {style === "custom" && (
          <p className="text-[10px] text-muted-foreground">
            스타일 제약 없이 입력한 프롬프트 그대로 생성됩니다.
          </p>
        )}
      </div>

      {/* 예시 프롬프트 */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-muted-foreground">클릭하면 바로 입력돼요</p>
        <div className="flex flex-wrap gap-1">
          {EXAMPLE_PROMPTS[style].map((ex) => (
            <button
              key={ex}
              onClick={() => setPrompt(ex)}
              className="text-[10px] px-2 py-0.5 rounded-full border border-zinc-200 hover:border-primary hover:bg-zinc-50 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
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
