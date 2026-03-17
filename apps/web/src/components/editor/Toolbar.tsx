"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Undo2,
  Redo2,
  Trash2,
  BringToFront,
  SendToBack,
  Download,
  ShoppingCart,
  Save,
  CheckCheck,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { ProductType } from "@/lib/assets";
import UserMenu from "@/components/auth/UserMenu";

interface ToolbarProps {
  productType: ProductType;
  onProductTypeChange: (type: ProductType) => void;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  isDirty: boolean;
  savedAt: Date | null;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onSave: () => void;
  onExportPreview: () => void;
  onOrder: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

const PRODUCT_LABELS: Record<ProductType, string> = {
  keyring: "아크릴 키링",
  sticker: "투명 스티커",
};

function formatSavedAt(date: Date): string {
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Toolbar({
  productType,
  onProductTypeChange,
  canUndo,
  canRedo,
  hasSelection,
  isDirty,
  savedAt,
  onUndo,
  onRedo,
  onDelete,
  onBringForward,
  onSendBackward,
  onSave,
  onExportPreview,
  onOrder,
  zoom,
  onZoomIn,
  onZoomOut,
}: ToolbarProps) {
  return (
    <header className="flex items-center gap-2 px-4 h-14 border-b bg-white shrink-0">
      {/* 브랜드 */}
      <span className="font-bold text-lg tracking-tight mr-2">포켓굿즈</span>

      {/* 상품 타입 선택 */}
      <div className="flex gap-1">
        {(["keyring", "sticker"] as ProductType[]).map((type) => (
          <Badge
            key={type}
            variant={productType === type ? "default" : "outline"}
            className="cursor-pointer select-none py-3"
            onClick={() => onProductTypeChange(type)}
          >
            {PRODUCT_LABELS[type]}
          </Badge>
        ))}
      </div>

      {/* 편집 액션 */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          disabled={!canUndo}
          onClick={onUndo}
          title="실행 취소 (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={!canRedo}
          onClick={onRedo}
          title="다시 실행 (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </Button>
      </div>

      {/* 줌 */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomOut}
          disabled={zoom <= 0.5}
          title="줌 아웃"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-xs text-zinc-500 w-10 text-center tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomIn}
          disabled={zoom >= 2.0}
          title="줌 인"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>

      {/* 레이어 & 삭제 */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          disabled={!hasSelection}
          onClick={onBringForward}
          title="앞으로 보내기"
        >
          <BringToFront className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={!hasSelection}
          onClick={onSendBackward}
          title="뒤로 보내기"
        >
          <SendToBack className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={!hasSelection}
          onClick={onDelete}
          title="선택 삭제"
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* 오른쪽 정렬 */}
      <div className="ml-auto flex items-center gap-3">
        {/* 저장 상태 표시 */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          {isDirty ? (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
          ) : savedAt ? (
            <CheckCheck className="w-3.5 h-3.5 text-green-500" />
          ) : null}
          <span>
            {isDirty
              ? "저장되지 않은 변경사항"
              : savedAt
                ? `${formatSavedAt(savedAt)} 저장됨`
                : ""}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          title="저장 (Ctrl+S)"
        >
          <Save className="w-4 h-4 mr-1" />
          저장
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <Button variant="outline" size="sm" onClick={onExportPreview}>
          <Download className="w-4 h-4 mr-1" />
          다운로드
        </Button>
        <Button size="sm" onClick={onOrder}>
          <ShoppingCart className="w-4 h-4 mr-1" />
          주문하기
        </Button>

        <Separator orientation="vertical" className="h-6" />
        <UserMenu />
      </div>
    </header>
  );
}
