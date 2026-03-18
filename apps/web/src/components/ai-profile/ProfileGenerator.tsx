"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Upload,
  Loader2,
  Download,
  RefreshCw,
  LogIn,
  X,
  Camera,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { LandingNav } from "@/components/landing/LandingNav";
import { createClient } from "@/lib/supabase/client";

type Style = "id-photo" | "instagram" | "ghibli";
type Locale = "ko" | "en";

const TEXT = {
  ko: {
    heroTitle: "AI 프로필 사진",
    heroDesc: "사진 한 장으로 다양한 스타일의 프로필 사진을 만들어보세요",
    uploadLabel: "사진 업로드",
    uploadAlt: "업로드 미리보기",
    uploadChange: "클릭해서 변경",
    uploadDrag: "사진을 드래그하거나 클릭해서 업로드",
    uploadFormats: "JPG, PNG, WEBP",
    styleLabel: "스타일 선택",
    styles: {
      "id-photo": { label: "증명사진", desc: "깔끔한 증명사진 스타일" },
      instagram: { label: "화보/인스타", desc: "감성 화보 프로필" },
      ghibli: { label: "지브리/애니", desc: "지브리 애니메이션 스타일" },
    },
    generating: "프로필 생성 중...",
    generate: "프로필 생성하기",
    resultLabel: "결과",
    resultAlt: "AI 프로필 결과",
    loadingMsg: "AI가 프로필 사진을 만들고 있어요...",
    loadingTime: "약 10~30초 소요됩니다",
    placeholder: "사진을 업로드하고 스타일을 선택해주세요",
    download: "다운로드",
    regenerate: "다시 생성",
    loginTitle: "더 많이 만들어보세요!",
    loginDesc: "오늘 무료 생성 횟수(2회)를 모두 사용했어요.",
    loginBenefit: "하루 10회 무료",
    loginSuffix: "로 이용할 수 있어요!",
    loginPrefix: "로그인하면 ",
    loginBtn: "로그인하고 더 만들기",
    limitTitle: "오늘 생성 횟수를 모두 사용했어요",
    limitDesc: "일일 무료 생성 횟수(10회)를 모두 사용했습니다.",
    limitSuffix: "내일 다시 이용해주세요!",
    errorFallback: "알 수 없는 오류가 발생했습니다.",
    errorGenerate: "생성 실패",
  },
  en: {
    heroTitle: "AI Profile Photo",
    heroDesc: "Transform your photo into different styles with AI",
    uploadLabel: "Upload Photo",
    uploadAlt: "Upload preview",
    uploadChange: "Click to change",
    uploadDrag: "Drag & drop or click to upload",
    uploadFormats: "JPG, PNG, WEBP",
    styleLabel: "Choose Style",
    styles: {
      "id-photo": { label: "ID Photo", desc: "Clean, professional headshot" },
      instagram: { label: "Instagram", desc: "Aesthetic profile photo" },
      ghibli: { label: "Ghibli/Anime", desc: "Studio Ghibli animation style" },
    },
    generating: "Generating...",
    generate: "Generate Profile",
    resultLabel: "Result",
    resultAlt: "AI profile result",
    loadingMsg: "AI is creating your profile photo...",
    loadingTime: "Takes about 10-30 seconds",
    placeholder: "Upload a photo and choose a style",
    download: "Download",
    regenerate: "Regenerate",
    loginTitle: "Want to create more?",
    loginDesc: "You've used all free generations (2) for today.",
    loginBenefit: "10 free per day",
    loginSuffix: "!",
    loginPrefix: "Sign in to get ",
    loginBtn: "Sign in for more",
    limitTitle: "Daily limit reached",
    limitDesc: "You've used all 10 free generations for today.",
    limitSuffix: "Please come back tomorrow!",
    errorFallback: "An unexpected error occurred.",
    errorGenerate: "Generation failed",
  },
} as const;

const STYLE_EMOJIS: Record<Style, string> = {
  "id-photo": "📷",
  instagram: "✨",
  ghibli: "🌿",
};

const STYLE_KEYS: Style[] = ["id-photo", "instagram", "ghibli"];

interface ProfileGeneratorProps {
  locale?: Locale;
}

export default function ProfileGenerator({ locale = "ko" }: ProfileGeneratorProps) {
  const t = TEXT[locale];
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [style, setStyle] = useState<Style>("ghibli");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showDailyLimitReached, setShowDailyLimitReached] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loginRedirect = locale === "en" ? "/login?next=/en/ai-profile" : "/login?next=/ai-profile";

  const setPreview = (file: File) => {
    if (uploadedPreview) URL.revokeObjectURL(uploadedPreview);
    setUploadedFile(file);
    setUploadedPreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setPreview(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedPreview]);

  const handleGenerate = async () => {
    if (!uploadedFile) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setShowLoginPrompt(false);
    setShowDailyLimitReached(false);

    try {
      const formData = new FormData();
      formData.append("style", style);
      formData.append("upload_image", uploadedFile);

      const headers: HeadersInit = {};
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/generate-profile`,
        { method: "POST", body: formData, headers }
      );

      if (!response.ok) {
        if (response.status === 429) {
          const err = await response.json();
          if (err.login_required) {
            setShowLoginPrompt(true);
            return;
          }
          setShowDailyLimitReached(true);
          return;
        }
        const err = await response.json();
        throw new Error(err.detail ?? t.errorGenerate);
      }

      const data = await response.json();
      setResult(data.image);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t.errorFallback
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const link = document.createElement("a");
    link.href = result;
    link.download = `profile-${style}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <LandingNav locale={locale} />

      <main className="mx-auto max-w-5xl px-4 pt-20 pb-16 md:px-8">
        {/* Hero */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {t.heroTitle}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t.heroDesc}
          </p>
        </div>

        {/* 2-column grid */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Left: Input */}
          <div className="space-y-6">
            {/* Upload area */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                {t.uploadLabel}
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
                  uploadedPreview
                    ? "border-zinc-300"
                    : "border-zinc-300 hover:border-primary hover:bg-primary/5"
                } ${uploadedPreview ? "p-0 overflow-hidden" : "p-8"}`}
              >
                {uploadedPreview ? (
                  <div className="relative aspect-square w-full">
                    <Image
                      src={uploadedPreview}
                      alt={t.uploadAlt}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors hover:bg-black/30">
                      <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium opacity-0 transition-opacity hover:opacity-100 [div:hover>&]:opacity-100">
                        {t.uploadChange}
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="mb-3 h-8 w-8 text-zinc-400" />
                    <p className="text-sm font-medium text-zinc-600">
                      {t.uploadDrag}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {t.uploadFormats}
                    </p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
              />
            </div>

            {/* Style selection */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                {t.styleLabel}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {STYLE_KEYS.map((key) => (
                  <button
                    key={key}
                    onClick={() => setStyle(key)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 transition-all ${
                      style === key
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    <span className="text-2xl">{STYLE_EMOJIS[key]}</span>
                    <span className="text-sm font-medium">{t.styles[key].label}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight text-center">
                      {t.styles[key].desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <Button
              className="w-full h-12 text-base"
              onClick={handleGenerate}
              disabled={loading || !uploadedFile}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t.generating}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  {t.generate}
                </>
              )}
            </Button>
          </div>

          {/* Right: Result */}
          <div className="space-y-4">
            <label className="mb-2 block text-sm font-medium">{t.resultLabel}</label>
            <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
              {result ? (
                <Image
                  src={result}
                  alt={t.resultAlt}
                  fill
                  className="object-contain"
                />
              ) : loading ? (
                <div className="flex h-full flex-col items-center justify-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    {t.loadingMsg}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {t.loadingTime}
                  </p>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-zinc-400">
                  <Camera className="h-10 w-10" />
                  <p className="text-sm">
                    {t.placeholder}
                  </p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            {result && (
              <div className="flex gap-3">
                <Button className="flex-1" onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  {t.download}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleGenerate}
                  disabled={loading}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t.regenerate}
                </Button>
              </div>
            )}

            {/* Login prompt (429 - anonymous) */}
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
                  <span className="text-sm font-semibold">
                    {t.loginTitle}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t.loginDesc}
                  <br />
                  {t.loginPrefix}
                  <span className="font-semibold text-primary">
                    {t.loginBenefit}
                  </span>
                  {t.loginSuffix}
                </p>
                <Link
                  href={loginRedirect}
                  className="flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors w-full"
                >
                  <LogIn className="size-4" />
                  {t.loginBtn}
                </Link>
              </div>
            )}

            {/* Daily limit reached (429 - authenticated) */}
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
                  <span className="text-sm font-semibold text-amber-800">
                    {t.limitTitle}
                  </span>
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  {t.limitDesc}
                  <br />
                  {t.limitSuffix}
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg p-3">
                {error}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
