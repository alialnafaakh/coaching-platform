"use client";

import { useConsultationPricing } from "@/context/ConsultationPricingContext";
import { useLanguage } from "@/context/LanguageContext";
import { formatUsd } from "@/lib/consultationSettings";
import ConsultationPriceSummary from "./ConsultationPriceSummary";

export default function CurrentConsultationPrice({ compact = false }: { compact?: boolean }) {
  const { pricing, failed } = useConsultationPricing();
  const { isRtl } = useLanguage();
  if (!pricing) return <span role="status" className="text-sm">{failed
    ? isRtl ? "الأسعار غير متاحة حاليًا. يُرجى المحاولة لاحقًا." : "Pricing is unavailable. Please try again later."
    : isRtl ? "جارٍ تحميل السعر…" : "Loading pricing…"}</span>;
  if (compact) return <span className="inline-flex flex-wrap justify-center items-baseline gap-2">
    {pricing.discount_percent > 0 && <del><bdi dir="ltr">{formatUsd(pricing.base_price_usd)}</bdi></del>}
    <strong><bdi dir="ltr">{formatUsd(pricing.final_price_usd)}</bdi></strong>
  </span>;
  return <ConsultationPriceSummary durationMinutes={pricing.session_duration_minutes}
    basePriceUsd={pricing.base_price_usd} discountPercent={pricing.discount_percent}
    finalPriceUsd={pricing.final_price_usd} totalIqd={pricing.payment_total_iqd} />;
}
