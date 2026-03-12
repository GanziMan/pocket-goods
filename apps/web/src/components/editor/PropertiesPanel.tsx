"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FONT_OPTIONS } from "@/lib/assets";
import type { SelectedObjectInfo, TextUpdateProps } from "@/components/canvas/useCanvas";
import { MousePointer2, Scissors, Loader2 } from "lucide-react";

interface PropertiesPanelProps {
  selectedInfo: SelectedObjectInfo | null;
  onUpdateText: (props: Partial<TextUpdateProps>) => void;
  onUpdateOpacity: (opacity: number) => void;
  onGetSelectedImageDataURL: () => string | null;
  onReplaceSelectedImage: (src: string) => Promise<void>;
}

export default function PropertiesPanel({
  selectedInfo,
  onUpdateText,
  onUpdateOpacity,
  onGetSelectedImageDataURL,
  onReplaceSelectedImage,
}: PropertiesPanelProps) {
  const [removingBg, setRemovingBg] = useState(false);

  const handleRemoveBackground = async () => {
    const dataURL = onGetSelectedImageDataURL();
    if (!dataURL) return;
    setRemovingBg(true);
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const resultBlob = await removeBackground(dataURL);
      const resultURL = URL.createObjectURL(resultBlob);
      await onReplaceSelectedImage(resultURL);
    } catch (e) {
      console.error("누끼 실패:", e);
    } finally {
      setRemovingBg(false);
    }
  };

  const isEmpty = !selectedInfo;

  return (
    <aside className="w-56 border-l bg-white flex flex-col shrink-0">
      <div className="px-4 py-3 border-b">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          속성
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-zinc-400">
            <MousePointer2 className="w-8 h-8" />
            <p className="text-xs text-center px-4">
              캔버스에서 오브젝트를 선택하면 속성을 편집할 수 있어요.
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* 투명도 — 모든 오브젝트 공통 */}
            <div className="space-y-2">
              <Label className="text-xs">
                투명도{" "}
                <span className="text-muted-foreground">
                  {Math.round((selectedInfo.opacity ?? 1) * 100)}%
                </span>
              </Label>
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={[selectedInfo.opacity ?? 1]}
                onValueChange={(val) => {
                  const v = typeof val === "number" ? val : (val as number[])[0] ?? 1;
                  onUpdateOpacity(v);
                }}
              />
            </div>

            {/* 이미지 전용 — 누끼 따기 */}
            {selectedInfo.type === "image" && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-xs">이미지 편집</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleRemoveBackground}
                    disabled={removingBg}
                  >
                    {removingBg ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                        누끼 따는 중…
                      </>
                    ) : (
                      <>
                        <Scissors className="w-3.5 h-3.5 mr-2" />
                        누끼 따기
                      </>
                    )}
                  </Button>
                  <p className="text-[10px] text-muted-foreground">
                    AI가 배경을 자동으로 제거합니다. 처음 실행 시 모델 다운로드로 잠시 걸릴 수 있어요.
                  </p>
                </div>
              </>
            )}

            {/* 텍스트 전용 속성 */}
            {selectedInfo.type === "text" && (
              <>
                <Separator />

                <div className="space-y-2">
                  <Label className="text-xs">텍스트</Label>
                  <Input
                    value={selectedInfo.text ?? ""}
                    onChange={(e) => onUpdateText({ text: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">폰트</Label>
                  <Select
                    value={selectedInfo.fontFamily}
                    onValueChange={(v) => v && onUpdateText({ fontFamily: v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((font) => (
                        <SelectItem key={font.value} value={font.value} className="text-xs">
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">
                    크기{" "}
                    <span className="text-muted-foreground">
                      {selectedInfo.fontSize}px
                    </span>
                  </Label>
                  <Slider
                    min={8}
                    max={120}
                    step={1}
                    value={[selectedInfo.fontSize ?? 36]}
                    onValueChange={(val) => {
                      const v = typeof val === "number" ? val : (val as number[])[0] ?? 36;
                      onUpdateText({ fontSize: v });
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">색상</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={
                        typeof selectedInfo.fill === "string" &&
                        selectedInfo.fill.startsWith("#")
                          ? selectedInfo.fill
                          : "#1a1a1a"
                      }
                      onChange={(e) => onUpdateText({ fill: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer border border-zinc-200"
                    />
                    <Input
                      value={selectedInfo.fill ?? "#1a1a1a"}
                      onChange={(e) => onUpdateText({ fill: e.target.value })}
                      className="h-8 text-xs font-mono"
                      maxLength={7}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
