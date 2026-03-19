"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Type, Sparkles } from "lucide-react";
import AIPanel from "@/components/editor/AIPanel";
import { cn } from "@/lib/utils";

interface AssetPanelProps {
  onAddCharacter: (src: string) => void;
  onAddText: (text: string) => void;
  onGetCanvasImage: () => string;
  className?: string;
}

export default function AssetPanel({
  onAddCharacter,
  onAddText,
  onGetCanvasImage,
  className,
}: AssetPanelProps) {
  const [inputText, setInputText] = useState("나만의 문구");

  const isMobile = className?.includes("border-0");

  return (
    <aside className={cn("flex flex-col shrink-0 bg-white", className ?? "w-64 border-r")}>
      <Tabs defaultValue="ai" className="flex flex-col h-full">
        <TabsList
          variant={isMobile ? "line" : "default"}
          className={cn(
            "w-full shrink-0",
            isMobile ? "h-11 px-4 border-b border-zinc-200" : "rounded h-10 px-2"
          )}
        >
          <TabsTrigger value="ai" className={cn(
            "flex-1 gap-1.5 font-semibold",
            isMobile ? "text-sm" : "text-xs"
          )}>
            <Sparkles className={cn("w-3.5 h-3.5", isMobile && "w-4 h-4 text-yellow-500")} />
            AI
          </TabsTrigger>
          <TabsTrigger value="text" className={cn(
            "flex-1 gap-1.5 font-semibold",
            isMobile ? "text-sm" : "text-xs"
          )}>
            <Type className={cn("w-3.5 h-3.5", isMobile && "w-4 h-4")} />
            텍스트
          </TabsTrigger>
        </TabsList>

        {/* ── AI 탭 ── */}
        <TabsContent value="ai" className={cn(
          "flex-1 m-0",
          isMobile ? "overflow-visible" : "overflow-hidden"
        )}>
          <AIPanel
            onGetCanvasImage={onGetCanvasImage}
            onAddGeneratedImage={onAddCharacter}
            compact={isMobile}
          />
        </TabsContent>

        {/* ── 텍스트 탭 ── */}
        <TabsContent value="text" className="flex-1 m-0">
          <div className={cn(
            "flex flex-col gap-4",
            isMobile ? "p-3" : "p-4"
          )}>
            <div className="space-y-2">
              <Label htmlFor="text-input">문구 입력</Label>
              <Input
                id="text-input"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="원하는 문구를 입력하세요"
                maxLength={30}
              />
              <p className="text-xs text-muted-foreground text-right">
                {inputText.length}/30
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => onAddText(inputText || "텍스트")}
              disabled={!inputText.trim()}
            >
              캔버스에 추가
            </Button>

            <Separator />

            <p className="text-xs text-muted-foreground">
              텍스트를 추가한 뒤 선택하면 오른쪽 패널에서 폰트, 크기, 색상을
              변경할 수 있어요.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
