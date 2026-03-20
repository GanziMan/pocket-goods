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
  Share2,
  Link2,
  Check,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { LandingNav } from "@/components/landing/LandingNav";
import { createClient } from "@/lib/supabase/client";
import { profileEvents } from "@/lib/gtag";
import { addWatermark, resultToBlob } from "@/lib/image-utils";

type Style = "id-photo" | "instagram" | "ghibli" | "fairly-odd" | "powerpuff";
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
      "fairly-odd": { label: "티미의 수호천사", desc: "티미의 못말리는 수호천사" },
      powerpuff: { label: "파워퍼프걸", desc: "파워퍼프걸 스타일" },
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
    share: "공유하기",
    shareKakao: "카카오톡",
    shareX: "X",
    shareCopy: "링크 복사",
    shareCopied: "복사됨!",
    shareTitle: "AI 프로필 사진을 만들어봤어요!",
    shareText: "포켓굿즈에서 AI로 나만의 프로필 사진을 만들어보세요",
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
      "fairly-odd": { label: "Fairly Odd", desc: "The Fairly OddParents style" },
      powerpuff: { label: "Powerpuff", desc: "Powerpuff Girls style" },
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
    share: "Share",
    shareKakao: "KakaoTalk",
    shareX: "X",
    shareCopy: "Copy Link",
    shareCopied: "Copied!",
    shareTitle: "Check out my AI profile photo!",
    shareText: "Create your own AI profile photo at Pocket Goods",
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
  "id-photo": "\u{1F4F7}",
  instagram: "\u2728",
  ghibli: "\u{1F33F}",
  "fairly-odd": "\u{1FA84}",
  powerpuff: "\u{1F4A5}",
};

const STYLE_KEYS: Style[] = ["id-photo", "instagram", "ghibli", "fairly-odd", "powerpuff"];

interface ProfileGeneratorProps {
  locale?: Locale;
}

export default function ProfileGenerator({ locale = "ko" }: ProfileGeneratorProps) {
  const t = TEXT[locale];
  const shareUrl = locale === "en"
    ? "https://pocket-goods.com/en/ai-profile"
    : "https://pocket-goods.com/ai-profile";
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [style, setStyle] = useState<Style>("ghibli");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showDailyLimitReached, setShowDailyLimitReached] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [remaining, setRemaining] = useState<{ count: number; limit: number } | null>(null);
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
    profileEvents.uploadPhoto();
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setPreview(file);
    profileEvents.uploadPhoto();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedPreview]);

  const handleStyleSelect = (key: Style) => {
    setStyle(key);
    profileEvents.selectStyle(key);
  };

  const handleGenerate = async () => {
    if (!uploadedFile) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setShowLoginPrompt(false);
    setShowDailyLimitReached(false);
    setShowShareMenu(false);

    profileEvents.generate(style);

    try {
      const formData = new FormData();
      formData.append("style", style);
      formData.append("upload_image", uploadedFile);

      const headers: HeadersInit = {};
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        // getUser로 토큰 유효성 확인 + 자동 갱신
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // 갱신된 세션에서 최신 토큰 가져오기
          const { data: { session: freshSession } } = await supabase.auth.getSession();
          if (freshSession?.access_token) {
            headers["Authorization"] = `Bearer ${freshSession.access_token}`;
          }
        }
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
            profileEvents.rateLimitHit("anonymous");
            return;
          }
          const detail = err.detail ?? "";
          if (detail.includes("일시적") || detail.includes("바빠요")) {
            setError(locale === "ko"
              ? "AI 서버가 일시적으로 바빠요. 잠시 후 다시 시도해주세요."
              : "AI server is temporarily busy. Please try again shortly.");
            return;
          }
          setShowDailyLimitReached(true);
          profileEvents.rateLimitHit("authenticated");
          return;
        }
        const err = await response.json();
        throw new Error(err.detail ?? t.errorGenerate);
      }

      const data = await response.json();
      const watermarked = await addWatermark(data.image);
      setResult(watermarked);
      if (data.remaining !== undefined) {
        setRemaining({ count: data.remaining, limit: data.daily_limit });
      }
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
    profileEvents.download(style);
  };

  const handleShareKakao = () => {
    if (!window.Kakao?.isInitialized()) return;
    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: t.shareTitle,
        description: t.shareText,
        imageUrl: "https://pocket-goods.com/og-image-ai-profile.jpg",
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
      buttons: [
        {
          title: locale === "ko" ? "나도 만들어보기" : "Try it now",
          link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        },
      ],
    });
    profileEvents.share("kakao", style);
    setShowShareMenu(false);
  };

  const handleShareX = () => {
    const text = encodeURIComponent(`${t.shareTitle}\n${t.shareText}`);
    const url = encodeURIComponent(shareUrl);
    window.open(`https://x.com/intent/tweet?text=${text}&url=${url}`, "_blank", "noopener");
    profileEvents.share("x", style);
    setShowShareMenu(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      profileEvents.share("copy_link", style);
    } catch {
      // fallback
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      profileEvents.share("copy_link", style);
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share || !result) return;
    try {
      const blob = await resultToBlob(result);
      const file = new File([blob], `profile-${style}.png`, { type: "image/png" });
      await navigator.share({
        title: t.shareTitle,
        text: t.shareText,
        url: shareUrl,
        files: [file],
      });
      profileEvents.share("native", style);
    } catch {
      // user cancelled or not supported with files, try without files
      try {
        await navigator.share({
          title: t.shareTitle,
          text: t.shareText,
          url: shareUrl,
        });
        profileEvents.share("native", style);
      } catch {
        // user cancelled
      }
    }
    setShowShareMenu(false);
  };

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

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
          {remaining && (
            <p className={`mt-3 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${
              remaining.count <= 2
                ? "bg-red-50 text-red-600"
                : "bg-zinc-100 text-zinc-500"
            }`}>
              {locale === "ko"
                ? `오늘 ${remaining.count}/${remaining.limit}회 남음`
                : `${remaining.count}/${remaining.limit} remaining today`}
            </p>
          )}
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
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3">
                {STYLE_KEYS.map((key) => (
                  <button
                    key={key}
                    onClick={() => handleStyleSelect(key)}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2.5 transition-all sm:gap-1.5 sm:p-3 ${
                      style === key
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    <span className="text-xl sm:text-2xl">{STYLE_EMOJIS[key]}</span>
                    <span className="break-keep text-xs font-medium sm:text-sm">{t.styles[key].label}</span>
                    <span className="hidden text-[10px] text-muted-foreground leading-tight text-center sm:block">
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
              <div className="space-y-3">
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

                {/* Share section */}
                <div className="relative">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      if (canNativeShare) {
                        handleNativeShare();
                      } else {
                        setShowShareMenu((v) => !v);
                      }
                    }}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    {t.share}
                  </Button>

                  {/* Share dropdown (desktop) */}
                  {showShareMenu && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-2 rounded-xl border border-zinc-200 bg-white p-2 shadow-lg">
                      {/* 카카오톡 */}
                      <button
                        onClick={handleShareKakao}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-zinc-50 transition-colors"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FEE500]">
                          <svg width="18" height="18" viewBox="0 0 256 256" fill="none">
                            <path d="M128 36C70.6 36 24 72.8 24 118c0 29.2 19.4 54.8 48.6 69.4l-10 37.2c-.8 3 2.6 5.4 5.2 3.6l43.4-29.2c5.6.8 11.2 1.2 16.8 1.2 57.4 0 104-36.8 104-82S185.4 36 128 36z" fill="#3C1E1E"/>
                          </svg>
                        </span>
                        <span>{t.shareKakao}</span>
                      </button>

                      {/* X (Twitter) */}
                      <button
                        onClick={handleShareX}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-zinc-50 transition-colors"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                        </span>
                        <span>{t.shareX}</span>
                      </button>

                      {/* Link copy */}
                      <button
                        onClick={handleCopyLink}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-zinc-50 transition-colors"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100">
                          {linkCopied ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Link2 className="h-4 w-4 text-zinc-600" />
                          )}
                        </span>
                        <span>{linkCopied ? t.shareCopied : t.shareCopy}</span>
                      </button>
                    </div>
                  )}
                </div>
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
