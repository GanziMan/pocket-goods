"use client";

import { type ProductType, PRODUCT_CANVAS_SIZE } from "@/lib/assets";

interface DesignCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  productType: ProductType;
}

export default function DesignCanvas({
  canvasRef,
  productType,
}: DesignCanvasProps) {
  const { width, height } = PRODUCT_CANVAS_SIZE[productType];

  return (
    <div className="flex items-center justify-center w-full h-full bg-zinc-100">
      {/* 그림자 + 테두리로 캔버스 영역 강조 */}
      <div
        className="relative shadow-2xl rounded-sm overflow-hidden ring-1 ring-zinc-200"
        style={{ width, height }}
      >
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
