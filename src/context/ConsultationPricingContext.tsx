"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { ConsultationSettingsPublic } from "@/types";

type PublicQuote = ConsultationSettingsPublic & { payment_total_iqd: number; usd_to_iqd_rate: number };
const PricingContext = createContext<{ pricing: PublicQuote | null; failed: boolean }>({ pricing: null, failed: false });

export function ConsultationPricingProvider({ children }: { children: React.ReactNode }) {
  const [pricing, setPricing] = useState<PublicQuote | null>(null);
  const [failed, setFailed] = useState(false);
  const pathname = usePathname();
  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/consultation-settings", { cache: "no-store", signal });
      const data = await response.json();
      if (!response.ok || ![data.session_duration_minutes, data.base_price_usd,
        data.discount_percent, data.final_price_usd, data.payment_total_iqd, data.usd_to_iqd_rate]
        .every(value => typeof value === "number" && Number.isFinite(value)) ||
        data.final_price_usd <= 0 || data.payment_total_iqd < 1000) throw new Error();
      if (signal?.aborted) return;
      setPricing(data);
      setFailed(false);
    } catch {
      if (signal?.aborted) return;
      // Never substitute a hard-coded payable price when the authoritative read fails.
      setPricing(null);
      setFailed(true);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const update = () => { void refresh(controller.signal); };
    const initial = window.setTimeout(update, 0);
    const visible = () => { if (document.visibilityState === "visible") update(); };
    const timer = window.setInterval(visible, 60000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", visible);
    return () => {
      controller.abort(); window.clearTimeout(initial); window.clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh, pathname]);
  return <PricingContext.Provider value={{ pricing, failed }}>{children}</PricingContext.Provider>;
}

export function useConsultationPricing() { return useContext(PricingContext); }
