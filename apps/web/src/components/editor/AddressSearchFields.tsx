"use client";

import { useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AddressValue = {
  zipcode: string;
  addressLine1: string;
  addressLine2: string;
};

type AddressSearchFieldsProps = {
  value: AddressValue;
  onChange: <K extends keyof AddressValue>(key: K, value: AddressValue[K]) => void;
};

type PostcodeData = {
  zonecode: string;
  address: string;
  roadAddress: string;
  jibunAddress: string;
  userSelectedType: "R" | "J";
  bname: string;
  buildingName: string;
  apartment: "Y" | "N";
};

type PostcodeConstructor = new (options: {
  oncomplete: (data: PostcodeData) => void;
  width?: string;
  height?: string;
}) => {
  open: () => void;
};

declare global {
  interface Window {
    kakao?: {
      Postcode?: PostcodeConstructor;
    };
    daum?: {
      Postcode?: PostcodeConstructor;
    };
  }
}

const POSTCODE_SCRIPT_ID = "kakao-postcode-script";
const POSTCODE_SCRIPT_SRC = "https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

let postcodeScriptPromise: Promise<void> | null = null;

function getPostcodeConstructor() {
  return window.kakao?.Postcode ?? window.daum?.Postcode;
}

function loadPostcodeScript() {
  const existingConstructor = getPostcodeConstructor();
  if (existingConstructor) {
    return Promise.resolve();
  }

  if (postcodeScriptPromise) {
    return postcodeScriptPromise;
  }

  postcodeScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(POSTCODE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("주소 검색 스크립트 로딩에 실패했습니다.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.id = POSTCODE_SCRIPT_ID;
    script.src = POSTCODE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("주소 검색 스크립트 로딩에 실패했습니다."));
    document.head.appendChild(script);
  });

  return postcodeScriptPromise;
}

function getExtraAddress(data: PostcodeData) {
  const extraParts: string[] = [];
  if (data.bname && /[동로가]$/.test(data.bname)) {
    extraParts.push(data.bname);
  }
  if (data.buildingName && data.apartment === "Y") {
    extraParts.push(data.buildingName);
  }
  return extraParts.length > 0 ? ` (${extraParts.join(", ")})` : "";
}

function getSelectedAddress(data: PostcodeData) {
  if (data.userSelectedType === "R") {
    return `${data.roadAddress}${getExtraAddress(data)}`;
  }
  return data.jibunAddress || data.address;
}

export default function AddressSearchFields({ value, onChange }: AddressSearchFieldsProps) {
  const detailRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPostcode = async () => {
    setLoading(true);
    setError(null);
    try {
      await loadPostcodeScript();
      const Postcode = getPostcodeConstructor();
      if (!Postcode) {
        throw new Error("주소 검색 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해주세요.");
      }

      new Postcode({
        oncomplete: (data) => {
          onChange("zipcode", data.zonecode);
          onChange("addressLine1", getSelectedAddress(data));
          window.setTimeout(() => detailRef.current?.focus(), 0);
        },
        width: "100%",
        height: "100%",
      }).open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "주소 검색을 열 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">
            우편번호<span className="ml-0.5 text-red-500">*</span>
          </Label>
          <Input value={value.zipcode} readOnly placeholder="주소 검색으로 입력" className="bg-zinc-50" />
        </div>
        <div className="flex items-end">
          <Button type="button" variant="outline" onClick={openPostcode} disabled={loading}>
            {loading ? <MapPin className="mr-2 size-4 animate-pulse" /> : <Search className="mr-2 size-4" />}
            주소 검색
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">
          주소<span className="ml-0.5 text-red-500">*</span>
        </Label>
        <Input value={value.addressLine1} readOnly placeholder="도로명/지번 주소" className="bg-zinc-50" />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">
          상세 주소<span className="ml-0.5 text-red-500">*</span>
        </Label>
        <Input
          ref={detailRef}
          value={value.addressLine2}
          onChange={(event) => onChange("addressLine2", event.target.value)}
          placeholder="동/호수, 건물명 등 상세주소를 입력해주세요"
          autoComplete="address-line2"
        />
      </div>

      {error && <p className="rounded-xl bg-red-50 p-3 text-xs text-red-600">{error}</p>}
    </div>
  );
}
