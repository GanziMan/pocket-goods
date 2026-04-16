"use client";

import { Button } from "@/components/ui/button";
import { Undo2, Redo2, PlusCircle, Trash2, Eye, ShoppingCart, Sparkles } from "lucide-react";
import { useLocale } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

interface MobileActionBarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  hasSelection: boolean;
  onDelete: () => void;
  onOpenAssets: () => void;
  onExportPreview: () => void;
  onOrder: () => void;
  isStarterMode?: boolean;
  isExporting?: boolean;
}

export default function MobileActionBar({
  canUndo, canRedo, onUndo, onRedo, hasSelection, onDelete, onOpenAssets, onExportPreview, onOrder, isStarterMode = false, isExporting,
}: MobileActionBarProps) {
  const { t } = useLocale();
  const tb = t.toolbar;

  return (
    <div className="grid grid-cols-[auto_minmax(88px,1fr)_auto] items-center gap-2 border-t bg-white/95 px-3 py-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur shrink-0 safe-area-bottom">
      <div className="flex items-center gap-1">
        <ActionButton icon={<Undo2 className="w-4 h-4" />} label={tb.undoShort} onClick={onUndo} disabled={!canUndo} compact />
        <ActionButton icon={<Redo2 className="w-4 h-4" />} label={tb.redoShort} onClick={onRedo} disabled={!canRedo} compact />
        <ActionButton icon={<Trash2 className="w-4 h-4" />} label={tb.delete} onClick={onDelete} disabled={!hasSelection} destructive compact />
      </div>

      <ActionButton
        icon={isStarterMode ? <Sparkles className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
        label={isStarterMode ? "AI 시작" : "+추가"}
        onClick={onOpenAssets}
        primary
        wide
      />

      <div className="flex items-center gap-1">
        <ActionButton icon={<Eye className="w-4 h-4" />} label={isExporting ? "준비중" : "미리보기"} onClick={onExportPreview} disabled={isExporting} compact />
        <ActionButton icon={<ShoppingCart className="w-4 h-4" />} label={tb.order} onClick={onOrder} compact emphasis />
      </div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, disabled, destructive, primary, compact, wide, emphasis }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  primary?: boolean;
  compact?: boolean;
  wide?: boolean;
  emphasis?: boolean;
}) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} disabled={disabled}
      className={cn(
        "flex flex-col items-center gap-0.5 px-0",
        primary
          ? "h-12 w-full rounded-2xl bg-zinc-950 text-white shadow-lg shadow-zinc-950/20 hover:bg-zinc-800 hover:text-white"
          : "h-11 w-11 rounded-2xl",
        compact && "h-11 w-10",
        wide && "min-w-24 px-3",
        destructive && !primary && "text-red-500 hover:text-red-600 hover:bg-red-50",
        emphasis && !primary && "text-zinc-950"
      )}>
      {icon}<span className="text-[10px] leading-tight">{label}</span>
    </Button>
  );
}
