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

export default function EditorLayout() {
  const [productType, setProductTypeState] = useState<ProductType>("keyring");
  const [mobilePanel, setMobilePanel] = useState<"assets" | "properties" | null>(null);

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

  // 저장되지 않은 변경사항 있을 때 브라우저 이탈 경고
  useBeforeUnload(isDirty);

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
    // 인쇄용 300 DPI PNG — FastAPI 서버 경유
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
      const data = await res.json() as { png_base64: string; cutting_line_svg: string | null };
      const ts = Date.now();

      // PNG 다운로드
      const pngBytes = Uint8Array.from(atob(data.png_base64), (c) => c.charCodeAt(0));
      const pngBlob = new Blob([pngBytes], { type: "image/png" });
      const pngUrl = URL.createObjectURL(pngBlob);
      const pngLink = document.createElement("a");
      pngLink.href = pngUrl;
      pngLink.download = `pocketgoods-print-${productType}-${ts}.png`;
      pngLink.click();
      URL.revokeObjectURL(pngUrl);

      // 칼선 SVG 다운로드
      if (data.cutting_line_svg) {
        const svgBlob = new Blob([data.cutting_line_svg], { type: "image/svg+xml" });
        const svgUrl = URL.createObjectURL(svgBlob);
        const svgLink = document.createElement("a");
        svgLink.href = svgUrl;
        svgLink.download = `pocketgoods-cutting-line-${productType}-${ts}.svg`;
        svgLink.click();
        URL.revokeObjectURL(svgUrl);
      }
    } catch {
      // 서버 미실행 시 클라이언트 PNG로 fallback
      const dataURL = toDataURL();
      const link = document.createElement("a");
      link.href = dataURL;
      link.download = `pocketgoods-preview-${Date.now()}.png`;
      link.click();
    }
  }, [toJSON, toDataURL, productType]);

  const handleOrder = useCallback(() => {
    alert("주문 기능은 준비 중입니다 🛒");
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-zinc-50">
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
          zoom={zoom}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
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

        <main className="flex-1 overflow-auto p-2 md:p-8">
          <DesignCanvas canvasRef={canvasRef} productType={productType} />
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
