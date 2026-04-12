"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Scissors, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useImagePreprocessor } from "@/hooks/useImagePreprocessor";
import { useLocale, tpl } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

type PhotoPanelProps = {
  onAddImage: (src: string) => void;
  compact?: boolean;
};

export default function PhotoPanel({ onAddImage, compact = false }: PhotoPanelProps) {
  const { t } = useLocale();
  const ip = t.imageProcessing;
  const {
    processFile,
    processing: preprocessing,
    currentStep,
    errors,
    reset,
  } = useImagePreprocessor();

  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cutoutPreview, setCutoutPreview] = useState<string | null>(null);
  const [removingBg, setRemovingBg] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
      if (cutoutPreview) URL.revokeObjectURL(cutoutPreview);
    },
    [preview, cutoutPreview],
  );

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;

    reset();
    setRemoveError(null);
    if (preview) URL.revokeObjectURL(preview);
    if (cutoutPreview) URL.revokeObjectURL(cutoutPreview);
    setCutoutPreview(null);

    const processed = await processFile(nextFile);
    if (!processed) return;

    setFile(processed.file);
    setPreview(URL.createObjectURL(processed.file));
  };

  const handleRemoveBackground = async () => {
    if (!preview) return;
    setRemovingBg(true);
    setRemoveError(null);

    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const blob = await removeBackground(preview);
      if (cutoutPreview) URL.revokeObjectURL(cutoutPreview);
      setCutoutPreview(URL.createObjectURL(blob));
    } catch {
      setRemoveError("누끼 따기에 실패했습니다. 원본 사진으로 추가하거나 다시 시도해주세요.");
    } finally {
      setRemovingBg(false);
    }
  };

  const clear = () => {
    reset();
    setFile(null);
    setRemoveError(null);
    if (preview) URL.revokeObjectURL(preview);
    if (cutoutPreview) URL.revokeObjectURL(cutoutPreview);
    setPreview(null);
    setCutoutPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const stepText =
    currentStep === "converting"
      ? ip.converting
      : currentStep === "compressing"
        ? ip.compressing
        : ip.processing;

  return (
    <div className={cn("flex flex-col gap-4", compact ? "p-3" : "p-4")}>
      <div className="space-y-1">
        <Label className="text-xs font-semibold">내 사진 추가</Label>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          사진을 그대로 캔버스에 붙이거나, 누끼를 딴 뒤 투명 배경 이미지로 추가할 수 있어요.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={handleFile}
      />

      {!preview && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50/80 p-5 text-center transition-colors hover:border-primary/60 hover:bg-primary/5"
        >
          {preprocessing ? (
            <Loader2 className="size-6 animate-spin text-primary" />
          ) : (
            <Upload className="size-7 text-zinc-500" />
          )}
          <span className="text-sm font-semibold">
            {preprocessing ? stepText : "사진 업로드"}
          </span>
          <span className="text-[11px] text-muted-foreground">JPG, PNG, WEBP, HEIC</span>
        </button>
      )}

      {preview && (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
            <div className={cn("relative w-full", compact ? "h-56" : "h-64")}>
              <Image src={cutoutPreview ?? preview} alt="업로드 사진 미리보기" fill className="object-contain" />
            </div>
            <button
              type="button"
              onClick={clear}
              className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-zinc-600 shadow-sm hover:text-foreground"
              aria-label="사진 삭제"
            >
              <X className="size-4" />
            </button>
            {cutoutPreview && (
              <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground shadow-sm">
                누끼 완료
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={preprocessing || removingBg}>
              <Upload className="mr-2 size-4" />
              변경
            </Button>
            <Button variant="outline" onClick={handleRemoveBackground} disabled={removingBg || !file}>
              {removingBg ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Scissors className="mr-2 size-4" />
              )}
              {removingBg ? "누끼 중" : "누끼 따기"}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <Button onClick={() => preview && onAddImage(preview)} disabled={!preview}>
              <ImagePlus className="mr-2 size-4" />
              원본 사진 캔버스에 추가
            </Button>
            <Button
              variant="secondary"
              onClick={() => cutoutPreview && onAddImage(cutoutPreview)}
              disabled={!cutoutPreview}
            >
              <Scissors className="mr-2 size-4" />
              누끼 이미지 추가
            </Button>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="space-y-1 rounded-xl bg-red-50 p-3">
          {errors.map((err) => (
            <p key={err.type} className="text-[11px] text-red-500">
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

      {removeError && <p className="rounded-xl bg-red-50 p-3 text-[11px] text-red-500">{removeError}</p>}
    </div>
  );
}
