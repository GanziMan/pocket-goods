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

  return (
    <aside className={cn("flex flex-col shrink-0 bg-white", className ?? "w-64 border-r")}>
      <Tabs defaultValue="ai" className="flex flex-col h-full">
        <TabsList className="w-full rounded-none border-b h-10 shrink-0">
          <TabsTrigger value="ai" className="flex-1 gap-1 text-xs text-yellow-600">
            <Sparkles className="w-3.5 h-3.5" />
            AI
          </TabsTrigger>
          <TabsTrigger value="text" className="flex-1 gap-1 text-xs">
            <Type className="w-3.5 h-3.5" />
            텍스트
          </TabsTrigger>
        </TabsList>

        {/* ── AI 탭 ── */}
        <TabsContent value="ai" className="flex-1 m-0 overflow-hidden">
          <AIPanel
            onGetCanvasImage={onGetCanvasImage}
            onAddGeneratedImage={onAddCharacter}
          />
        </TabsContent>

        {/* ── 텍스트 탭 ── */}
        <TabsContent value="text" className="flex-1 m-0">
          <div className="p-4 flex flex-col gap-4">
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
