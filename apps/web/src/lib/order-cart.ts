import type { ProductType } from "@/lib/assets";
import type { OutputSize } from "@/lib/order-pricing";

export type CartQuantities = Record<OutputSize, number>;

export type OrderCartItem = {
  id: string;
  createdAt: string;
  title: string;
  thumbnailSrc: string;
  canvasJSON: object;
  productType: ProductType;
  outputSize: OutputSize;
  quantities: CartQuantities;
};

const STORAGE_KEY = "pocketgoods-order-cart-v1";

export const EMPTY_QUANTITIES: CartQuantities = {
  A6: 0,
  A5: 0,
  A4: 0,
};

export function createDefaultQuantities(size: OutputSize): CartQuantities {
  return { ...EMPTY_QUANTITIES, [size]: 1 };
}

export function readOrderCart(): OrderCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OrderCartItem[];
  } catch {
    return [];
  }
}

export function writeOrderCart(items: OrderCartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("pocketgoods-order-cart-updated"));
}

export function addOrderCartItem(item: Omit<OrderCartItem, "id" | "createdAt" | "title">) {
  const items = readOrderCart();
  const nextItem: OrderCartItem = {
    ...item,
    id: `design_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    createdAt: new Date().toISOString(),
    title: `디자인 ${items.length + 1}`,
  };
  writeOrderCart([...items, nextItem]);
  return nextItem;
}

export function clearOrderCart() {
  writeOrderCart([]);
}

export function compactCartPreviewImage(imageSrc: string, maxWidth = 220): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => reject(new Error("Failed to load cart preview image"));
    img.src = imageSrc;
  });
}
