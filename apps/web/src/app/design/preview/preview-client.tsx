"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as PortOne from "@portone/browser-sdk/v2";
import { AlertTriangle, CheckCircle2, Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getOrderAmount, PRINT_PRICE_KRW, SHIPPING_FEE_KRW, type OutputSize } from "@/lib/order-pricing";
import type { ProductType } from "@/lib/assets";

type PreviewPayload = {
  imageDataUrl: string;
  canvasJSON: object;
  outputSize: OutputSize;
  productType: ProductType;
  initialTab?: "preview" | "order";
};

type CutlineInfo = {
  safe: boolean;
  reason?: string;
};

type OrderForm = {
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
  buyerName: "",
  buyerPhone: "",
  buyerEmail: "",
  zipcode: "",
  addressLine1: "",
  addressLine2: "",
  memo: "",
  agree: false,
};

export default function DesignPreviewClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [payload, setPayload] = useState<PreviewPayload | null>(null);
  const [tab, setTab] = useState<"preview" | "order">("preview");
  const [cutline, setCutline] = useState<CutlineInfo>({ safe: false });
  const [form, setForm] = useState<OrderForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get("key");
    const raw = key ? sessionStorage.getItem(key) : null;
    if (!raw) return;
    const nextPayload = JSON.parse(raw) as PreviewPayload;
    setPayload(nextPayload);
    setTab(nextPayload.initialTab ?? "preview");
  }, []);

  const amount = payload ? getOrderAmount(payload.outputSize) : 0;
  const isFormReady = useMemo(
    () =>
      form.buyerName.trim() &&
      form.buyerPhone.trim() &&
      form.buyerEmail.trim() &&
      form.zipcode.trim() &&
      form.addressLine1.trim() &&
      form.addressLine2.trim() &&
      form.agree,
    [form],
  );

  useEffect(() => {
    if (!payload?.imageDataUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const maxW = 820;
      const scale = Math.min(1, maxW / img.width);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      let minX = canvas.width;
      let minY = canvas.height;
      let maxX = 0;
      let maxY = 0;

      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          const alpha = data[(y * canvas.width + x) * 4 + 3];
          if (alpha > 18) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (minX > maxX || minY > maxY) {
        setCutline({ safe: false, reason: "이미지가 비어 있어 칼선을 만들 수 없습니다." });
        return;
      }

      const offset = 2;
      const safe = minX - offset >= 0 && minY - offset >= 0 && maxX + offset < canvas.width && maxY + offset < canvas.height;
      const x = Math.max(0, minX - offset);
      const y = Math.max(0, minY - offset);
      const w = Math.min(canvas.width - x, maxX - minX + offset * 2);
      const h = Math.min(canvas.height - y, maxY - minY + offset * 2);
      const radius = Math.max(18, Math.min(w, h) * 0.08);

      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ff1f2d";
      ctx.setLineDash([10, 6]);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      roundRect(ctx, x, y, w, h, radius);
      ctx.stroke();
      ctx.setLineDash([]);

      setCutline(
        safe
          ? { safe: true }
          : { safe: false, reason: "이미지 또는 칼선이 작업 영역 바깥쪽에 너무 가깝습니다. 캔버스 안쪽으로 옮긴 뒤 주문해주세요." },
      );
    };
    img.src = payload.imageDataUrl;
  }, [payload]);

  if (!payload) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 text-center">
        <p className="text-sm text-zinc-500">미리보기 데이터를 찾을 수 없습니다. 편집 화면에서 다시 열어주세요.</p>
      </main>
    );
  }

  const updateField =
    <K extends keyof OrderForm>(key: K) =>
    (value: OrderForm[K]) => {
      setForm((current) => ({ ...current, [key]: value }));
      setError(null);
      setMessage(null);
    };

  const handlePayment = async () => {
    if (!cutline.safe) {
      setError(cutline.reason ?? "칼선이 안전하지 않아 주문할 수 없습니다.");
      return;
    }
    if (!isFormReady) {
      setError("주문자 정보와 배송지, 동의를 모두 입력해주세요.");
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
    const orderName = `투명 스티커 ${payload.outputSize} 주문`;
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
          { id: `sticker-${payload.outputSize}`, name: `투명 스티커 ${payload.outputSize}`, amount: PRINT_PRICE_KRW[payload.outputSize], quantity: 1 },
          { id: "shipping", name: "택배비", amount: SHIPPING_FEE_KRW, quantity: 1 },
        ],
        productType: "REAL",
        redirectUrl: `${window.location.origin}/design/preview?paymentId=${paymentId}`,
        customData: { outputSize: payload.outputSize, shipping },
      });

      if (!response || response.code) {
        setError(response?.message ?? "결제가 취소되었거나 실패했습니다.");
        return;
      }

      setMessage("결제 결과를 서버에서 검증하는 중입니다…");
      const verification = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/payments/complete`, {
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
          shipping,
        }),
      });
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

  return (
    <main className="min-h-screen bg-[#f7f7f5] p-4 md:p-8">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">미리보기 · 칼선 확인</h1>
              <p className="text-xs text-zinc-500">빨간 점선이 실제 재단 기준선입니다.</p>
            </div>
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
          <div className="flex justify-center overflow-auto rounded-xl bg-[linear-gradient(45deg,#f3f4f6_25%,transparent_25%),linear-gradient(-45deg,#f3f4f6_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f3f4f6_75%),linear-gradient(-45deg,transparent_75%,#f3f4f6_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px] p-4">
            <canvas ref={canvasRef} className="max-h-[78vh] max-w-full rounded-sm shadow-xl ring-1 ring-black/10" />
          </div>
          {!cutline.safe && cutline.reason && (
            <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-600">{cutline.reason}</p>
          )}
        </section>

        <aside className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-4 grid grid-cols-2 rounded-xl bg-zinc-100 p-1 text-sm font-bold">
            <button className={`rounded-lg py-2 ${tab === "preview" ? "bg-white shadow-sm" : "text-zinc-500"}`} onClick={() => setTab("preview")}>칼선</button>
            <button className={`rounded-lg py-2 ${tab === "order" ? "bg-white shadow-sm" : "text-zinc-500"}`} onClick={() => setTab("order")}>주문하기</button>
          </div>

          {tab === "preview" ? (
            <div className="space-y-3 text-sm">
              <h2 className="font-bold">체크 포인트</h2>
              <ul className="list-disc space-y-2 pl-5 text-zinc-600">
                <li>칼선은 이미지 바깥쪽에 약 2px 떨어져 표시됩니다.</li>
                <li>작업 영역 가장자리에 너무 붙으면 주문이 막힙니다.</li>
                <li>빨간 선이 지나치게 잘리거나 영역 밖으로 나가면 원래 편집 화면에서 이미지를 안쪽으로 옮겨주세요.</li>
              </ul>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl bg-zinc-50 p-3 text-sm">
                <div className="flex justify-between"><span>인쇄비 ({payload.outputSize})</span><b>{PRINT_PRICE_KRW[payload.outputSize].toLocaleString("ko-KR")}원</b></div>
                <div className="mt-2 flex justify-between"><span>택배비</span><b>{SHIPPING_FEE_KRW.toLocaleString("ko-KR")}원</b></div>
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
              <Button className="w-full" onClick={handlePayment} disabled={submitting || !isFormReady || !cutline.safe}>
                {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ShoppingCart className="mr-2 size-4" />}
                {amount.toLocaleString("ko-KR")}원 주문하기
              </Button>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}{required && <span className="ml-0.5 text-red-500">*</span>}</Label>
      {children}
    </div>
  );
}
