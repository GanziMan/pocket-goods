"use client";

import Image from "next/image";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CHARACTER_ASSETS, STICKER_ASSETS } from "@/lib/assets";
import { ImageIcon, Type, Smile, Sparkles } from "lucide-react";
import AIPanel from "@/components/editor/AIPanel";

interface AssetPanelProps {
  onAddCharacter: (src: string) => void;
  onAddText: (text: string) => void;
  onAddSticker: (emoji: string) => void;
  onGetCanvasImage: () => string;
}

export default function AssetPanel({
  onAddCharacter,
  onAddText,
  onAddSticker,
  onGetCanvasImage,
}: AssetPanelProps) {
  const [inputText, setInputText] = useState("나만의 문구");

  return (
    <aside className="w-64 border-r bg-white flex flex-col shrink-0">
      <Tabs defaultValue="characters" className="flex flex-col h-full">
        <TabsList className="w-full rounded-none border-b h-10 shrink-0">
         
          <TabsTrigger value="text" className="flex-1 gap-1 text-xs">
            <Type className="w-3.5 h-3.5" />
            텍스트
          </TabsTrigger>
          <TabsTrigger value="stickers" className="flex-1 gap-1 text-xs">
            <Smile className="w-3.5 h-3.5" />
            스티커
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex-1 gap-1 text-xs text-yellow-600">
            <Sparkles className="w-3.5 h-3.5" />
            AI
          </TabsTrigger>
        </TabsList>

        {/* ── 캐릭터 탭 ── */}
        <TabsContent value="characters" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-3 grid grid-cols-2 gap-2">
              {CHARACTER_ASSETS.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => onAddCharacter(asset.src)}
                  className="group relative aspect-square rounded-lg overflow-hidden border border-zinc-200 hover:border-primary hover:shadow-md transition-all bg-zinc-50"
                  title={asset.name}
                >
                  <Image
                    src={asset.src}
                    alt={asset.name}
                    fill
                    className="object-contain p-2 group-hover:scale-110 transition-transform"
                    unoptimized
                  />
                  <span className="absolute bottom-0 inset-x-0 text-[10px] text-center bg-white/80 py-0.5 truncate px-1">
                    {asset.name}
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
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

        {/* ── 스티커 탭 ── */}
        <TabsContent value="stickers" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-3 grid grid-cols-4 gap-2">
              {STICKER_ASSETS.map((sticker) => (
                <button
                  key={sticker.id}
                  onClick={() => onAddSticker(sticker.emoji)}
                  className="aspect-square rounded-lg border border-zinc-200 hover:border-primary hover:bg-zinc-50 hover:shadow-md transition-all flex items-center justify-center text-2xl"
                  title={sticker.name}
                >
                  {sticker.emoji}
                </button>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── AI 탭 ── */}
        <TabsContent value="ai" className="flex-1 m-0 overflow-hidden">
          <AIPanel
            onGetCanvasImage={onGetCanvasImage}
            onAddGeneratedImage={onAddCharacter}
          />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
