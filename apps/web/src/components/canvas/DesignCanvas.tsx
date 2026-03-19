"use client";

import { MousePointerClick } from "lucide-react";

interface DesignCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  outputSizeMm: { width: number; height: number };
  showGuide?: boolean;
}

export default function DesignCanvas({
  canvasRef,
  outputSizeMm,
  showGuide = false,
}: DesignCanvasProps) {
  return (
    <div className="w-full h-full bg-zinc-100 overflow-auto">
      {/* min-w-full: 캔버스가 작을 땐 뷰포트 기준 중앙 정렬, 클 땐 left edge부터 스크롤 (인위적 left padding 없음) */}
      <div className="flex items-center justify-center min-w-full min-h-full py-4">
        <div className="relative my-4 mx-auto md:my-16 md:mx-20 shrink-0">
          <div className="relative shadow-2xl rounded-sm overflow-hidden ring-1 ring-zinc-200 bg-white">
            <canvas ref={canvasRef} />
            {showGuide && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <MousePointerClick className="w-8 h-8 text-zinc-300 mb-2" />
                <p className="text-sm font-medium text-zinc-400">캔버스가 비어있어요</p>
                <p className="text-xs text-zinc-300 mt-1">
                  <span className="hidden md:inline">왼쪽 AI 탭에서 이미지를 생성하거나 텍스트를 추가하세요</span>
                  <span className="md:hidden">하단 에셋 버튼으로 이미지나 텍스트를 추가하세요</span>
                </p>
              </div>
            )}
          </div>

          {/* 모바일: 캔버스 아래 치수 표시 */}
          <div className="md:hidden flex justify-center mt-2 pointer-events-none">
            <span className="rounded-full border border-zinc-200/80 bg-white/90 backdrop-blur px-3 py-1 text-[11px] font-semibold text-zinc-500 shadow-sm tabular-nums">
              {outputSizeMm.width} × {outputSizeMm.height} mm
            </span>
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
