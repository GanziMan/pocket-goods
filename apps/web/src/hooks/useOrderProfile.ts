"use client";

import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { loadOrderProfile, saveOrderProfile, type OrderProfile } from "@/lib/order-profile";

export function useOrderProfile<T extends OrderProfile>(
  active: boolean,
  setForm: Dispatch<SetStateAction<T>>,
) {
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    if (!active || profileLoaded) return;
    let cancelled = false;

    void loadOrderProfile().then((profile) => {
      if (cancelled || !profile) return;
      setForm((current) => ({
        ...current,
        buyerName: current.buyerName || profile.buyerName,
        buyerPhone: current.buyerPhone || profile.buyerPhone,
        buyerEmail: current.buyerEmail || profile.buyerEmail,
        zipcode: current.zipcode || profile.zipcode,
        addressLine1: current.addressLine1 || profile.addressLine1,
        addressLine2: current.addressLine2 || profile.addressLine2,
        memo: current.memo || profile.memo,
      }));
      setProfileLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [active, profileLoaded, setForm]);

  const rememberProfile = useCallback((profile: OrderProfile) => {
    void saveOrderProfile(profile);
  }, []);

  return { rememberProfile };
}
