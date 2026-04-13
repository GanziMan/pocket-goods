"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import type { ProductType } from "@/lib/assets";
import { PRODUCT_CANVAS_SIZE } from "@/lib/assets";

// Fabric v7 — 브라우저 전용이므로 동적 import
type FabricCanvas = import("fabric").Canvas;
type FabricObject = import("fabric").FabricObject;
type FabricText = import("fabric").FabricText;

export interface SelectedObjectInfo {
  type: "text" | "image" | "nameTag" | "other";
  text?: string;
  fontSize?: number;
  fill?: string;
  fontFamily?: string;
  opacity?: number;
  labelFill?: string;
  labelStroke?: string;
  labelStrokeWidth?: number;
  labelRadius?: number;
  labelPaddingX?: number;
  labelPaddingY?: number;
}

export interface UseCanvasReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isCanvasReady: boolean;
  hasObjects: boolean;
  canUndo: boolean;
  canRedo: boolean;
  selectedInfo: SelectedObjectInfo | null;
  addCharacter: (src: string) => Promise<void>;
  addText: (text: string) => void;
  addNameTag: (text: string) => void;
  addSticker: (emoji: string) => void;
  updateSelectedText: (props: Partial<TextUpdateProps>) => void;
  updateSelectedOpacity: (opacity: number) => void;
  replaceSelectedImage: (src: string) => Promise<void>;
  deleteSelected: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  toJSON: () => object;
  toDataURL: () => string;
  getSelectedImageDataURL: () => string | null;
  loadDesign: (json: object) => Promise<void>;
  setProductType: (type: ProductType) => void;
  setCanvasSize: (size: { width: number; height: number }) => void;
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  setZoom: (level: number) => void;
  onChangeCb: React.MutableRefObject<(() => void) | null>;
}

export interface TextUpdateProps {
  text: string;
  fontSize: number;
  fill: string;
  fontFamily: string;
  labelFill: string;
  labelStroke: string;
  labelStrokeWidth: number;
  labelRadius: number;
  labelPaddingX: number;
  labelPaddingY: number;
}

const MAX_HISTORY = 30;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.25;
const BASE_CORNER_SIZE = 13;
const BASE_BORDER_WIDTH = 1;
const BASE_TOUCH_CORNER_SIZE = 24;
const FABRIC_EXPORT_PROPS = [
  "pocketGoodsKind",
  "pocketGoodsRole",
  "labelText",
  "labelFill",
  "labelStroke",
  "labelStrokeWidth",
  "labelRadius",
  "labelPaddingX",
  "labelPaddingY",
  "labelFontSize",
  "labelFontFamily",
  "labelTextFill",
] as const;

type CustomFabricObject = FabricObject & Record<string, unknown> & {
  getObjects?: () => FabricObject[];
};
type FabricCanvasWithCustomJson = FabricCanvas & {
  toJSON: (propertiesToInclude?: readonly string[]) => object;
};

function isTextObject(obj: FabricObject): boolean {
  return ["i-text", "itext", "text", "textbox"].includes(String(obj.type ?? "").toLowerCase());
}

function isNameTagObject(obj: FabricObject): boolean {
  return (obj as CustomFabricObject).pocketGoodsKind === "name-tag";
}

function getGroupObjects(obj: FabricObject): FabricObject[] {
  return (obj as CustomFabricObject).getObjects?.() ?? [];
}

function findNameTagText(obj: FabricObject): FabricText | null {
  const textObj = getGroupObjects(obj).find((child) => {
    const custom = child as CustomFabricObject;
    return custom.pocketGoodsRole === "label-text" || isTextObject(child);
  });
  return (textObj as FabricText | undefined) ?? null;
}

function findNameTagPill(obj: FabricObject): FabricObject | null {
  return (
    getGroupObjects(obj).find((child) => {
      const custom = child as CustomFabricObject;
      return custom.pocketGoodsRole === "label-pill" || String(child.type ?? "").toLowerCase() === "rect";
    }) ?? null
  );
}

function getNumberProp(obj: Record<string, unknown>, key: string, fallback: number): number {
  const value = obj[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getStringProp(obj: Record<string, unknown>, key: string, fallback: string): string {
  const value = obj[key];
  return typeof value === "string" ? value : fallback;
}

/** blob: URL → data URL 변환 (백엔드 전송 가능하도록) */
async function toDataURLFromSrc(src: string): Promise<string> {
  if (!src.startsWith("blob:")) return src;
  const res = await fetch(src).catch((error) => {
    throw new Error("이미지 임시 URL이 만료되었습니다. 사진을 다시 선택한 뒤 추가해주세요.", {
      cause: error,
    });
  });
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function useCanvas(
  productType: ProductType = "keyring"
): UseCanvasReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const originalSizeRef = useRef(PRODUCT_CANVAS_SIZE[productType]);
  const onChangeCb = useRef<(() => void) | null>(null);
  const historyRef = useRef<string[]>([]);
  const historyPointerRef = useRef<number>(-1);
  const isRestoringRef = useRef(false);

  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [zoom, setZoomState] = useState(1.0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [hasObjects, setHasObjects] = useState(false);
  const [selectedInfo, setSelectedInfo] = useState<SelectedObjectInfo | null>(
    null
  );

  const updateHistoryState = useCallback(() => {
    setCanUndo(historyPointerRef.current > 0);
    setCanRedo(
      historyPointerRef.current < historyRef.current.length - 1
    );
  }, []);

  const saveHistory = useCallback(() => {
    if (isRestoringRef.current || !fabricRef.current) return;
    onChangeCb.current?.();
    const json = JSON.stringify((fabricRef.current as FabricCanvasWithCustomJson).toJSON(FABRIC_EXPORT_PROPS));
    // 현재 포인터 이후 미래 히스토리 제거
    historyRef.current = historyRef.current.slice(
      0,
      historyPointerRef.current + 1
    );
    historyRef.current.push(json);
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    } else {
      historyPointerRef.current++;
    }
    updateHistoryState();
  }, [updateHistoryState]);

  const updateSelectedInfo = useCallback((obj: FabricObject | null) => {
    if (!obj) {
      setSelectedInfo(null);
      return;
    }
    const customObj = obj as CustomFabricObject;
    const isNameTag = isNameTagObject(obj);
    const isText = isTextObject(obj);
    const textObj = isNameTag ? findNameTagText(obj) : (obj as FabricText);
    setSelectedInfo({
      type: isNameTag ? "nameTag" : isText ? "text" : obj.type === "image" ? "image" : "other",
      text: isNameTag
        ? getStringProp(customObj, "labelText", String(textObj?.text ?? ""))
        : isText
          ? String(textObj?.text ?? "")
          : undefined,
      fontSize: isNameTag
        ? getNumberProp(customObj, "labelFontSize", Number(textObj?.fontSize ?? 28))
        : isText
          ? Number(textObj?.fontSize ?? 24)
          : undefined,
      fill: isNameTag
        ? getStringProp(customObj, "labelTextFill", String(textObj?.fill ?? "#1f2937"))
        : isText
          ? String(textObj?.fill ?? "#000000")
          : undefined,
      fontFamily: isNameTag
        ? getStringProp(customObj, "labelFontFamily", String(textObj?.fontFamily ?? "Geist, Arial, sans-serif"))
        : isText
          ? String(textObj?.fontFamily ?? "Arial")
          : undefined,
      labelFill: isNameTag
        ? getStringProp(customObj, "labelFill", "#fff7ed")
        : undefined,
      labelStroke: isNameTag
        ? getStringProp(customObj, "labelStroke", "#fb923c")
        : undefined,
      labelStrokeWidth: isNameTag
        ? getNumberProp(customObj, "labelStrokeWidth", 3)
        : undefined,
      labelRadius: isNameTag
        ? getNumberProp(customObj, "labelRadius", 26)
        : undefined,
      labelPaddingX: isNameTag
        ? getNumberProp(customObj, "labelPaddingX", 32)
        : undefined,
      labelPaddingY: isNameTag
        ? getNumberProp(customObj, "labelPaddingY", 14)
        : undefined,
      opacity: Number(obj.opacity ?? 1),
    });
  }, []);

  // 캔버스 초기화
  useEffect(() => {
    if (!canvasRef.current) return;
    let cancelled = false;

    const initCanvas = async () => {
      const { Canvas } = await import("fabric");

      // StrictMode 두 번째 실행 시 이미 cleanup됐으면 중단
      if (cancelled || !canvasRef.current) return;

      const { width, height } = PRODUCT_CANVAS_SIZE[productType];
      const canvas = new Canvas(canvasRef.current, {
        width,
        height,
        backgroundColor: "#ffffff",
        selection: true,
      });
      fabricRef.current = canvas;
      setIsCanvasReady(true);

      // 초기 빈 상태 히스토리 저장
      historyRef.current = [JSON.stringify(canvas.toJSON())];
      historyPointerRef.current = 0;
      updateHistoryState();

      const trackObjects = () => setHasObjects((canvas.getObjects?.() ?? []).length > 0);
      canvas.on("object:added", () => { saveHistory(); trackObjects(); });
      canvas.on("object:modified", saveHistory);
      canvas.on("object:removed", () => { saveHistory(); trackObjects(); });

      canvas.on("mouse:wheel", (opt) => {
        const delta = opt.e.deltaY;
        let z = canvas.getZoom();
        z *= 0.999 ** delta;
        z = Math.min(Math.max(z, ZOOM_MIN), ZOOM_MAX);
        applyZoom(canvas, Math.round(z * 100) / 100);
        opt.e.preventDefault();
        opt.e.stopPropagation();
      });

      canvas.on("selection:created", (e) => {
        updateSelectedInfo(e.selected?.[0] ?? null);
      });
      canvas.on("selection:updated", (e) => {
        updateSelectedInfo(e.selected?.[0] ?? null);
      });
      canvas.on("selection:cleared", () => {
        updateSelectedInfo(null);
      });
    };

    initCanvas();

    return () => {
      cancelled = true;
      // fabricRef가 이미 설정된 경우에만 dispose
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    };
    // productType은 setProductType으로 처리하므로 의존성에서 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addCharacter = useCallback(async (src: string) => {
    if (!fabricRef.current) return;
    const { FabricImage } = await import("fabric");
    const resolvedSrc = await toDataURLFromSrc(src);
    const img = await FabricImage.fromURL(resolvedSrc, { crossOrigin: "anonymous" });
    const canvas = fabricRef.current;
    const maxSize = Math.min(canvas.width!, canvas.height!) * 0.6;
    const scale = maxSize / Math.max(img.width!, img.height!);
    img.scale(scale);
    img.set({
      left: (canvas.width! - img.getScaledWidth()) / 2,
      top: (canvas.height! - img.getScaledHeight()) / 2,
    });
    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.renderAll();
  }, []);

  const addText = useCallback((text: string) => {
    if (!fabricRef.current) return;
    import("fabric").then(({ IText }) => {
      const canvas = fabricRef.current!;
      const textObj = new IText(text, {
        left: canvas.width! / 2,
        top: canvas.height! / 2,
        originX: "center",
        originY: "center",
        fontSize: 36,
        fontFamily: "Geist, Arial, sans-serif",
        fill: "#1a1a1a",
        fontWeight: "bold",
      });
      canvas.add(textObj);
      canvas.setActiveObject(textObj);
      canvas.renderAll();
    });
  }, []);

  const addNameTag = useCallback((text: string) => {
    if (!fabricRef.current) return;
    import("fabric").then(({ Group, IText, Rect }) => {
      const canvas = fabricRef.current!;
      const labelText = text.trim() || "이름";
      const fontSize = 32;
      const paddingX = 34;
      const paddingY = 14;
      const labelFill = "#fff7ed";
      const labelStroke = "#fb923c";
      const labelStrokeWidth = 3;
      const labelRadius = 28;
      const fontFamily = "Geist, Arial, sans-serif";
      const textFill = "#1f2937";

      const textObj = new IText(labelText, {
        originX: "center",
        originY: "center",
        left: 0,
        top: 0,
        fontSize,
        fontFamily,
        fontWeight: "bold",
        fill: textFill,
        selectable: false,
        evented: false,
      });
      (textObj as unknown as CustomFabricObject).pocketGoodsRole = "label-text";

      const textWidth = Math.max(textObj.width ?? labelText.length * fontSize * 0.62, fontSize);
      const textHeight = Math.max(textObj.height ?? fontSize, fontSize);
      const pillWidth = Math.max(140, textWidth + paddingX * 2);
      const pillHeight = Math.max(58, textHeight + paddingY * 2);

      const pill = new Rect({
        originX: "center",
        originY: "center",
        left: 0,
        top: 0,
        width: pillWidth,
        height: pillHeight,
        rx: labelRadius,
        ry: labelRadius,
        fill: labelFill,
        stroke: labelStroke,
        strokeWidth: labelStrokeWidth,
        selectable: false,
        evented: false,
      });
      (pill as unknown as CustomFabricObject).pocketGoodsRole = "label-pill";

      const group = new Group([pill, textObj], {
        left: canvas.width! / 2,
        top: canvas.height! / 2,
        originX: "center",
        originY: "center",
        subTargetCheck: false,
      });
      const customGroup = group as unknown as CustomFabricObject;
      customGroup.pocketGoodsKind = "name-tag";
      customGroup.labelText = labelText;
      customGroup.labelFill = labelFill;
      customGroup.labelStroke = labelStroke;
      customGroup.labelStrokeWidth = labelStrokeWidth;
      customGroup.labelRadius = labelRadius;
      customGroup.labelPaddingX = paddingX;
      customGroup.labelPaddingY = paddingY;
      customGroup.labelFontSize = fontSize;
      customGroup.labelFontFamily = fontFamily;
      customGroup.labelTextFill = textFill;

      canvas.add(group);
      canvas.setActiveObject(group);
      canvas.renderAll();
      updateSelectedInfo(group);
    });
  }, [updateSelectedInfo]);

  const addSticker = useCallback((emoji: string) => {
    if (!fabricRef.current) return;
    import("fabric").then(({ IText }) => {
      const canvas = fabricRef.current!;
      const sticker = new IText(emoji, {
        left: canvas.width! / 2,
        top: canvas.height! / 2,
        originX: "center",
        originY: "center",
        fontSize: 64,
        selectable: true,
      });
      canvas.add(sticker);
      canvas.setActiveObject(sticker);
      canvas.renderAll();
    });
  }, []);

  const updateSelectedText = useCallback(
    (props: Partial<TextUpdateProps>) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const obj = canvas.getActiveObject() as FabricObject | null;
      if (!obj) return;

      if (isNameTagObject(obj)) {
        const customObj = obj as CustomFabricObject;
        const textObj = findNameTagText(obj);
        const pill = findNameTagPill(obj);

        const nextText = props.text ?? getStringProp(customObj, "labelText", String(textObj?.text ?? "이름"));
        const nextFontSize = props.fontSize ?? getNumberProp(customObj, "labelFontSize", Number(textObj?.fontSize ?? 32));
        const nextTextFill = props.fill ?? getStringProp(customObj, "labelTextFill", String(textObj?.fill ?? "#1f2937"));
        const nextFontFamily = props.fontFamily ?? getStringProp(customObj, "labelFontFamily", String(textObj?.fontFamily ?? "Geist, Arial, sans-serif"));
        const nextFill = props.labelFill ?? getStringProp(customObj, "labelFill", "#fff7ed");
        const nextStroke = props.labelStroke ?? getStringProp(customObj, "labelStroke", "#fb923c");
        const nextStrokeWidth = props.labelStrokeWidth ?? getNumberProp(customObj, "labelStrokeWidth", 3);
        const nextRadius = props.labelRadius ?? getNumberProp(customObj, "labelRadius", 28);
        const nextPaddingX = props.labelPaddingX ?? getNumberProp(customObj, "labelPaddingX", 34);
        const nextPaddingY = props.labelPaddingY ?? getNumberProp(customObj, "labelPaddingY", 14);

        textObj?.set({
          text: nextText,
          fontSize: nextFontSize,
          fill: nextTextFill,
          fontFamily: nextFontFamily,
        });

        const textWidth = Math.max(textObj?.width ?? nextText.length * nextFontSize * 0.62, nextFontSize);
        const textHeight = Math.max(textObj?.height ?? nextFontSize, nextFontSize);
        const pillWidth = Math.max(120, textWidth + nextPaddingX * 2);
        const pillHeight = Math.max(48, textHeight + nextPaddingY * 2);

        pill?.set({
          width: pillWidth,
          height: pillHeight,
          rx: Math.min(nextRadius, pillHeight / 2),
          ry: Math.min(nextRadius, pillHeight / 2),
          fill: nextFill,
          stroke: nextStroke,
          strokeWidth: nextStrokeWidth,
        });

        customObj.labelText = nextText;
        customObj.labelFill = nextFill;
        customObj.labelStroke = nextStroke;
        customObj.labelStrokeWidth = nextStrokeWidth;
        customObj.labelRadius = nextRadius;
        customObj.labelPaddingX = nextPaddingX;
        customObj.labelPaddingY = nextPaddingY;
        customObj.labelFontSize = nextFontSize;
        customObj.labelFontFamily = nextFontFamily;
        customObj.labelTextFill = nextTextFill;
        obj.setCoords();
      } else if (isTextObject(obj)) {
        const textObj = obj as FabricText;
        if (props.text !== undefined) textObj.set("text", props.text);
        if (props.fontSize !== undefined) textObj.set("fontSize", props.fontSize);
        if (props.fill !== undefined) textObj.set("fill", props.fill);
        if (props.fontFamily !== undefined)
          textObj.set("fontFamily", props.fontFamily);
      } else {
        return;
      }

      canvas.renderAll();
      updateSelectedInfo(obj);
      onChangeCb.current?.();
    },
    [updateSelectedInfo]
  );

  const updateSelectedOpacity = useCallback((opacity: number) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;
    obj.set("opacity", opacity);
    canvas.renderAll();
    setSelectedInfo((prev) => (prev ? { ...prev, opacity } : null));
  }, []);

  const deleteSelected = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;
    canvas.remove(obj);
    canvas.discardActiveObject();
    canvas.renderAll();
  }, []);

  const bringForward = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;
    canvas.bringObjectForward(obj);
    canvas.renderAll();
  }, []);

  const sendBackward = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;
    canvas.sendObjectBackwards(obj);
    canvas.renderAll();
  }, []);

  const undo = useCallback(async () => {
    if (historyPointerRef.current <= 0 || !fabricRef.current) return;
    historyPointerRef.current--;
    isRestoringRef.current = true;
    const canvas = fabricRef.current;
    await canvas.loadFromJSON(
      JSON.parse(historyRef.current[historyPointerRef.current])
    );
    canvas.renderAll();
    isRestoringRef.current = false;
    updateHistoryState();
    updateSelectedInfo(null);
  }, [updateHistoryState, updateSelectedInfo]);

  const redo = useCallback(async () => {
    if (
      historyPointerRef.current >= historyRef.current.length - 1 ||
      !fabricRef.current
    )
      return;
    historyPointerRef.current++;
    isRestoringRef.current = true;
    const canvas = fabricRef.current;
    await canvas.loadFromJSON(
      JSON.parse(historyRef.current[historyPointerRef.current])
    );
    canvas.renderAll();
    isRestoringRef.current = false;
    updateHistoryState();
    updateSelectedInfo(null);
  }, [updateHistoryState, updateSelectedInfo]);

  /** export 전 zoom=1로 리셋, 캡처 후 원래 zoom 복원 */
  const withOriginalSize = useCallback(<T,>(fn: (canvas: FabricCanvas) => T): T | null => {
    const canvas = fabricRef.current;
    if (!canvas) return null;
    const vpt = canvas.viewportTransform.slice() as typeof canvas.viewportTransform;
    const curW = canvas.getWidth();
    const curH = canvas.getHeight();
    const { width: ow, height: oh } = originalSizeRef.current;
    // 줌 리셋
    canvas.viewportTransform = [1, 0, 0, 1, 0, 0] as typeof canvas.viewportTransform;
    canvas.setDimensions({ width: ow, height: oh });
    const result = fn(canvas);
    // 줌 복원
    canvas.viewportTransform = vpt;
    canvas.setDimensions({ width: curW, height: curH });
    canvas.renderAll();
    return result;
  }, []);

  const toJSON = useCallback(() => {
    return withOriginalSize((canvas) => (canvas as FabricCanvasWithCustomJson).toJSON(FABRIC_EXPORT_PROPS)) ?? {};
  }, [withOriginalSize]);

  const toDataURL = useCallback(() => {
    return withOriginalSize((canvas) =>
      canvas.toDataURL({ multiplier: 1, format: "png" })
    ) ?? "";
  }, [withOriginalSize]);

  const loadDesign = useCallback(async (json: object) => {
    if (!fabricRef.current) return;
    isRestoringRef.current = true;
    await fabricRef.current.loadFromJSON(json);
    fabricRef.current.renderAll();
    isRestoringRef.current = false;
    updateHistoryState();
  }, [updateHistoryState]);

  // 선택된 FabricImage의 원본 픽셀 데이터를 dataURL로 반환
  const getSelectedImageDataURL = useCallback((): string | null => {
    const canvas = fabricRef.current;
    if (!canvas) return null;
    const obj = canvas.getActiveObject();
    if (!obj || obj.type !== "image") return null;
    const fabricImg = obj as import("fabric").FabricImage;
    const el = fabricImg.getElement() as HTMLImageElement;
    const tmp = document.createElement("canvas");
    tmp.width = el.naturalWidth || el.width;
    tmp.height = el.naturalHeight || el.height;
    tmp.getContext("2d")!.drawImage(el, 0, 0);
    return tmp.toDataURL("image/png");
  }, []);

  // 선택된 이미지를 새 src로 교체 (누끼 결과 반영용)
  const replaceSelectedImage = useCallback(async (src: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj || obj.type !== "image") return;
    const { FabricImage } = await import("fabric");
    const resolvedSrc = await toDataURLFromSrc(src);
    const newImg = await FabricImage.fromURL(resolvedSrc);
    newImg.set({
      left: obj.left,
      top: obj.top,
      angle: obj.angle,
      scaleX: obj.scaleX,
      scaleY: obj.scaleY,
      originX: obj.originX,
      originY: obj.originY,
    });
    canvas.remove(obj);
    canvas.add(newImg);
    canvas.setActiveObject(newImg);
    canvas.renderAll();
  }, []);

  const setProductType = useCallback(
    async (type: ProductType) => {
      if (!fabricRef.current) return;
      const size = PRODUCT_CANVAS_SIZE[type];
      originalSizeRef.current = size;
      fabricRef.current.setZoom(1);
      fabricRef.current.setDimensions({ width: size.width, height: size.height });
      fabricRef.current.renderAll();
      setZoomState(1);
      saveHistory();
    },
    [saveHistory]
  );

  const applyZoom = useCallback((canvas: FabricCanvas, z: number) => {
    const { width: ow, height: oh } = originalSizeRef.current;
    canvas.viewportTransform = [z, 0, 0, z, 0, 0] as typeof canvas.viewportTransform;
    canvas.setDimensions({ width: ow * z, height: oh * z });

    // 선택 핸들 크기를 zoom에 반비례 → 화면상 항상 동일한 크기로 표시
    const cornerSize = BASE_CORNER_SIZE / z;
    const borderWidth = BASE_BORDER_WIDTH / z;
    const touchCornerSize = BASE_TOUCH_CORNER_SIZE / z;
    canvas.forEachObject((obj: FabricObject) => {
      obj.cornerSize = cornerSize;
      (obj as unknown as Record<string, number>).borderWidth = borderWidth;
      obj.touchCornerSize = touchCornerSize;
      obj.setCoords();
    });

    canvas.renderAll();
    setZoomState(z);
  }, []);

  const setCanvasSize = useCallback(
    (size: { width: number; height: number }) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const previousSize = originalSizeRef.current;
      if (previousSize.width === size.width && previousSize.height === size.height) return;
      const dx = (size.width - previousSize.width) / 2;
      const dy = (size.height - previousSize.height) / 2;

      originalSizeRef.current = size;
      canvas.forEachObject((obj: FabricObject) => {
        obj.set({
          left: Number(obj.left ?? 0) + dx,
          top: Number(obj.top ?? 0) + dy,
        });
        obj.setCoords();
      });
      applyZoom(canvas, canvas.getZoom());
      saveHistory();
    },
    [applyZoom, saveHistory]
  );

  const zoomIn = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const next = Math.min(
      Math.round((canvas.getZoom() + ZOOM_STEP) * 100) / 100,
      ZOOM_MAX
    );
    applyZoom(canvas, next);
  }, [applyZoom]);

  const zoomOut = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const next = Math.max(
      Math.round((canvas.getZoom() - ZOOM_STEP) * 100) / 100,
      ZOOM_MIN
    );
    applyZoom(canvas, next);
  }, [applyZoom]);

  const setZoom = useCallback((level: number) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const clamped = Math.min(Math.max(level, ZOOM_MIN), ZOOM_MAX);
    applyZoom(canvas, clamped);
  }, [applyZoom]);

  return {
    canvasRef,
    isCanvasReady,
    hasObjects,
    canUndo,
    canRedo,
    selectedInfo,
    addCharacter,
    addText,
    addNameTag,
    addSticker,
    updateSelectedText,
    updateSelectedOpacity,
    deleteSelected,
    bringForward,
    sendBackward,
    undo,
    redo,
    toJSON,
    toDataURL,
    getSelectedImageDataURL,
    loadDesign,
    replaceSelectedImage,
    setProductType,
    setCanvasSize,
    zoom,
    zoomIn,
    zoomOut,
    setZoom,
    onChangeCb,
  };
}
