"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Save, CheckCheck } from "lucide-react";
import UserMenu from "@/components/auth/UserMenu";
import { useLocale } from "@/lib/i18n/client";

interface MobileHeaderProps {
  onSave: () => void;
  isDirty: boolean;
  savedAt: Date | null;
}

export default function MobileHeader({
  onSave, isDirty, savedAt,
}: MobileHeaderProps) {
  const { t } = useLocale();
  const tb = t.toolbar;

  return (
    <header className="flex items-center gap-2 px-3 h-14 border-b bg-white shrink-0">
      <Link href="/" className="flex items-center select-none" aria-label={`${t.common.brandName} 홈으로 이동`}>
        <Image src="/logo.png" alt={t.common.brandName} width={98} height={41} priority className="h-7 w-auto" />
      </Link>

      <div className="ml-auto flex items-center gap-1.5">
        {isDirty ? (
          <span className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block shrink-0" />{tb.unsaved}
          </span>
        ) : savedAt ? (
          <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
            <CheckCheck className="w-3 h-3 shrink-0" />{tb.saved}
          </span>
        ) : null}

        <Button variant="ghost" size="icon" onClick={onSave} className="h-8 w-8"><Save className="w-4 h-4" /></Button>
        <UserMenu compact />
      </div>
    </header>
  );
}
