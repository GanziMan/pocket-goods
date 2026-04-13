"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FONT_OPTIONS } from "@/lib/assets";
import type { SelectedObjectInfo, TextUpdateProps } from "@/components/canvas/useCanvas";
import { MousePointer2, Scissors, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/client";

interface PropertiesPanelProps {
  selectedInfo: SelectedObjectInfo | null;
  onUpdateText: (props: Partial<TextUpdateProps>) => void;
  onUpdateOpacity: (opacity: number) => void;
  onGetSelectedImageDataURL: () => string | null;
  onReplaceSelectedImage: (src: string) => Promise<void>;
  className?: string;
}

export default function PropertiesPanel({
  selectedInfo, onUpdateText, onUpdateOpacity, onGetSelectedImageDataURL, onReplaceSelectedImage, className,
}: PropertiesPanelProps) {
  const [removingBg, setRemovingBg] = useState(false);
  const { t } = useLocale();
  const pr = t.properties;

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
      console.error("Background removal failed:", e);
    } finally {
      setRemovingBg(false);
    }
  };

  const isEmpty = !selectedInfo;

  return (
    <aside className={cn("flex flex-col shrink-0 bg-white/95 shadow-[-8px_0_30px_rgba(15,23,42,0.04)] backdrop-blur", className ?? "w-56 border-l border-zinc-200/80")}>
      <div className="px-4 py-3 border-b border-zinc-200/80 bg-gradient-to-b from-white to-zinc-50/60">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{pr.title}</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-zinc-400">
            <MousePointer2 className="w-8 h-8" />
            <p className="text-xs text-center px-4">{pr.emptyHint}</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">{pr.opacity} <span className="text-muted-foreground">{Math.round((selectedInfo.opacity ?? 1) * 100)}%</span></Label>
              <Slider min={0} max={1} step={0.01} value={[selectedInfo.opacity ?? 1]}
                onValueChange={(val) => { const v = typeof val === "number" ? val : (val as number[])[0] ?? 1; onUpdateOpacity(v); }} />
            </div>

            {selectedInfo.type === "image" && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-xs">{pr.imageEdit}</Label>
                  <Button variant="outline" size="sm" className="w-full" onClick={handleRemoveBackground} disabled={removingBg}>
                    {removingBg ? (<><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />{pr.removingBg}</>) : (<><Scissors className="w-3.5 h-3.5 mr-2" />{pr.removeBg}</>)}
                  </Button>
                  <p className="text-[10px] text-muted-foreground">{pr.removeBgHint}</p>
                </div>
              </>
            )}

            {(selectedInfo.type === "text" || selectedInfo.type === "nameTag") && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-xs">{pr.text}</Label>
                  <Input value={selectedInfo.text ?? ""} onChange={(e) => onUpdateText({ text: e.target.value })} className="h-8 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{pr.font}</Label>
                  <Select value={selectedInfo.fontFamily} onValueChange={(v) => v && onUpdateText({ fontFamily: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((font) => (<SelectItem key={font.value} value={font.value} className="text-xs">{font.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{pr.size} <span className="text-muted-foreground">{selectedInfo.fontSize}px</span></Label>
                  <Slider min={8} max={120} step={1} value={[selectedInfo.fontSize ?? 36]}
                    onValueChange={(val) => { const v = typeof val === "number" ? val : (val as number[])[0] ?? 36; onUpdateText({ fontSize: v }); }} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{pr.color}</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={typeof selectedInfo.fill === "string" && selectedInfo.fill.startsWith("#") ? selectedInfo.fill : "#1a1a1a"}
                      onChange={(e) => onUpdateText({ fill: e.target.value })} className="w-8 h-8 rounded cursor-pointer border border-zinc-200" />
                    <Input value={selectedInfo.fill ?? "#1a1a1a"} onChange={(e) => onUpdateText({ fill: e.target.value })} className="h-8 text-xs font-mono" maxLength={7} />
                  </div>
                </div>
                {selectedInfo.type === "nameTag" && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label className="text-xs">{pr.nameTagFill}</Label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={typeof selectedInfo.labelFill === "string" && selectedInfo.labelFill.startsWith("#") ? selectedInfo.labelFill : "#fff7ed"}
                          onChange={(e) => onUpdateText({ labelFill: e.target.value })} className="w-8 h-8 rounded cursor-pointer border border-zinc-200" />
                        <Input value={selectedInfo.labelFill ?? "#fff7ed"} onChange={(e) => onUpdateText({ labelFill: e.target.value })} className="h-8 text-xs font-mono" maxLength={7} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{pr.nameTagStroke}</Label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={typeof selectedInfo.labelStroke === "string" && selectedInfo.labelStroke.startsWith("#") ? selectedInfo.labelStroke : "#fb923c"}
                          onChange={(e) => onUpdateText({ labelStroke: e.target.value })} className="w-8 h-8 rounded cursor-pointer border border-zinc-200" />
                        <Input value={selectedInfo.labelStroke ?? "#fb923c"} onChange={(e) => onUpdateText({ labelStroke: e.target.value })} className="h-8 text-xs font-mono" maxLength={7} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{pr.nameTagStrokeWidth} <span className="text-muted-foreground">{selectedInfo.labelStrokeWidth ?? 3}px</span></Label>
                      <Slider min={0} max={12} step={1} value={[selectedInfo.labelStrokeWidth ?? 3]}
                        onValueChange={(val) => { const v = typeof val === "number" ? val : (val as number[])[0] ?? 3; onUpdateText({ labelStrokeWidth: v }); }} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{pr.nameTagRadius} <span className="text-muted-foreground">{selectedInfo.labelRadius ?? 28}px</span></Label>
                      <Slider min={0} max={48} step={1} value={[selectedInfo.labelRadius ?? 28]}
                        onValueChange={(val) => { const v = typeof val === "number" ? val : (val as number[])[0] ?? 28; onUpdateText({ labelRadius: v }); }} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{pr.nameTagPadding} <span className="text-muted-foreground">{selectedInfo.labelPaddingX ?? 34}px</span></Label>
                      <Slider min={12} max={80} step={1} value={[selectedInfo.labelPaddingX ?? 34]}
                        onValueChange={(val) => { const v = typeof val === "number" ? val : (val as number[])[0] ?? 34; onUpdateText({ labelPaddingX: v }); }} />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
