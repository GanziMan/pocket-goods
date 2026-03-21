"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Undo2, Redo2, Trash2, BringToFront, SendToBack, Download, ShoppingCart, Save, CheckCheck, Loader2,
} from "lucide-react";
import type { ProductType } from "@/lib/assets";
import UserMenu from "@/components/auth/UserMenu";
import { useLocale, tpl } from "@/lib/i18n/client";

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
  isExporting?: boolean;
}

export default function Toolbar({
  productType, onProductTypeChange, canUndo, canRedo, hasSelection, isDirty, savedAt,
  onUndo, onRedo, onDelete, onBringForward, onSendBackward, onSave, onExportPreview, isExporting,
}: ToolbarProps) {
  const { locale, t } = useLocale();
  const tb = t.toolbar;

  const PRODUCT_LABELS: Record<ProductType, string> = {
    keyring: tb.keyring,
    sticker: tb.sticker,
  };

  return (
    <header className="flex items-center gap-2 px-4 h-14 border-b bg-white shrink-0">
      <Link href="/" className="font-bold text-lg tracking-tight mr-2 select-none">{t.common.brandName}</Link>

      <div className="flex gap-1">
        {(["keyring", "sticker"] as ProductType[]).map((type) => (
          <Badge key={type} variant={productType === type ? "default" : "outline"} className="cursor-pointer select-none py-3" onClick={() => onProductTypeChange(type)}>
            {PRODUCT_LABELS[type]}
          </Badge>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" disabled={!canUndo} onClick={onUndo} title={`${tb.undo} (${tb.undoShortcut})`}><Undo2 className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" disabled={!canRedo} onClick={onRedo} title={`${tb.redo} (${tb.redoShortcut})`}><Redo2 className="w-4 h-4" /></Button>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" disabled={!hasSelection} onClick={onBringForward} title={tb.bringForward}><BringToFront className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" disabled={!hasSelection} onClick={onSendBackward} title={tb.sendBackward}><SendToBack className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" disabled={!hasSelection} onClick={onDelete} title={tb.deleteSelected} className="text-red-500 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          {isDirty ? (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
          ) : savedAt ? (
            <CheckCheck className="w-3.5 h-3.5 text-green-500" />
          ) : null}
          <span>
            {isDirty ? tb.unsavedChanges : savedAt ? tpl(tb.savedAt, { time: savedAt.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) }) : ""}
          </span>
        </div>

        <Button variant="outline" size="sm" onClick={onSave} title={`${tb.save} (${tb.saveShortcut})`}>
          <Save className="w-4 h-4 mr-1" />{tb.save}
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <Button variant="outline" size="sm" onClick={onExportPreview} disabled={isExporting}>
          {isExporting ? (<><Loader2 className="w-4 h-4 mr-1 animate-spin" />{tb.downloading}</>) : (<><Download className="w-4 h-4 mr-1" />{t.common.download}</>)}
        </Button>
        <Button size="sm" disabled title={tb.orderDisabledTitle}>
          <ShoppingCart className="w-4 h-4 mr-1" />{tb.order}
        </Button>

        <Separator orientation="vertical" className="h-6" />
        <UserMenu />
      </div>
    </header>
  );
}
