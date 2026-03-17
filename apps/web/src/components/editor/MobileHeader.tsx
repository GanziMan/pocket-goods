"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Save, CheckCheck } from "lucide-react";
import type { ProductType } from "@/lib/assets";

const PRODUCT_LABELS: Record<ProductType, string> = {
  keyring: "키링",
  sticker: "스티커",
};

interface MobileHeaderProps {
  productType: ProductType;
  onProductTypeChange: (type: ProductType) => void;
  onSave: () => void;
  isDirty: boolean;
  savedAt: Date | null;
}

export default function MobileHeader({
  productType,
  onProductTypeChange,
  onSave,
  isDirty,
  savedAt,
}: MobileHeaderProps) {
  return (
    <header className="flex items-center gap-2 px-3 h-12 border-b bg-white shrink-0">
      <span className="font-bold text-sm tracking-tight">포켓굿즈</span>

      <div className="flex gap-1">
        {(["keyring", "sticker"] as ProductType[]).map((type) => (
          <Badge
            key={type}
            variant={productType === type ? "default" : "outline"}
            className="cursor-pointer select-none text-[11px] px-2 py-0.5"
            onClick={() => onProductTypeChange(type)}
          >
            {PRODUCT_LABELS[type]}
          </Badge>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {isDirty ? (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
        ) : savedAt ? (
          <CheckCheck className="w-3.5 h-3.5 text-green-500" />
        ) : null}

        <Button variant="ghost" size="icon" onClick={onSave} className="h-8 w-8">
          <Save className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
