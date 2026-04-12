"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ImagePlus, Type, Sparkles } from "lucide-react";
import AIPanel from "@/components/editor/AIPanel";
import PhotoPanel from "@/components/editor/PhotoPanel";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/client";

interface AssetPanelProps {
  onAddCharacter: (src: string) => void;
  onAddText: (text: string) => void;
  onGetCanvasImage: () => string;
  className?: string;
}

export default function AssetPanel({
  onAddCharacter, onAddText, onGetCanvasImage, className,
}: AssetPanelProps) {
  const { t } = useLocale();
  const ap = t.assetPanel;
  const [inputText, setInputText] = useState(ap.defaultText);
  const isMobile = className?.includes("border-0");

  return (
    <aside className={cn("flex flex-col shrink-0 bg-white/95 shadow-[8px_0_30px_rgba(15,23,42,0.04)] backdrop-blur", className ?? "w-64 border-r border-zinc-200/80")}>
      <Tabs defaultValue="ai" className="flex flex-col h-full">
        <TabsList variant={isMobile ? "line" : "default"}
          className={cn("w-full shrink-0", isMobile ? "h-11 px-4 border-b border-zinc-200" : "rounded h-10 px-2")}>
          <TabsTrigger value="ai" className={cn("flex-1 gap-1.5 font-semibold", isMobile ? "text-sm" : "text-xs")}>
            <Sparkles className={cn("w-3.5 h-3.5", isMobile && "w-4 h-4 text-yellow-500")} />{ap.aiTab}
          </TabsTrigger>
          <TabsTrigger value="photo" className={cn("flex-1 gap-1.5 font-semibold", isMobile ? "text-sm" : "text-xs")}>
            <ImagePlus className={cn("w-3.5 h-3.5", isMobile && "w-4 h-4")} />사진
          </TabsTrigger>
          <TabsTrigger value="text" className={cn("flex-1 gap-1.5 font-semibold", isMobile ? "text-sm" : "text-xs")}>
            <Type className={cn("w-3.5 h-3.5", isMobile && "w-4 h-4")} />{ap.textTab}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className={cn("flex-1 m-0", isMobile ? "overflow-visible" : "overflow-hidden")}>
          <AIPanel onGetCanvasImage={onGetCanvasImage} onAddGeneratedImage={onAddCharacter} compact={isMobile} />
        </TabsContent>

        <TabsContent value="photo" className={cn("flex-1 m-0", isMobile ? "overflow-visible" : "overflow-hidden")}>
          <PhotoPanel onAddImage={onAddCharacter} compact={isMobile} />
        </TabsContent>

        <TabsContent value="text" className="flex-1 m-0">
          <div className={cn("flex flex-col gap-4", isMobile ? "p-3" : "p-4")}>
            <div className="space-y-2">
              <Label htmlFor="text-input">{ap.textInputLabel}</Label>
              <Input id="text-input" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder={ap.textInputPlaceholder} maxLength={30} />
              <p className="text-xs text-muted-foreground text-right">{inputText.length}/30</p>
            </div>
            <Button className="w-full" onClick={() => onAddText(inputText || ap.fallbackText)} disabled={!inputText.trim()}>
              {ap.addToCanvas}
            </Button>
            <Separator />
            <p className="text-xs text-muted-foreground">{ap.textHint}</p>
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
