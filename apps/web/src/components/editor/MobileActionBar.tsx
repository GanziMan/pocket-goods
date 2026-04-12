"use client";

import { Button } from "@/components/ui/button";
import { Undo2, Redo2, Plus, Trash2, Eye, ShoppingCart } from "lucide-react";
import { useLocale } from "@/lib/i18n/client";

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
  isExporting?: boolean;
}

export default function MobileActionBar({
  canUndo, canRedo, onUndo, onRedo, hasSelection, onDelete, onOpenAssets, onExportPreview, onOrder, isExporting,
}: MobileActionBarProps) {
  const { t } = useLocale();
  const tb = t.toolbar;

  return (
    <div className="flex items-center justify-around px-2 h-14 border-t bg-white shrink-0 safe-area-bottom">
      <div className="flex items-center gap-1">
        <ActionButton icon={<Undo2 className="w-4 h-4" />} label={tb.undoShort} onClick={onUndo} disabled={!canUndo} />
        <ActionButton icon={<Redo2 className="w-4 h-4" />} label={tb.redoShort} onClick={onRedo} disabled={!canRedo} />
      </div>
      <ActionButton icon={<Plus className="w-4 h-4" />} label={tb.assets} onClick={onOpenAssets} />
      <ActionButton icon={<Trash2 className="w-4 h-4" />} label={tb.delete} onClick={onDelete} disabled={!hasSelection} destructive />
      <ActionButton icon={<Eye className="w-4 h-4" />} label={isExporting ? "준비중" : "미리보기"} onClick={onExportPreview} disabled={isExporting} />
      <ActionButton icon={<ShoppingCart className="w-4 h-4" />} label={tb.order} onClick={onOrder} />
    </div>
  );
}

function ActionButton({ icon, label, onClick, disabled, destructive }: {
  icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; destructive?: boolean;
}) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} disabled={disabled}
      className={`flex flex-col items-center gap-0.5 h-12 w-12 px-0 ${destructive ? "text-red-500 hover:text-red-600 hover:bg-red-50" : ""}`}>
      {icon}<span className="text-[10px] leading-tight">{label}</span>
    </Button>
  );
}
