"use client";

import { MousePointerClick } from "lucide-react";
import { useLocale } from "@/lib/i18n/client";

interface DesignCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  outputSizeMm: { width: number; height: number };
  showGuide?: boolean;
}

export default function DesignCanvas({
  canvasRef, outputSizeMm, showGuide = false,
}: DesignCanvasProps) {
  const { t } = useLocale();

  return (
    <div
      className="relative h-full w-full overflow-auto bg-[#f6f6f4]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 16% 14%, rgba(251,191,36,0.16), transparent 28%), radial-gradient(circle at 85% 20%, rgba(244,114,182,0.12), transparent 30%), linear-gradient(rgba(24,24,27,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(24,24,27,0.035) 1px, transparent 1px)",
        backgroundSize: "auto, auto, 28px 28px, 28px 28px",
      }}
    >
      <div className="pointer-events-none absolute inset-x-8 top-6 hidden h-20 rounded-full bg-white/45 blur-3xl md:block" />

      <div className="flex min-h-full min-w-full items-center justify-center px-5 py-8 md:px-16 md:py-20">
        <div className="relative mx-auto shrink-0">
          <div className="absolute -inset-8 rounded-[2rem] bg-white/45 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl" />
          <div className="absolute -inset-3 rounded-[1.5rem] border border-white/80 bg-white/55 shadow-sm" />

          <div className="relative overflow-hidden rounded-[18px] bg-white p-2 shadow-[0_22px_60px_rgba(15,23,42,0.18)] ring-1 ring-zinc-900/10">
            <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/80 to-transparent pointer-events-none" />
            <canvas ref={canvasRef} />
            {showGuide && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="rounded-3xl border border-zinc-200/70 bg-white/82 px-7 py-6 text-center shadow-[0_18px_45px_rgba(15,23,42,0.12)] backdrop-blur-md">
                  <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-zinc-950 text-white shadow-lg">
                    <MousePointerClick className="size-5" />
                  </div>
                  <p className="text-sm font-bold text-zinc-700">{t.canvas.emptyTitle}</p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  <span className="hidden md:inline">{t.canvas.emptyDesktop}</span>
                  <span className="md:hidden">{t.canvas.emptyMobile}</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="md:hidden flex justify-center mt-2 pointer-events-none">
            <span className="rounded-full border border-white/70 bg-white/90 px-3 py-1 text-[11px] font-bold text-zinc-600 shadow-lg backdrop-blur tabular-nums">
              {outputSizeMm.width} × {outputSizeMm.height} mm
            </span>
          </div>

          <div className="hidden md:block absolute -left-28 inset-y-0 pointer-events-none">
            <div className="relative h-full w-24">
              <div className="absolute left-14 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-zinc-500/55 to-transparent" />
              <div className="absolute left-10 top-0 h-px w-8 bg-zinc-500/45" />
              <div className="absolute left-10 bottom-0 h-px w-8 bg-zinc-500/45" />
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
                <span className="rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-xs font-bold text-zinc-700 shadow-lg backdrop-blur tabular-nums">
                  {outputSizeMm.height} mm
                </span>
              </div>
            </div>
          </div>

          <div className="hidden md:block absolute -bottom-14 inset-x-0 pointer-events-none">
            <div className="relative h-12 w-full">
              <div className="absolute inset-x-0 top-4 h-px bg-gradient-to-r from-transparent via-zinc-500/55 to-transparent" />
              <div className="absolute left-0 top-0 h-8 w-px bg-zinc-500/45" />
              <div className="absolute right-0 top-0 h-8 w-px bg-zinc-500/45" />
              <div className="absolute inset-x-0 top-0 flex justify-center">
                <span className="rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-xs font-bold text-zinc-700 shadow-lg backdrop-blur tabular-nums">
                  {outputSizeMm.width} mm
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
