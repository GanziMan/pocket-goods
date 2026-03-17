"use client";

import type { ProductType } from "@/lib/assets";

interface DesignCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  productType: ProductType;
}

export default function DesignCanvas({
  canvasRef,
  productType: _productType,
}: DesignCanvasProps) {
  return (
    <div className="w-full h-full bg-zinc-100 overflow-auto">
      {/* min-w-full: 캔버스가 작을 땐 뷰포트 기준 중앙 정렬, 클 땐 left edge부터 스크롤 (인위적 left padding 없음) */}
      <div className="flex items-center justify-center min-w-full min-h-full py-4">
        <div className="relative shadow-2xl rounded-sm overflow-hidden ring-1 ring-zinc-200 shrink-0">
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
}
