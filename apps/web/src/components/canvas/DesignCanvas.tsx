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
    <div className="relative h-full w-full overflow-auto bg-[linear-gradient(180deg,#fafafa_0%,#f1f2f4_100%)]">
      <div className="absolute inset-0 opacity-[0.55] [background-image:linear-gradient(rgba(24,24,27,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(24,24,27,0.045)_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="relative flex min-h-full min-w-full items-center justify-center px-3 py-5 md:px-16 md:py-16">
        <div className="relative mx-auto shrink-0">
          <div className="relative overflow-hidden rounded-[22px] border border-zinc-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.14)] ring-1 ring-white/80 md:rounded-[28px]">
            <canvas ref={canvasRef} />
            {showGuide && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-4">
                <div className="max-w-[260px] rounded-3xl border border-zinc-200/80 bg-white/92 px-6 py-5 text-center shadow-[0_14px_35px_rgba(15,23,42,0.12)] backdrop-blur">
                  <div className="mx-auto mb-3 grid size-11 place-items-center rounded-2xl bg-zinc-950 text-white shadow-md">
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
            <span className="rounded-full border border-zinc-900 bg-white px-3 py-1 text-[11px] font-bold text-zinc-900 shadow-sm tabular-nums">
              {outputSizeMm.width} × {outputSizeMm.height} mm
            </span>
          </div>

          <div className="hidden md:block absolute -left-28 inset-y-0 pointer-events-none">
            <div className="relative h-full w-24">
              <div className="absolute bottom-0 left-14 top-0 w-0.5 bg-zinc-900" />
              <div className="absolute left-10 top-0 h-0.5 w-8 bg-zinc-900" />
              <div className="absolute left-10 bottom-0 h-0.5 w-8 bg-zinc-900" />
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
                <span className="rounded-full border border-zinc-900 bg-white px-3 py-1.5 text-xs font-bold text-zinc-950 shadow-sm tabular-nums">
                  {outputSizeMm.height} mm
                </span>
              </div>
            </div>
          </div>

          <div className="hidden md:block absolute -bottom-14 inset-x-0 pointer-events-none">
            <div className="relative h-12 w-full">
              <div className="absolute inset-x-0 top-4 h-0.5 bg-zinc-900" />
              <div className="absolute left-0 top-0 h-8 w-0.5 bg-zinc-900" />
              <div className="absolute right-0 top-0 h-8 w-0.5 bg-zinc-900" />
              <div className="absolute inset-x-0 top-0 flex justify-center">
                <span className="rounded-full border border-zinc-900 bg-white px-3 py-1.5 text-xs font-bold text-zinc-950 shadow-sm tabular-nums">
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
