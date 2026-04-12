import type { ProductType } from "@/lib/assets";
import type { OutputSize } from "@/lib/order-pricing";

export type CartQuantities = Record<OutputSize, number>;

export type OrderCartItem = {
  id: string;
  createdAt: string;
  title: string;
  imageSrc: string;
  canvasJSON: object;
  productType: ProductType;
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
