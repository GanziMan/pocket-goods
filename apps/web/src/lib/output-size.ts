import type { OutputSize } from "@/lib/order-pricing";

export const OUTPUT_SIZE_MM: Record<OutputSize, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  A6: { width: 105, height: 148 },
};

// Keep A5 at the historical 420×595 editor size, then resize only the sheet
// bounds for A4/A6. Fabric objects are intentionally not scaled when this
// changes so placed artwork keeps its on-sheet size.
export const OUTPUT_CANVAS_SIZE: Record<OutputSize, { width: number; height: number }> = {
  A4: { width: 595, height: 842 },
  A5: { width: 420, height: 595 },
  A6: { width: 298, height: 420 },
};
