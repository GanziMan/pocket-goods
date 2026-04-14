"use client";

import { Button } from "@/components/ui/button";
import { Undo2, Redo2, PlusCircle, Trash2, Eye, ShoppingBag, ShoppingCart } from "lucide-react";
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
  onOpenCart: () => void;
  isExporting?: boolean;
}

export default function MobileActionBar({
  canUndo, canRedo, onUndo, onRedo, hasSelection, onDelete, onOpenAssets, onExportPreview, onOrder, onOpenCart, isExporting,
}: MobileActionBarProps) {
  const { t } = useLocale();
  const tb = t.toolbar;

  return (
    <div className="flex items-center justify-around px-2 h-14 border-t bg-white shrink-0 safe-area-bottom">
      <div className="flex items-center gap-1">
        <ActionButton icon={<Undo2 className="w-4 h-4" />} label={tb.undoShort} onClick={onUndo} disabled={!canUndo} />
        <ActionButton icon={<Redo2 className="w-4 h-4" />} label={tb.redoShort} onClick={onRedo} disabled={!canRedo} />
      </div>
      <ActionButton icon={<PlusCircle className="w-5 h-5" />} label="+추가" onClick={onOpenAssets} primary />
      <ActionButton icon={<Trash2 className="w-4 h-4" />} label={tb.delete} onClick={onDelete} disabled={!hasSelection} destructive />
      <ActionButton icon={<Eye className="w-4 h-4" />} label={isExporting ? "준비중" : "미리보기"} onClick={onExportPreview} disabled={isExporting} />
      <ActionButton icon={<ShoppingCart className="w-4 h-4" />} label={tb.order} onClick={onOrder} />
      <ActionButton icon={<ShoppingBag className="w-4 h-4" />} label="주문함" onClick={onOpenCart} />
    </div>
  );
}

function ActionButton({ icon, label, onClick, disabled, destructive, primary }: {
  icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; destructive?: boolean; primary?: boolean;
}) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} disabled={disabled}
      className={`flex flex-col items-center gap-0.5 h-12 px-0 ${
        primary
          ? "w-14 rounded-2xl bg-zinc-950 text-white shadow-lg shadow-zinc-950/20 hover:bg-zinc-800 hover:text-white"
          : `w-12 ${destructive ? "text-red-500 hover:text-red-600 hover:bg-red-50" : ""}`
      }`}>
      {icon}<span className="text-[10px] leading-tight">{label}</span>
    </Button>
  );
}
