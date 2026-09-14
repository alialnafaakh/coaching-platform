"use client";

import { formatUsd } from "@/lib/consultationSettings";
import { useLanguage } from "@/context/LanguageContext";

type Props = {
  durationMinutes: number;
  basePriceUsd: number;
  discountPercent: number;
  finalPriceUsd: number;
  className?: string;
};

export default function ConsultationPriceSummary({
  durationMinutes,
  basePriceUsd,
  discountPercent,
  finalPriceUsd,
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
            <span className={`text-[#9ca3af] line-through ${isRtl ? "ml-2" : "mr-2"}`}>
              {formatUsd(basePriceUsd)}
            </span>
            <span className="font-semibold text-[#0d7377]">{formatUsd(finalPriceUsd)}</span>
            <span className={`text-xs text-[#9a7520] ${isRtl ? "mr-2" : "ml-2"}`}>
              ({discountPercent}% {t("off_label")})
            </span>
          </>
        ) : (
          <span className="font-semibold text-[#0d7377]">{formatUsd(finalPriceUsd)}</span>
        )}
      </p>
    </div>
  );
}
