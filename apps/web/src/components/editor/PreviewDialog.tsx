"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import * as PortOne from "@portone/browser-sdk/v2";
import { AlertTriangle, CheckCircle2, Loader2, PackagePlus, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProductType } from "@/lib/assets";
import { PRINT_PRICE_KRW, SHIPPING_FEE_KRW, type OutputSize } from "@/lib/order-pricing";
import { addOrderCartItem, createDefaultQuantities } from "@/lib/order-cart";

type PreviewPayload = {
  imageSrc: string;
  canvasJSON: object;
  productType: ProductType;
  outputSize: OutputSize;
  revokeOnClose?: boolean;
};

type PreviewDialogProps = {
  open: boolean;
  payload: PreviewPayload | null;
  initialTab: "preview" | "order";
  onClose: () => void;
};

type CutlineInfo = {
  safe: boolean;
  reason?: string;
};

type OrderForm = {
  quantities: Record<OutputSize, number>;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  zipcode: string;
  addressLine1: string;
  addressLine2: string;
  memo: string;
  agree: boolean;
};

const initialForm: OrderForm = {
  quantities: {
    A6: 0,
    A5: 0,
    A4: 0,
  },
  buyerName: "",
  buyerPhone: "",
  buyerEmail: "",
  zipcode: "",
  addressLine1: "",
  addressLine2: "",
  memo: "",
  agree: false,
};

export default function PreviewDialog({
  open,
  payload,
  initialTab,
  onClose,
}: PreviewDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState<"preview" | "order">(initialTab);
  const [cutline, setCutline] = useState<CutlineInfo>({ safe: false });
  const [form, setForm] = useState<OrderForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !payload) return;
    setTab(initialTab);
      setForm((current) => ({
      ...current,
      quantities: createDefaultQuantities(payload.outputSize),
    }));
  }, [initialTab, open, payload]);

  const printAmount = useMemo(
    () =>
      (["A6", "A5", "A4"] as OutputSize[]).reduce(
        (sum, size) => sum + PRINT_PRICE_KRW[size] * form.quantities[size],
        0,
      ),
    [form.quantities],
  );
  const totalQuantity = useMemo(
    () => (["A6", "A5", "A4"] as OutputSize[]).reduce((sum, size) => sum + form.quantities[size], 0),
    [form.quantities],
  );
  const amount = totalQuantity > 0 ? printAmount + SHIPPING_FEE_KRW : 0;
  const isFormReady = useMemo(
    () =>
      totalQuantity > 0 &&
      form.buyerName.trim() &&
      form.buyerPhone.trim() &&
      form.buyerEmail.trim() &&
      form.zipcode.trim() &&
      form.addressLine1.trim() &&
      form.addressLine2.trim() &&
      form.agree,
    [form, totalQuantity],
  );

  useEffect(() => {
    if (!open || !payload?.imageSrc || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const maxW = 720;
      const scale = Math.min(1, maxW / img.width);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const alphaMask = extractAlphaMask(ctx.getImageData(0, 0, canvas.width, canvas.height));
      const dilatedMask = dilateMask(alphaMask, canvas.width, canvas.height, 2);
      const contours = traceMaskContours(dilatedMask, canvas.width, canvas.height);
      const bounds = getMaskBounds(dilatedMask, canvas.width, canvas.height);

      if (!bounds || contours.length === 0) {
        setCutline({ safe: false, reason: "이미지가 비어 있어 칼선을 만들 수 없습니다." });
        return;
      }

      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ff1f2d";
      ctx.setLineDash([10, 6]);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      for (const contour of contours) {
        drawSmoothClosedPath(ctx, contour);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      const safe = bounds.minX > 0 && bounds.minY > 0 && bounds.maxX < canvas.width - 1 && bounds.maxY < canvas.height - 1;
      setCutline(
        safe
          ? { safe: true }
          : {
              safe: false,
              reason:
                "이미지 또는 칼선이 작업 영역 바깥쪽에 너무 가깝습니다. 캔버스 안쪽으로 옮긴 뒤 주문해주세요.",
            },
      );
    };
    img.src = payload.imageSrc;
  }, [open, payload]);

  if (!open || !payload) return null;

  const close = () => {
    if (payload.revokeOnClose) URL.revokeObjectURL(payload.imageSrc);
    onClose();
  };

  const updateField =
    <K extends keyof OrderForm>(key: K) =>
    (value: OrderForm[K]) => {
      setForm((current) => ({ ...current, [key]: value }));
      setError(null);
      setMessage(null);
    };

  const updateQuantity = (size: OutputSize, nextQuantity: number) => {
    setForm((current) => ({
      ...current,
      quantities: {
        ...current.quantities,
        [size]: Math.max(0, Math.min(99, nextQuantity)),
      },
    }));
    setError(null);
    setMessage(null);
  };

  const handlePayment = async () => {
    if (!cutline.safe) {
      setError(cutline.reason ?? "칼선이 안전하지 않아 주문할 수 없습니다.");
      return;
    }
    if (!isFormReady) {
      setError("제작 수량, 주문자 정보와 배송지, 동의를 모두 입력해주세요.");
      return;
    }

    const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
    const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;
    if (!storeId || !channelKey) {
      setError("PortOne 설정이 필요합니다. NEXT_PUBLIC_PORTONE_STORE_ID / NEXT_PUBLIC_PORTONE_CHANNEL_KEY를 설정해주세요.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage("결제창을 여는 중입니다…");

    const paymentId = `pocket_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const selectedItems = (["A6", "A5", "A4"] as OutputSize[])
      .filter((size) => form.quantities[size] > 0)
      .map((size) => ({ size, quantity: form.quantities[size] }));
    const orderName =
      selectedItems.length === 1
        ? `투명 스티커 ${selectedItems[0].size} ${selectedItems[0].quantity}장 주문`
        : `투명 스티커 ${totalQuantity}장 묶음 주문`;
    const shipping = {
      buyerName: form.buyerName.trim(),
      buyerPhone: form.buyerPhone.trim(),
      buyerEmail: form.buyerEmail.trim(),
      zipcode: form.zipcode.trim(),
      addressLine1: form.addressLine1.trim(),
      addressLine2: form.addressLine2.trim(),
      memo: form.memo.trim(),
    };

    try {
      const response = await PortOne.requestPayment({
        storeId,
        channelKey,
        paymentId,
        orderName,
        totalAmount: amount,
        currency: "KRW",
        payMethod: "CARD",
        customer: {
          fullName: shipping.buyerName,
          phoneNumber: shipping.buyerPhone,
          email: shipping.buyerEmail,
          zipcode: shipping.zipcode,
          address: {
            country: "KR",
            addressLine1: shipping.addressLine1,
            addressLine2: shipping.addressLine2,
          },
        },
        shippingAddress: {
          country: "KR",
          addressLine1: shipping.addressLine1,
          addressLine2: shipping.addressLine2,
        },
        products: [
          ...selectedItems.map(({ size, quantity }) => ({
            id: `sticker-${size}`,
            name: `투명 스티커 ${size}`,
            amount: PRINT_PRICE_KRW[size],
            quantity,
          })),
          { id: "shipping", name: "택배비", amount: SHIPPING_FEE_KRW, quantity: 1 },
        ],
        productType: "REAL",
        redirectUrl: `${window.location.origin}/design?paymentId=${paymentId}`,
        customData: { items: selectedItems, outputSize: payload.outputSize, shipping },
      });

      if (!response || response.code) {
        setError(response?.message ?? "결제가 취소되었거나 실패했습니다.");
        return;
      }

      setMessage("결제 결과를 서버에서 검증하는 중입니다…");
      const verification = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/payments/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentId: response.paymentId,
            txId: response.txId,
            orderName,
            amount,
            currency: "KRW",
            productType: "sticker",
            outputSize: payload.outputSize,
            items: selectedItems,
            shipping,
          }),
        },
      );
      if (!verification.ok) throw new Error("결제 검증에 실패했습니다.");

      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canvas_json: payload.canvasJSON,
          product_type: "sticker",
          output_size: payload.outputSize,
          order_id: response.paymentId,
          save_to_storage: true,
        }),
      }).catch(() => null);

      setMessage("주문 접수가 완료되었습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "주문 처리 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddToCart = () => {
    if (!cutline.safe) {
      setError(cutline.reason ?? "칼선이 안전하지 않아 주문함에 담을 수 없습니다.");
      return;
    }
    addOrderCartItem({
      imageSrc: payload.imageSrc,
      canvasJSON: payload.canvasJSON,
      productType: "sticker",
      quantities: form.quantities,
    });
    setMessage("주문함에 담았습니다. 다른 디자인도 추가한 뒤 한 번에 결제할 수 있어요.");
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 p-0 md:items-center md:p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl md:rounded-3xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-base font-extrabold">미리보기 · 칼선 확인</h2>
            <p className="text-xs text-zinc-500">작업 이미지와 빨간 칼선을 확인한 뒤 주문하세요.</p>
          </div>
          <button type="button" onClick={close} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100" aria-label="닫기">
            <X className="size-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-h-0 overflow-auto bg-zinc-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold text-zinc-500">빨간 점선 = 재단 기준선</p>
              {cutline.safe ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="size-3.5" /> 주문 가능
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
                  <AlertTriangle className="size-3.5" /> 주문 불가
                </span>
              )}
            </div>
            <div className="flex min-h-[360px] justify-center overflow-auto rounded-2xl border bg-[linear-gradient(45deg,#f3f4f6_25%,transparent_25%),linear-gradient(-45deg,#f3f4f6_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f3f4f6_75%),linear-gradient(-45deg,transparent_75%,#f3f4f6_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px] p-4">
              <canvas ref={canvasRef} className="max-h-[68vh] max-w-full bg-white shadow-xl ring-1 ring-black/10" />
            </div>
            {!cutline.safe && cutline.reason && (
              <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-600">{cutline.reason}</p>
            )}
          </section>

          <aside className="min-h-0 overflow-y-auto border-t p-4 md:border-l md:border-t-0">
            <div className="mb-4 grid grid-cols-2 rounded-xl bg-zinc-100 p-1 text-sm font-bold">
              <button className={`rounded-lg py-2 ${tab === "preview" ? "bg-white shadow-sm" : "text-zinc-500"}`} onClick={() => setTab("preview")}>칼선</button>
              <button className={`rounded-lg py-2 ${tab === "order" ? "bg-white shadow-sm" : "text-zinc-500"}`} onClick={() => setTab("order")}>주문하기</button>
            </div>

            {tab === "preview" ? (
              <div className="space-y-3 text-sm">
                <h3 className="font-bold">체크 포인트</h3>
                <ul className="list-disc space-y-2 pl-5 text-zinc-600">
                  <li>칼선은 이미지 바깥쪽 약 2px에 표시됩니다.</li>
                  <li>이미지가 너무 바깥쪽이면 주문이 막힙니다.</li>
                  <li>빨간 선이 잘리면 편집 화면에서 이미지를 안쪽으로 옮겨주세요.</li>
                </ul>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl bg-zinc-50 p-3 text-sm">
                  <p className="mb-3 text-xs font-bold text-zinc-500">제작 수량</p>
                  <div className="space-y-2">
                    {(["A6", "A5", "A4"] as OutputSize[]).map((size) => (
                      <div key={size} className="flex items-center justify-between gap-3 rounded-lg bg-white p-2 ring-1 ring-zinc-200">
                        <div>
                          <p className="font-bold">{size}</p>
                          <p className="text-[11px] text-zinc-500">장당 {PRINT_PRICE_KRW[size].toLocaleString("ko-KR")}원</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="grid size-7 place-items-center rounded-full border text-sm font-bold"
                            onClick={() => updateQuantity(size, form.quantities[size] - 1)}
                          >
                            -
                          </button>
                          <Input
                            className="h-8 w-12 text-center"
                            inputMode="numeric"
                            value={form.quantities[size]}
                            onChange={(event) => updateQuantity(size, Number(event.target.value) || 0)}
                          />
                          <button
                            type="button"
                            className="grid size-7 place-items-center rounded-full border text-sm font-bold"
                            onClick={() => updateQuantity(size, form.quantities[size] + 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2 border-t pt-3">
                    {(["A6", "A5", "A4"] as OutputSize[]).map((size) =>
                      form.quantities[size] > 0 ? (
                        <div key={size} className="flex justify-between">
                          <span>인쇄비 {size} × {form.quantities[size]}</span>
                          <b>{(PRINT_PRICE_KRW[size] * form.quantities[size]).toLocaleString("ko-KR")}원</b>
                        </div>
                      ) : (
                        <Fragment key={size} />
                      ),
                    )}
                  </div>
                  <div className="mt-2 flex justify-between"><span>택배비 <span className="text-[11px] text-zinc-400">(묶음 1회)</span></span><b>{totalQuantity > 0 ? SHIPPING_FEE_KRW.toLocaleString("ko-KR") : 0}원</b></div>
                  <div className="mt-3 flex justify-between border-t pt-3 text-base"><span className="font-bold">총 결제금액</span><b>{amount.toLocaleString("ko-KR")}원</b></div>
                </div>
                <Field label="주문자 이름" required><Input value={form.buyerName} onChange={(e) => updateField("buyerName")(e.target.value)} /></Field>
                <Field label="연락처" required><Input value={form.buyerPhone} onChange={(e) => updateField("buyerPhone")(e.target.value)} /></Field>
                <Field label="이메일" required><Input type="email" value={form.buyerEmail} onChange={(e) => updateField("buyerEmail")(e.target.value)} /></Field>
                <Field label="우편번호" required><Input value={form.zipcode} onChange={(e) => updateField("zipcode")(e.target.value)} /></Field>
                <Field label="주소" required><Input value={form.addressLine1} onChange={(e) => updateField("addressLine1")(e.target.value)} /></Field>
                <Field label="상세 주소" required><Input value={form.addressLine2} onChange={(e) => updateField("addressLine2")(e.target.value)} /></Field>
                <Field label="배송 메모"><Textarea rows={3} className="resize-none" value={form.memo} onChange={(e) => updateField("memo")(e.target.value)} /></Field>
                <label className="flex gap-2 rounded-xl border p-3 text-xs"><input type="checkbox" checked={form.agree} onChange={(e) => updateField("agree")(e.target.checked)} /> 개인정보를 결제/배송 처리에 사용하는 데 동의합니다.</label>
                {(message || error) && <p className={`rounded-xl p-3 text-sm ${error ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>{error ?? message}</p>}
                <Button variant="outline" className="w-full" onClick={handleAddToCart} disabled={!cutline.safe || totalQuantity < 1}>
                  <PackagePlus className="mr-2 size-4" />
                  주문함에 담기
                </Button>
                <Button className="w-full" onClick={handlePayment} disabled={submitting || !isFormReady || !cutline.safe}>
                  {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ShoppingCart className="mr-2 size-4" />}
                  현재 디자인만 {amount.toLocaleString("ko-KR")}원 주문
                </Button>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}{required && <span className="ml-0.5 text-red-500">*</span>}</Label>
      {children}
    </div>
  );
}

type Point = { x: number; y: number };
type MaskBounds = { minX: number; minY: number; maxX: number; maxY: number };

function extractAlphaMask(imageData: ImageData): Uint8Array {
  const mask = new Uint8Array(imageData.width * imageData.height);
  for (let i = 0; i < mask.length; i += 1) {
    mask[i] = imageData.data[i * 4 + 3] > 18 ? 1 : 0;
  }
  return mask;
}

function dilateMask(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const output = new Uint8Array(mask.length);
  const r2 = radius * radius;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (dx * dx + dy * dy > r2) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            output[ny * width + nx] = 1;
          }
        }
      }
    }
  }
  return output;
}

function getMaskBounds(mask: Uint8Array, width: number, height: number): MaskBounds | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return maxX < 0 ? null : { minX, minY, maxX, maxY };
}

function traceMaskContours(mask: Uint8Array, width: number, height: number): Point[][] {
  const points: Point[] = [];
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = y * width + x;
      if (!mask[idx]) continue;
      if (!mask[idx - 1] || !mask[idx + 1] || !mask[idx - width] || !mask[idx + width]) {
        points.push({ x, y });
      }
    }
  }

  const clusters = clusterBoundaryPoints(points, 12);
  return clusters
    .filter((cluster) => cluster.length > 24)
    .map((cluster) => smoothRadialContour(cluster, 96))
    .filter((cluster) => cluster.length > 8);
}

function clusterBoundaryPoints(points: Point[], distance: number): Point[][] {
  const remaining = new Set(points.map((_, index) => index));
  const clusters: Point[][] = [];
  const d2 = distance * distance;

  while (remaining.size) {
    const first = remaining.values().next().value as number;
    remaining.delete(first);
    const queue = [first];
    const cluster: Point[] = [];

    while (queue.length) {
      const index = queue.pop()!;
      const point = points[index];
      cluster.push(point);
      for (const otherIndex of Array.from(remaining)) {
        const other = points[otherIndex];
        const dx = point.x - other.x;
        const dy = point.y - other.y;
        if (dx * dx + dy * dy <= d2) {
          remaining.delete(otherIndex);
          queue.push(otherIndex);
        }
      }
    }
    clusters.push(cluster);
  }

  return clusters;
}

function smoothRadialContour(points: Point[], samples: number): Point[] {
  const center = points.reduce(
    (acc, point) => ({ x: acc.x + point.x / points.length, y: acc.y + point.y / points.length }),
    { x: 0, y: 0 },
  );

  const buckets: Point[][] = Array.from({ length: samples }, () => []);
  for (const point of points) {
    const angle = Math.atan2(point.y - center.y, point.x - center.x);
    const bucket = Math.floor(((angle + Math.PI) / (Math.PI * 2)) * samples) % samples;
    buckets[bucket].push(point);
  }

  const contour: Point[] = [];
  for (const bucket of buckets) {
    if (!bucket.length) continue;
    let farthest = bucket[0];
    let farthestDistance = -1;
    for (const point of bucket) {
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      const distance = dx * dx + dy * dy;
      if (distance > farthestDistance) {
        farthest = point;
        farthestDistance = distance;
      }
    }
    contour.push(farthest);
  }

  return chaikin(contour, 2);
}

function chaikin(points: Point[], iterations: number): Point[] {
  let result = points;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const next: Point[] = [];
    for (let i = 0; i < result.length; i += 1) {
      const p0 = result[i];
      const p1 = result[(i + 1) % result.length];
      next.push({ x: p0.x * 0.75 + p1.x * 0.25, y: p0.y * 0.75 + p1.y * 0.25 });
      next.push({ x: p0.x * 0.25 + p1.x * 0.75, y: p0.y * 0.25 + p1.y * 0.75 });
    }
    result = next;
  }
  return result;
}

function drawSmoothClosedPath(ctx: CanvasRenderingContext2D, points: Point[]) {
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    ctx.quadraticCurveTo(current.x, current.y, midX, midY);
  }
  ctx.closePath();
}
