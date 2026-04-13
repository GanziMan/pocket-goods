"use client";

import { createClient } from "@/lib/supabase/client";

const LOCAL_STORAGE_KEY = "pocketgoods-order-profile-v1";

export type OrderProfile = {
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  zipcode: string;
  addressLine1: string;
  addressLine2: string;
  memo: string;
};

const EMPTY_PROFILE: OrderProfile = {
  buyerName: "",
  buyerPhone: "",
  buyerEmail: "",
  zipcode: "",
  addressLine1: "",
  addressLine2: "",
  memo: "",
};

type OrderProfileRow = {
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  zipcode: string | null;
  address_line1: string | null;
  address_line2: string | null;
  memo: string | null;
};

function fromRow(row: OrderProfileRow): OrderProfile {
  return {
    buyerName: row.buyer_name ?? "",
    buyerPhone: row.buyer_phone ?? "",
    buyerEmail: row.buyer_email ?? "",
    zipcode: row.zipcode ?? "",
    addressLine1: row.address_line1 ?? "",
    addressLine2: row.address_line2 ?? "",
    memo: row.memo ?? "",
  };
}

function toRow(profile: OrderProfile, userId: string) {
  return {
    user_id: userId,
    buyer_name: profile.buyerName,
    buyer_phone: profile.buyerPhone,
    buyer_email: profile.buyerEmail,
    zipcode: profile.zipcode,
    address_line1: profile.addressLine1,
    address_line2: profile.addressLine2,
    memo: profile.memo,
    updated_at: new Date().toISOString(),
  };
}

function readLocalProfile(): OrderProfile | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    return { ...EMPTY_PROFILE, ...JSON.parse(raw) } as OrderProfile;
  } catch {
    return null;
  }
}

function writeLocalProfile(profile: OrderProfile) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Local persistence is best-effort only.
  }
}

function cleanProfile(profile: OrderProfile): OrderProfile {
  return {
    buyerName: profile.buyerName.trim(),
    buyerPhone: profile.buyerPhone.trim(),
    buyerEmail: profile.buyerEmail.trim(),
    zipcode: profile.zipcode.trim(),
    addressLine1: profile.addressLine1.trim(),
    addressLine2: profile.addressLine2.trim(),
    memo: profile.memo.trim(),
  };
}

export async function loadOrderProfile(): Promise<OrderProfile | null> {
  const localProfile = readLocalProfile();

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return localProfile;

    const { data, error } = await supabase
      .from("user_order_profiles")
      .select("buyer_name,buyer_phone,buyer_email,zipcode,address_line1,address_line2,memo")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.warn("Order profile load skipped:", error.message);
      return localProfile;
    }

    return data ? fromRow(data as OrderProfileRow) : localProfile;
  } catch (error) {
    console.warn("Order profile load skipped:", error);
    return localProfile;
  }
}

export async function saveOrderProfile(profile: OrderProfile): Promise<boolean> {
  const cleaned = cleanProfile(profile);
  writeLocalProfile(cleaned);

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.from("user_order_profiles").upsert(toRow(cleaned, user.id), {
      onConflict: "user_id",
    });

    if (error) {
      console.warn("Order profile save skipped:", error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.warn("Order profile save skipped:", error);
    return false;
  }
}
