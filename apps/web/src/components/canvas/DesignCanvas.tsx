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
    <div className="flex items-center justify-center w-full h-full bg-zinc-100 overflow-auto">
      {/* 그림자 + 테두리로 캔버스 영역 강조 — 크기는 Fabric.js setDimensions가 관리 */}
      <div className="relative shadow-2xl rounded-sm overflow-hidden ring-1 ring-zinc-200 shrink-0">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
