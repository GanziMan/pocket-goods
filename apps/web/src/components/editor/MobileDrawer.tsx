"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  noPadding?: boolean;
}

export default function MobileDrawer({
  open,
  onClose,
  title,
  children,
  noPadding = false,
}: MobileDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[75vh] flex flex-col">
        <DrawerHeader className="shrink-0 pb-0">
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <div className={`flex-1 min-h-0 overflow-y-auto ${noPadding ? "pb-4" : "px-4 pb-4"}`}>
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
