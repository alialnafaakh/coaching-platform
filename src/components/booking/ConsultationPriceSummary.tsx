"use client";

import { formatUsd } from "@/lib/consultationSettings";
import { useLanguage } from "@/context/LanguageContext";

type Props = {
  durationMinutes: number;
  basePriceUsd: number;
  discountPercent: number;
  finalPriceUsd: number;
  totalIqd?: number | null;
  className?: string;
};

export default function ConsultationPriceSummary({
  durationMinutes,
  basePriceUsd,
  discountPercent,
  finalPriceUsd,
  totalIqd,
  className = "",
}: Props) {
  const { isRtl, t } = useLanguage();
  const showDiscount = discountPercent > 0;

  return (
    <div className={`${isRtl ? "text-right font-arabic" : "text-left"} ${className}`}>
      <p className="text-sm text-[#6b7280]">
        {durationMinutes} {t("minutes_unit")} · {t("session_label")}
      </p>
      <p className="text-sm text-[#1a1a2e] mt-1">
        {showDiscount ? (
          <>
            <span className={`text-[#6b7280] line-through ${isRtl ? "ml-2" : "mr-2"}`}>
              <span className="sr-only">{isRtl ? "السعر الأصلي: " : "Original price: "}</span><bdi dir="ltr">{formatUsd(basePriceUsd)}</bdi>
            </span>
            <span className="font-semibold text-[#0d7377]"><span className="sr-only">{isRtl ? "السعر المستحق: " : "Payable price: "}</span><bdi dir="ltr">{formatUsd(finalPriceUsd)}</bdi></span>
            <span className={`text-xs text-[#765510] ${isRtl ? "mr-2" : "ml-2"}`}>
              ({discountPercent}% {t("off_label")})
            </span>
          </>
        ) : (
          <span className="font-semibold text-[#0d7377]"><bdi dir="ltr">{formatUsd(finalPriceUsd)}</bdi></span>
        )}
      </p>
      {typeof totalIqd === "number" && <p className="mt-2 text-sm text-[#374151]">
        {isRtl ? "المبلغ للدفع عبر ويل: " : "Wayl checkout amount: "}
        <bdi dir="ltr" className="font-semibold">{new Intl.NumberFormat("en-US").format(totalIqd)} IQD</bdi>
      </p>}
    </div>
  );
}
