"use client";

interface DesignCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  outputSizeMm: { width: number; height: number };
}

export default function DesignCanvas({
  canvasRef,
  outputSizeMm,
}: DesignCanvasProps) {
  return (
    <div className="w-full h-full bg-zinc-100 overflow-auto">
      {/* min-w-full: 캔버스가 작을 땐 뷰포트 기준 중앙 정렬, 클 땐 left edge부터 스크롤 (인위적 left padding 없음) */}
      <div className="flex items-center justify-center min-w-full min-h-full py-4">
        <div className="relative my-16 mx-20 shrink-0">
          <div className="relative shadow-2xl rounded-sm overflow-hidden ring-1 ring-zinc-200 bg-white">
            <canvas ref={canvasRef} />
          </div>

          <div className="hidden md:block absolute -left-28 inset-y-0 pointer-events-none">
            <div className="relative h-full w-24">
              <div className="absolute left-14 top-0 bottom-0 w-px bg-zinc-900/35" />
              <div className="absolute left-10 top-0 h-px w-8 bg-zinc-900/35" />
              <div className="absolute left-10 bottom-0 h-px w-8 bg-zinc-900/35" />
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
                <span className="rounded-full border border-zinc-200/80 bg-white/90 backdrop-blur px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm tabular-nums">
                  {outputSizeMm.height} mm
                </span>
              </div>
            </div>
          </div>

          <div className="hidden md:block absolute -bottom-14 inset-x-0 pointer-events-none">
            <div className="relative h-12 w-full">
              <div className="absolute inset-x-0 top-4 h-px bg-zinc-900/35" />
              <div className="absolute left-0 top-0 w-px h-8 bg-zinc-900/35" />
              <div className="absolute right-0 top-0 w-px h-8 bg-zinc-900/35" />
              <div className="absolute inset-x-0 top-0 flex justify-center">
                <span className="rounded-full border border-zinc-200/80 bg-white/90 backdrop-blur px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm tabular-nums">
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
