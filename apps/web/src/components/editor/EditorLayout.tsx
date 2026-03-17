"use client";

import { useState, useCallback, useEffect } from "react";
import { useCanvas } from "@/components/canvas/useCanvas";
import { useBeforeUnload } from "@/hooks/useBeforeUnload";
import { useSaveDesign } from "@/hooks/useSaveDesign";
import DesignCanvas from "@/components/canvas/DesignCanvas";
import Toolbar from "@/components/editor/Toolbar";
import AssetPanel from "@/components/editor/AssetPanel";
import PropertiesPanel from "@/components/editor/PropertiesPanel";
import MobileHeader from "@/components/editor/MobileHeader";
import MobileActionBar from "@/components/editor/MobileActionBar";
import MobileDrawer from "@/components/editor/MobileDrawer";
import type { ProductType } from "@/lib/assets";
import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EditorLayout() {
  const [productType, setProductTypeState] = useState<ProductType>("keyring");
  const [mobilePanel, setMobilePanel] = useState<"assets" | "properties" | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const {
    canvasRef,
    isCanvasReady,
    canUndo,
    canRedo,
    selectedInfo,
    addCharacter,
    addText,
    addSticker,
    updateSelectedText,
    updateSelectedOpacity,
    getSelectedImageDataURL,
    replaceSelectedImage,
    deleteSelected,
    bringForward,
    sendBackward,
    undo,
    redo,
    toJSON,
    toDataURL,
    loadDesign,
    setProductType,
    onChangeCb,
    zoom,
    zoomIn,
    zoomOut,
  } = useCanvas(productType);

  const { save, loadDraft, markDirty, savedAt, isDirty } = useSaveDesign(
    toJSON,
    toDataURL,
    productType
  );

  // 변경 시 dirty 표시
  useEffect(() => {
    onChangeCb.current = markDirty;
  }, [onChangeCb, markDirty]);

  // 키보드 단축키
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Ctrl+Z / Cmd+Z → 실행 취소 (텍스트 입력 중엔 브라우저 기본 동작 유지)
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        if (isTyping) return;
        e.preventDefault();
        undo();
        return;
      }

      // Ctrl+Y / Cmd+Shift+Z → 다시 실행
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        if (isTyping) return;
        e.preventDefault();
        redo();
        return;
      }

      // Backspace / Delete → 선택 요소 삭제
      if ((e.key === "Backspace" || e.key === "Delete") && !isTyping) {
        e.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, deleteSelected]);

  // 저장되지 않은 변경사항 있을 때 브라우저 이탈 경고
  useBeforeUnload(isDirty);

  // 모바일에서 채널톡 숨기기
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const toggle = (e: MediaQueryListEvent | MediaQueryList) => {
      if (typeof window.ChannelIO === "function") {
        window.ChannelIO(e.matches ? "hideChannelButton" : "showChannelButton");
      }
    };
    toggle(mq);
    mq.addEventListener("change", toggle);
    return () => {
      mq.removeEventListener("change", toggle);
      if (typeof window.ChannelIO === "function") {
        window.ChannelIO("showChannelButton");
      }
    };
  }, []);

  // 캔버스 준비 완료 후 저장된 드래프트 복원 여부 확인
  useEffect(() => {
    if (!isCanvasReady) return;
    const draft = loadDraft();
    if (!draft) return;
    const savedDate = new Date(draft.savedAt);
    const timeStr = savedDate.toLocaleString("ko-KR");
    const restore = window.confirm(
      `저장된 디자인이 있습니다 (${timeStr})\n\n이어서 작업하시겠습니까?`
    );
    if (restore) {
      loadDesign(draft.canvasJSON);
      if (draft.productType === "keyring" || draft.productType === "sticker") {
        setProductTypeState(draft.productType as ProductType);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCanvasReady]);

  const handleProductTypeChange = useCallback(
    (type: ProductType) => {
      setProductTypeState(type);
      setProductType(type);
    },
    [setProductType]
  );

  const handleExportPreview = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/export`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            canvas_json: toJSON(),
            product_type: productType,
            save_to_storage: false,
          }),
        }
      );
      if (!res.ok) throw new Error("Export 실패");
      const zipBlob = await res.blob();
      const zipUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = zipUrl;
      link.download = `pocketgoods-${productType}-${Date.now()}.zip`;
      link.click();
      URL.revokeObjectURL(zipUrl);
    } catch {
      // 서버 미실행 시 클라이언트 PNG로 fallback
      const dataURL = toDataURL();
      const link = document.createElement("a");
      link.href = dataURL;
      link.download = `pocketgoods-preview-${Date.now()}.png`;
      link.click();
    } finally {
      setIsExporting(false);
    }
  }, [toJSON, toDataURL, productType, isExporting]);

  const handleOrder = useCallback(() => {
    alert("주문 기능은 준비 중입니다 🛒");
  }, []);

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-zinc-50">
      {/* 상단: 데스크탑=Toolbar, 모바일=MobileHeader */}
      <div className="hidden md:block">
        <Toolbar
          productType={productType}
          onProductTypeChange={handleProductTypeChange}
          canUndo={canUndo}
          canRedo={canRedo}
          hasSelection={!!selectedInfo}
          isDirty={isDirty}
          savedAt={savedAt}
          onUndo={undo}
          onRedo={redo}
          onDelete={deleteSelected}
          onBringForward={bringForward}
          onSendBackward={sendBackward}
          onSave={save}
          onExportPreview={handleExportPreview}
          onOrder={handleOrder}
          isExporting={isExporting}
        />
      </div>
      <div className="block md:hidden">
        <MobileHeader
          productType={productType}
          onProductTypeChange={handleProductTypeChange}
          onSave={save}
          isDirty={isDirty}
          savedAt={savedAt}
        />
      </div>

      {/* 메인 영역 */}
      <div className="flex flex-1 min-h-0">
        <div className="hidden md:flex">
          <AssetPanel
            onAddCharacter={addCharacter}
            onAddText={addText}
            onAddSticker={addSticker}
            onGetCanvasImage={toDataURL}
          />
        </div>

        <main className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-auto p-2 md:p-8">
            <DesignCanvas canvasRef={canvasRef} productType={productType} />
          </div>
          {/* 줌 컨트롤 — 캔버스 바로 아래 (데스크탑 전용) */}
          <div className="hidden md:flex items-center justify-center gap-2 py-2 border-t bg-white shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={zoomOut}
              disabled={zoom <= 0.5}
              title="줌 아웃"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs text-zinc-500 w-12 text-center tabular-nums select-none">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={zoomIn}
              disabled={zoom >= 2.0}
              title="줌 인"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </main>

        <div className="hidden md:flex">
          <PropertiesPanel
            selectedInfo={selectedInfo}
            onUpdateText={updateSelectedText}
            onUpdateOpacity={updateSelectedOpacity}
            onGetSelectedImageDataURL={getSelectedImageDataURL}
            onReplaceSelectedImage={replaceSelectedImage}
          />
        </div>
      </div>

      {/* 모바일 하단 액션바 */}
      <div className="block md:hidden">
        <MobileActionBar
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          hasSelection={!!selectedInfo}
          onDelete={deleteSelected}
          onOpenAssets={() => setMobilePanel("assets")}
          onOpenProperties={() => setMobilePanel("properties")}
          onExportPreview={handleExportPreview}
          isExporting={isExporting}
          zoom={zoom}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
        />
      </div>

      {/* 모바일 하단 시트 */}
      <MobileDrawer
        open={mobilePanel === "assets"}
        onClose={() => setMobilePanel(null)}
        title="에셋"
      >
        <AssetPanel
          onAddCharacter={addCharacter}
          onAddText={addText}
          onAddSticker={addSticker}
          onGetCanvasImage={toDataURL}
          className="w-full border-0"
        />
      </MobileDrawer>
      <MobileDrawer
        open={mobilePanel === "properties"}
        onClose={() => setMobilePanel(null)}
        title="속성"
      >
        <PropertiesPanel
          selectedInfo={selectedInfo}
          onUpdateText={updateSelectedText}
          onUpdateOpacity={updateSelectedOpacity}
          onGetSelectedImageDataURL={getSelectedImageDataURL}
          onReplaceSelectedImage={replaceSelectedImage}
          className="w-full border-0"
        />
      </MobileDrawer>
    </div>
  );
}
