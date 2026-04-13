"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Loader2, ShoppingBag, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AddressSearchFields from "@/components/editor/AddressSearchFields";
import { useOrderProfile } from "@/hooks/useOrderProfile";
import { API_BASE_URL, readApiError } from "@/lib/api";
import { PRINT_PRICE_KRW, SHIPPING_FEE_KRW, type OutputSize } from "@/lib/order-pricing";
import { clearOrderCart, readOrderCart, writeOrderCart, type OrderCartItem } from "@/lib/order-cart";

type OrderCartDialogProps = {
  open: boolean;
  onClose: () => void;
};

type ShippingForm = {
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  zipcode: string;
  addressLine1: string;
  addressLine2: string;
  memo: string;
  agree: boolean;
};

const initialShippingForm: ShippingForm = {
  buyerName: "",
  buyerPhone: "",
  buyerEmail: "",
  zipcode: "",
  addressLine1: "",
  addressLine2: "",
  memo: "",
  agree: false,
};

export default function OrderCartDialog({ open, onClose }: OrderCartDialogProps) {
  const [items, setItems] = useState<OrderCartItem[]>([]);
  const [form, setForm] = useState<ShippingForm>(initialShippingForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { rememberProfile } = useOrderProfile(open, setForm);

  const refresh = () => setItems(readOrderCart());

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("pocketgoods-order-cart-updated", handler);
    return () => window.removeEventListener("pocketgoods-order-cart-updated", handler);
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  const printAmount = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          (["A6", "A5", "A4"] as OutputSize[]).reduce(
            (itemSum, size) => itemSum + PRINT_PRICE_KRW[size] * item.quantities[size],
            0,
          ),
        0,
      ),
    [items],
  );
  const totalQuantity = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + (["A6", "A5", "A4"] as OutputSize[]).reduce((itemSum, size) => itemSum + item.quantities[size], 0),
        0,
      ),
    [items],
  );
  const amount = totalQuantity > 0 ? printAmount + SHIPPING_FEE_KRW : 0;
  const isFormReady =
    totalQuantity > 0 &&
    form.buyerName.trim() &&
    form.buyerPhone.trim() &&
    form.buyerEmail.trim() &&
    form.zipcode.trim() &&
    form.addressLine1.trim() &&
    form.addressLine2.trim() &&
    form.agree;

  if (!open) return null;

  const updateField =
    <K extends keyof ShippingForm>(key: K) =>
    (value: ShippingForm[K]) => {
      setForm((current) => ({ ...current, [key]: value }));
      setError(null);
      setMessage(null);
    };

  const updateQuantity = (itemId: string, size: OutputSize, quantity: number) => {
    const nextItems = items.map((item) =>
      item.id === itemId
        ? {
            ...item,
            quantities: { ...item.quantities, [size]: Math.max(0, Math.min(99, quantity)) },
          }
        : item,
    );
    setItems(nextItems);
    writeOrderCart(nextItems);
  };

  const removeItem = (itemId: string) => {
    const nextItems = items.filter((item) => item.id !== itemId);
    setItems(nextItems);
    writeOrderCart(nextItems);
  };

  const handlePayment = async () => {
    if (!isFormReady) {
      setError("주문할 디자인/수량과 배송 정보를 입력해주세요.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage("묶음 주문을 접수하는 중입니다…");

    const paymentId = `pocket_bundle_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const orderName = `투명 스티커 ${items.length}개 디자인 ${totalQuantity}장 묶음 주문`;
    const shipping = {
      buyerName: form.buyerName.trim(),
      buyerPhone: form.buyerPhone.trim(),
      buyerEmail: form.buyerEmail.trim(),
      zipcode: form.zipcode.trim(),
      addressLine1: form.addressLine1.trim(),
      addressLine2: form.addressLine2.trim(),
      memo: form.memo.trim(),
    };
    rememberProfile(shipping);
    const orderItems = items.map((item) => ({
      designId: item.id,
      outputSize: getPreferredSize(item),
      quantities: item.quantities,
      productType: item.productType,
      canvasJSON: item.canvasJSON,
    }));
    const primaryOutputSize = firstSelectedSize(items[0]) ?? "A5";

    try {
      setMessage("주문 정보를 서버로 보내는 중입니다…");
      const verification = await fetch(`${API_BASE_URL}/api/payments/complete-noverify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId,
          txId: "portone-disabled",
          orderName,
          amount,
          currency: "KRW",
          productType: "sticker",
          outputSize: primaryOutputSize,
          orderItems,
          shipping,
        }),
      });
      if (!verification.ok) {
        throw new Error(await readApiError(verification, "묶음 주문 접수에 실패했습니다."));
      }
      const verificationBody = await verification.json().catch(() => null);
      if (verificationBody?.emailSent === false) {
        throw new Error("주문은 접수됐지만 이메일 발송이 비활성화되어 있습니다. 이메일 설정을 확인해주세요.");
      }

      await Promise.all(
        items.map((item) =>
          fetch(`${API_BASE_URL}/api/export`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              canvas_json: item.canvasJSON,
              product_type: "sticker",
              output_size: firstSelectedSize(item) ?? "A5",
              order_id: `${paymentId}-${item.id}`,
              save_to_storage: true,
            }),
          }).catch(() => null),
        ),
      );

      clearOrderCart();
      setItems([]);
      setMessage("묶음 주문 접수가 완료되었습니다. 결제는 일시적으로 비활성화되어 있습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "주문 처리 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/45 p-0 md:items-center md:p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl md:rounded-3xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-base font-extrabold">묶음 주문함</h2>
            <p className="text-xs text-zinc-500">여러 디자인을 한 번에 결제하고 택배비는 1회만 부과됩니다.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100" aria-label="닫기">
            <X className="size-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-h-0 overflow-y-auto bg-zinc-50 p-4">
            {items.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed bg-white text-sm text-zinc-500">
                주문함이 비어 있습니다. 미리보기에서 “주문함에 담기”를 눌러주세요.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={item.id} className="rounded-2xl border bg-white p-3 shadow-sm">
                    <div className="flex gap-3">
                      <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200">
                        <Image src={item.thumbnailSrc} alt={item.title} fill className="object-contain" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="font-bold">디자인 {index + 1}</p>
                          <button onClick={() => removeItem(item.id)} className="text-red-500">
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {getItemSizeOrder(item).map((size) => (
                            <div key={size} className="rounded-lg bg-zinc-50 p-2">
                              <p className="text-xs font-bold">{size}</p>
                              {getPreferredSize(item) === size && (
                                <p className="text-[10px] font-semibold text-primary">처음 선택한 사이즈</p>
                              )}
                              <div className="mt-1 flex items-center gap-1">
                                <button className="grid size-6 place-items-center rounded-full border text-xs" onClick={() => updateQuantity(item.id, size, item.quantities[size] - 1)}>-</button>
                                <Input className="h-7 text-center" value={item.quantities[size]} onChange={(event) => updateQuantity(item.id, size, Number(event.target.value) || 0)} />
                                <button className="grid size-6 place-items-center rounded-full border text-xs" onClick={() => updateQuantity(item.id, size, item.quantities[size] + 1)}>+</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="min-h-0 overflow-y-auto border-t p-4 md:border-l md:border-t-0">
            <div className="rounded-xl bg-zinc-50 p-3 text-sm">
              <div className="flex justify-between"><span>인쇄비 합계</span><b>{printAmount.toLocaleString("ko-KR")}원</b></div>
              <div className="mt-2 flex justify-between"><span>택배비 <span className="text-[11px] text-zinc-400">(묶음 1회)</span></span><b>{totalQuantity > 0 ? SHIPPING_FEE_KRW.toLocaleString("ko-KR") : 0}원</b></div>
              <div className="mt-3 flex justify-between border-t pt-3 text-base"><span className="font-bold">총 결제금액</span><b>{amount.toLocaleString("ko-KR")}원</b></div>
            </div>

            <div className="mt-4 space-y-3">
              <Field label="주문자 이름" required><Input value={form.buyerName} onChange={(e) => updateField("buyerName")(e.target.value)} /></Field>
              <Field label="연락처" required><Input value={form.buyerPhone} onChange={(e) => updateField("buyerPhone")(e.target.value)} /></Field>
              <Field label="이메일" required><Input type="email" value={form.buyerEmail} onChange={(e) => updateField("buyerEmail")(e.target.value)} /></Field>
              <AddressSearchFields
                value={{
                  zipcode: form.zipcode,
                  addressLine1: form.addressLine1,
                  addressLine2: form.addressLine2,
                }}
                onChange={(key, value) => updateField(key)(value)}
              />
              <Field label="배송 메모"><Textarea rows={3} className="resize-none" value={form.memo} onChange={(e) => updateField("memo")(e.target.value)} /></Field>
              <label className="flex gap-2 rounded-xl border p-3 text-xs"><input type="checkbox" checked={form.agree} onChange={(e) => updateField("agree")(e.target.checked)} /> 개인정보를 결제/배송 처리에 사용하는 데 동의합니다.</label>
              {(message || error) && <p className={`rounded-xl p-3 text-sm ${error ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>{error ?? message}</p>}
              <Button className="w-full" onClick={handlePayment} disabled={submitting || !isFormReady}>
                {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ShoppingBag className="mr-2 size-4" />}
                묶음 주문 접수
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function firstSelectedSize(item: OrderCartItem): OutputSize | null {
  const preferredSize = getPreferredSize(item);
  if (item.quantities[preferredSize] > 0) {
    return preferredSize;
  }
  return SIZE_OPTIONS.find((size) => item.quantities[size] > 0) ?? null;
}

const SIZE_OPTIONS: OutputSize[] = ["A6", "A5", "A4"];

function getPreferredSize(item: OrderCartItem): OutputSize {
  return item.outputSize ?? firstQuantitySize(item) ?? "A5";
}

function firstQuantitySize(item: OrderCartItem): OutputSize | null {
  return SIZE_OPTIONS.find((size) => item.quantities[size] > 0) ?? null;
}

function getItemSizeOrder(item: OrderCartItem): OutputSize[] {
  const preferredSize = getPreferredSize(item);
  return [preferredSize, ...SIZE_OPTIONS.filter((size) => size !== preferredSize)];
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}{required && <span className="ml-0.5 text-red-500">*</span>}</Label>
      {children}
    </div>
  );
}
