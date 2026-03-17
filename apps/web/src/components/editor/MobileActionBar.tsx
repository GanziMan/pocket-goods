"use client";

import { Button } from "@/components/ui/button";
import {
  Undo2,
  Redo2,
  Plus,
  SlidersHorizontal,
  Trash2,
  Download,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

interface MobileActionBarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  hasSelection: boolean;
  onDelete: () => void;
  onOpenAssets: () => void;
  onOpenProperties: () => void;
  onExportPreview: () => void;
  isExporting?: boolean;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export default function MobileActionBar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  hasSelection,
  onDelete,
  onOpenAssets,
  onOpenProperties,
  onExportPreview,
  isExporting,
  zoom,
  onZoomIn,
  onZoomOut,
}: MobileActionBarProps) {
  return (
    <div className="flex items-center justify-around px-1 h-14 border-t bg-white shrink-0 safe-area-bottom">
      <div className="flex items-center gap-0.5">
        <ActionButton
          icon={<Undo2 className="w-4 h-4" />}
          label="실행취소"
          onClick={onUndo}
          disabled={!canUndo}
        />
        <ActionButton
          icon={<Redo2 className="w-4 h-4" />}
          label="재실행"
          onClick={onRedo}
          disabled={!canRedo}
        />
      </div>

      <div className="flex items-center gap-0.5">
        <ActionButton
          icon={<Plus className="w-4 h-4" />}
          label="에셋"
          onClick={onOpenAssets}
        />
        <ActionButton
          icon={<SlidersHorizontal className="w-4 h-4" />}
          label="속성"
          onClick={onOpenProperties}
        />
      </div>

      <div className="flex items-center gap-0.5">
        <ActionButton
          icon={<ZoomOut className="w-3.5 h-3.5" />}
          label={`${Math.round(zoom * 100)}%`}
          onClick={onZoomOut}
          disabled={zoom <= 0.5}
        />
        <ActionButton
          icon={<ZoomIn className="w-3.5 h-3.5" />}
          label="확대"
          onClick={onZoomIn}
          disabled={zoom >= 2.0}
        />
      </div>

      <div className="flex items-center gap-0.5">
        <ActionButton
          icon={<Trash2 className="w-4 h-4" />}
          label="삭제"
          onClick={onDelete}
          disabled={!hasSelection}
          destructive
        />
        <ActionButton
          icon={<Download className="w-4 h-4" />}
          label={isExporting ? "다운로드 중" : "내보내기"}
          onClick={onExportPreview}
          disabled={isExporting}
        />
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-0 h-11 w-11 px-0 ${
        destructive ? "text-red-500 hover:text-red-600 hover:bg-red-50" : ""
      }`}
    >
      {icon}
      <span className="text-[9px] leading-tight">{label}</span>
    </Button>
  );
}
