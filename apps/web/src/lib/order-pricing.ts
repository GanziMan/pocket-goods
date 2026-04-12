export type OutputSize = "A4" | "A5" | "A6";

export const SHIPPING_FEE_KRW = 4000;

export const PRINT_PRICE_KRW: Record<OutputSize, number> = {
  A6: 4000,
  A5: 4000,
  A4: 4000,
};

export function getOrderAmount(outputSize: OutputSize) {
  return PRINT_PRICE_KRW[outputSize] + SHIPPING_FEE_KRW;
}
