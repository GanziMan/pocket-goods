"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles, Upload, Loader2, ImagePlus, LogIn, X, HelpCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/client";

interface AIPanelProps {
  onGetCanvasImage: () => string;
  onAddGeneratedImage: (src: string) => void;
  compact?: boolean;
}

type Mode = "prompt-only" | "from-canvas" | "from-upload";
type Style = "ghibli" | "sd" | "fairly-odd" | "powerpuff" | "akatsuki" | "custom";

const STYLE_EMOJIS: Record<Style, string> = {
  ghibli: "🌿", sd: "🎀", "fairly-odd": "🧚", powerpuff: "💥", akatsuki: "☁️", custom: "✏️",
};

const STYLE_KEYS: Style[] = ["ghibli", "sd", "fairly-odd", "powerpuff", "custom"];

export default function AIPanel({
  onGetCanvasImage,
  onAddGeneratedImage,
  compact = false,
}: AIPanelProps) {
  const { t } = useLocale();
  const e = t.editor;
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
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<{ count: number; limit: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setUploadedPreview(URL.createObjectURL(file));
    setMode("from-upload");
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true); setError(null); setResult(null); setFallbackMessage(null);
    setShowLoginPrompt(false); setShowDailyLimitReached(false);
    try {
      const formData = new FormData();
      formData.append("prompt", prompt); formData.append("style", style);
      if (mode === "from-canvas") { const dataURL = onGetCanvasImage(); const res = await fetch(dataURL); const blob = await res.blob(); formData.append("canvas_image", blob, "canvas.png"); }
      if (mode === "from-upload" && uploadedFile) { formData.append("upload_image", uploadedFile); }
      const headers: HeadersInit = {};
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) { const { data: { user } } = await supabase.auth.getUser(); if (user) { const { data: { session: freshSession } } = await supabase.auth.getSession(); if (freshSession?.access_token) { headers["Authorization"] = `Bearer ${freshSession.access_token}`; } } }
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/generate-image`, { method: "POST", body: formData, headers });
      if (!response.ok) {
        if (response.status === 429) {
          const err = await response.json();
          if (err.login_required) { setShowLoginPrompt(true); return; }
          const detail = err.detail ?? "";
          if (err.server_busy || detail.includes("일시적") || detail.includes("temporarily")) { setError(e.serverBusy); return; }
          setShowDailyLimitReached(true); return;
        }
        const err = await response.json(); throw new Error(err.detail ?? e.generateFailed);
      }
      const data = await response.json();
      setResult(data.image);
      if (data.remaining !== undefined) { setRemaining({ count: data.remaining, limit: data.daily_limit }); }
      if (data.fallback) { setFallbackMessage(data.fallback_message ?? e.fallbackDefault); }
    } catch (err) { setError(err instanceof Error ? err.message : e.errorFallback); } finally { setLoading(false); }
  };

  const styles = STYLE_KEYS.map((key) => ({
    value: key,
    label: e.styles[key as keyof typeof e.styles],
    emoji: STYLE_EMOJIS[key],
  }));

  return (
    <div className={`flex flex-col gap-3 ${compact ? "p-3" : "h-full p-4 gap-4 overflow-y-auto"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-semibold">{e.aiTitle}</span>
        </div>
        {remaining && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${remaining.count <= 2 ? "bg-red-50 text-red-600" : "bg-zinc-100 text-zinc-500"}`}>
            {e.remaining(remaining.count, remaining.limit)}
          </span>
        )}
      </div>

      <div className={`grid gap-1.5 ${compact ? "grid-cols-3" : "grid-cols-2"}`}>
        {styles.map((s) => (
          <button key={s.value} onClick={() => setStyle(s.value)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border text-xs font-medium transition-all ${compact ? "p-2" : "p-1"} ${style === s.value ? "border-primary bg-primary/10 text-primary" : "border-zinc-200 hover:border-zinc-300 text-zinc-500"}`}>
            <span>{s.emoji}</span>{s.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <ModeButton active={mode === "prompt-only"} icon={<Sparkles className="w-3.5 h-3.5" />} label={e.modePrompt} onClick={() => setMode("prompt-only")} />
        <ModeButton active={mode === "from-upload"} icon={<Upload className="w-3.5 h-3.5" />} label={e.modeUpload} onClick={() => { setMode("from-upload"); fileInputRef.current?.click(); }} />
      </div>

      {mode === "from-upload" && uploadedPreview && (
        <div className={`relative rounded-lg overflow-hidden border border-zinc-200 cursor-pointer ${compact ? "w-32 h-32 mx-auto" : "w-full aspect-square"}`} onClick={() => fileInputRef.current?.click()}>
          <Image src={uploadedPreview} alt={e.uploadPreviewAlt} fill className="object-contain" />
          <span className="absolute bottom-1 inset-x-0 text-center text-[10px] text-zinc-500">{e.uploadChangeHint}</span>
        </div>
      )}

      {mode === "from-canvas" && (
        <p className="text-xs text-muted-foreground bg-zinc-50 rounded-lg p-2 border">{e.canvasRefHint}</p>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">{style === "custom" ? e.promptLabelCustom : e.promptLabel}</Label>
          <button onClick={() => setShowGuide((v) => !v)} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors">
            <HelpCircle className="w-3 h-3" />{e.writingTips}
          </button>
        </div>

        {showGuide && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
            <p className="text-[11px] font-semibold text-blue-800">{e.guideTitle}</p>
            <div className="space-y-1.5 text-[10px] text-blue-700 leading-relaxed">
              <p><span className="font-semibold">1. {e.guideWho}</span> — {e.guideWhoDesc}</p>
              <p className="pl-3 text-blue-600">{e.guideWhoExample}</p>
              <p><span className="font-semibold">2. {e.guideWhat}</span> — {e.guideWhatDesc}</p>
              <p className="pl-3 text-blue-600">{e.guideWhatExample}</p>
              <p><span className="font-semibold">3. {e.guideWhere}</span> — {e.guideWhereDesc}</p>
              <p className="pl-3 text-blue-600">{e.guideWhereExample}</p>
            </div>
            <div className="border-t border-blue-200 pt-1.5 mt-1.5">
              <p className="text-[10px] text-blue-600"><span className="font-semibold">{e.guideTip}</span> {e.guideTipDesc}<br />{e.guideTipExample}</p>
            </div>
          </div>
        )}

        <Textarea value={prompt} onChange={(ev) => setPrompt(ev.target.value)}
          placeholder={style === "custom" ? e.promptPlaceholderCustom : e.promptPlaceholder}
          className="text-sm resize-none" rows={3} />
        {style === "custom" && <p className="text-[10px] text-muted-foreground">{e.customHint}</p>}
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] text-muted-foreground">{e.exampleHint}</p>
        <div className={compact ? "flex gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 scrollbar-hide" : "flex flex-wrap gap-1"}>
          {e.examplePrompts[style as keyof typeof e.examplePrompts]?.map((ex) => (
            <button key={ex} onClick={() => setPrompt(ex)}
              className={`text-[10px] px-2 py-0.5 rounded-full border border-zinc-200 hover:border-primary hover:bg-zinc-50 transition-colors ${compact ? "whitespace-nowrap shrink-0" : ""}`}>
              {ex}
            </button>
          ))}
        </div>
      </div>

      <Button className="w-full" onClick={handleGenerate} disabled={loading || !prompt.trim()}>
        {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />{e.generating}</>) : (<><Sparkles className="w-4 h-4 mr-2" />{e.generateBtn}</>)}
      </Button>

      {showDailyLimitReached && (
        <div className="relative rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <button onClick={() => setShowDailyLimitReached(false)} className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
          <div className="flex items-center gap-2"><Sparkles className="size-4 text-amber-500" /><span className="text-sm font-semibold text-amber-800">{e.limitTitle}</span></div>
          <p className="text-xs text-amber-700 leading-relaxed">{e.limitDesc}<br />{e.limitSuffix}</p>
        </div>
      )}

      {showLoginPrompt && (
        <div className="relative rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <button onClick={() => setShowLoginPrompt(false)} className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
          <div className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /><span className="text-sm font-semibold">{e.loginTitle}</span></div>
          <p className="text-xs text-muted-foreground leading-relaxed">{e.loginDesc}<br />{e.loginPrefix}<span className="font-semibold text-primary">{e.loginBenefit}</span>{e.loginSuffix}</p>
          <Link href="/login?next=/design" className="flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors w-full"><LogIn className="size-4" />{e.loginBtn}</Link>
        </div>
      )}

      {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg p-2">{error}</p>}

      {result && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label className="text-xs">{e.generatedLabel}</Label>
            {fallbackMessage && <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">{fallbackMessage}</p>}
            <div className={`relative rounded-lg overflow-hidden border border-zinc-200 bg-[url('/checkerboard.svg')] ${compact ? "w-40 h-40 mx-auto" : "w-full aspect-square"}`}>
              <Image src={result} alt={e.generatedAlt} fill className="object-contain" />
            </div>
            <Button variant="outline" className="w-full" onClick={() => onAddGeneratedImage(result)}>
              <ImagePlus className="w-4 h-4 mr-2" />{e.addToCanvas}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function ModeButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-[10px] transition-all ${active ? "border-primary bg-primary/5 text-primary" : "border-zinc-200 hover:border-zinc-300 text-zinc-500"}`}>
      {icon}{label}
    </button>
  );
}
