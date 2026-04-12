import logging
import os
from typing import Any, Literal
from urllib.parse import quote

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payments", tags=["payments"])

ORDER_AMOUNT_KRW = 7000
PORTONE_API_BASE = "https://api.portone.io"


class ShippingInfo(BaseModel):
    buyerName: str = Field(min_length=1, max_length=80)
    buyerPhone: str = Field(min_length=6, max_length=30)
    buyerEmail: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=120)
    zipcode: str = Field(min_length=1, max_length=20)
    addressLine1: str = Field(min_length=1, max_length=200)
    addressLine2: str = Field(min_length=1, max_length=200)
    memo: str = Field(default="", max_length=500)


class CompletePaymentRequest(BaseModel):
    paymentId: str = Field(min_length=1, max_length=120)
    txId: str = Field(min_length=1, max_length=120)
    orderName: str = Field(min_length=1, max_length=120)
    amount: int = ORDER_AMOUNT_KRW
    currency: Literal["KRW"] = "KRW"
    productType: Literal["keyring", "sticker"]
    outputSize: Literal["A4", "A5", "A6"]
    shipping: ShippingInfo


class CompletePaymentResponse(BaseModel):
    ok: bool
    paymentId: str
    txId: str | None = None
    status: str
    amount: int
    orderStatus: Literal["paid"]


def _extract_total_amount(payment: dict[str, Any]) -> int | None:
    amount = payment.get("amount")

    if isinstance(amount, int):
        return amount

    if isinstance(amount, dict):
        for key in ("total", "totalAmount", "paid", "paidAmount"):
            value = amount.get(key)
            if isinstance(value, int):
                return value
            if isinstance(value, float):
                return int(value)

    for key in ("totalAmount", "paidAmount", "amount"):
        value = payment.get(key)
        if isinstance(value, int):
            return value
        if isinstance(value, float):
            return int(value)

    return None


@router.post("/complete", response_model=CompletePaymentResponse)
async def complete_payment(req: CompletePaymentRequest):
    """
    PortOne V2 결제 단건 조회로 결제 상태와 금액을 서버에서 검증합니다.
    실제 주문 저장소가 붙기 전까지는 검증 완료 응답만 반환합니다.
    """
    if req.amount != ORDER_AMOUNT_KRW:
        raise HTTPException(status_code=400, detail="주문 금액이 올바르지 않습니다.")

    api_secret = os.getenv("PORTONE_API_SECRET")
    if not api_secret:
        raise HTTPException(
            status_code=503,
            detail="PORTONE_API_SECRET이 설정되지 않아 결제 검증을 완료할 수 없습니다.",
        )

    payment_id = quote(req.paymentId, safe="")

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(
                f"{PORTONE_API_BASE}/payments/{payment_id}",
                headers={"Authorization": f"PortOne {api_secret}"},
            )
    except httpx.HTTPError as exc:
        logger.exception("[payments] PortOne payment lookup failed: %s", exc)
        raise HTTPException(status_code=502, detail="포트원 결제 조회에 실패했습니다.") from exc

    if response.status_code >= 400:
        logger.warning(
            "[payments] PortOne lookup error status=%s body=%s",
            response.status_code,
            response.text[:500],
        )
        raise HTTPException(status_code=502, detail="포트원 결제 조회 응답이 올바르지 않습니다.")

    payment = response.json()
    status = str(payment.get("status", "")).upper()
    paid_amount = _extract_total_amount(payment)

    if paid_amount != ORDER_AMOUNT_KRW:
        logger.warning(
            "[payments] amount mismatch paymentId=%s expected=%s actual=%s",
            req.paymentId,
            ORDER_AMOUNT_KRW,
            paid_amount,
        )
        raise HTTPException(status_code=400, detail="결제 금액이 주문 금액과 일치하지 않습니다.")

    if status != "PAID":
        logger.warning("[payments] payment not paid paymentId=%s status=%s", req.paymentId, status)
        raise HTTPException(status_code=400, detail=f"결제가 완료 상태가 아닙니다: {status or 'UNKNOWN'}")

    logger.info(
        "[payments] paid paymentId=%s txId=%s product=%s output=%s receiver=%s",
        req.paymentId,
        req.txId,
        req.productType,
        req.outputSize,
        req.shipping.buyerName,
    )

    return CompletePaymentResponse(
        ok=True,
        paymentId=req.paymentId,
        txId=req.txId,
        status=status,
        amount=paid_amount,
        orderStatus="paid",
    )
