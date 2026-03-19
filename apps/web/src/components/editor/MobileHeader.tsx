"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Save, CheckCheck } from "lucide-react";
import type { ProductType } from "@/lib/assets";
import UserMenu from "@/components/auth/UserMenu";

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
      <Link href="/" className="font-bold text-sm tracking-tight select-none">포켓굿즈</Link>

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
          <span className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block shrink-0" />
            미저장
          </span>
        ) : savedAt ? (
          <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
            <CheckCheck className="w-3 h-3 shrink-0" />
            저장됨
          </span>
        ) : null}

        <Button variant="ghost" size="icon" onClick={onSave} className="h-8 w-8">
          <Save className="w-4 h-4" />
        </Button>
        <UserMenu compact />
      </div>
    </header>
  );
}
