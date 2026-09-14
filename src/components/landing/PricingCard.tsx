"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import {
  DEFAULT_CONSULTATION_SETTINGS,
  calculateFinalPrice,
  formatUsd,
} from "@/lib/consultationSettings";

export default function PricingCard({
  title = "Investment",
  features,
}: {
  title?: string;
  features?: string[];
}) {
  const { isRtl, t } = useLanguage();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [duration, setDuration] = useState(DEFAULT_CONSULTATION_SETTINGS.session_duration_minutes);
  const [basePrice, setBasePrice] = useState(DEFAULT_CONSULTATION_SETTINGS.base_price_usd);
  const [discount, setDiscount] = useState(DEFAULT_CONSULTATION_SETTINGS.discount_percent);
  const finalPrice = calculateFinalPrice(basePrice, discount);
  const showDiscount = discount > 0;

  useEffect(() => {
    fetch("/api/consultation-settings")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.session_duration_minutes === "number") {
          setDuration(d.session_duration_minutes);
          setBasePrice(d.base_price_usd);
          setDiscount(d.discount_percent);
        }
      })
      .catch(() => undefined);
  }, []);

  const defaultIncluded = [
    `${duration}-minute private session via video`,
    "Personalized biopsychosocial intake",
    "Session summary & action plan",
    "Resource recommendations",
    "Secure, confidential booking",
    "Follow-up support email",
  ];
  const included = features && features.length > 0 ? features : defaultIncluded;

  return (
    <section id="pricing" ref={ref} className="py-28 px-6 bg-[#f0ede6]">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            className={`text-xs uppercase tracking-widest text-[#0d7377] font-medium mb-4 ${isRtl ? "font-arabic" : ""}`}
          >
            {title}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className={`text-4xl md:text-5xl text-[#1a1a2e] ${isRtl ? "font-arabic-display" : ""}`}
            style={{ fontFamily: isRtl ? undefined : "Cormorant Garamond, Georgia, serif" }}
          >
            {t("pricing_headline")}
          </motion.h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative bg-white rounded-3xl overflow-hidden shadow-2xl border border-[#e5e0d8]"
        >
          <div
            className="h-1.5 w-full"
            style={{ background: "linear-gradient(90deg, #0d7377, #d4a843)" }}
          />

          <div className="p-8 md:p-12">
            <div className={`flex flex-col md:flex-row md:items-start md:justify-between gap-8 ${isRtl ? "md:flex-row-reverse" : ""}`}>
              <div className={isRtl ? "text-right" : "text-left"}>
                <p className={`text-sm font-medium text-[#6b7280] mb-3 ${isRtl ? "font-arabic" : ""}`}>
                  {t("one_on_one")} · {duration} {t("minutes_unit")}
                </p>

                <div className={`flex items-baseline gap-3 mb-2 ${isRtl ? "flex-row-reverse" : ""}`}>
                  {showDiscount && (
                    <span className="text-2xl text-[#d1d5db] line-through font-light">
                      {formatUsd(basePrice)}
                    </span>
                  )}
                  <span
                    className={`text-6xl font-semibold text-[#1a1a2e] ${isRtl ? "font-arabic-display" : ""}`}
                    style={{ fontFamily: isRtl ? undefined : "Cormorant Garamond, Georgia, serif" }}
                  >
                    {formatUsd(finalPrice)}
                  </span>
                </div>

                {showDiscount && (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#d4a843]/15 text-[#9a7520] border border-[#d4a843]/30 ${isRtl ? "font-arabic flex-row-reverse" : ""}`}>
                    {discount}% {t("off_label")}
                  </span>
                )}

                <p className={`mt-4 text-sm text-[#6b7280] ${isRtl ? "font-arabic" : ""}`}>
                  {duration} {t("minutes_unit")} · {t("pricing_footer")}
                </p>
              </div>

              <ul className={`flex flex-col gap-3 ${isRtl ? "text-right" : "text-left"}`}>
                {included.map((item: string) => (
                  <li key={item} className={`flex items-center gap-3 text-sm text-[#374151] ${isRtl ? "flex-row-reverse" : ""}`}>
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs"
                      style={{ background: "#0d7377" }}
                    >
                      ✓
                    </span>
                    <span className={isRtl ? "font-arabic" : ""}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={`mt-10 flex flex-col sm:flex-row items-center gap-4 ${isRtl ? "sm:flex-row-reverse" : ""}`}>
              <Link
                href="/book"
                className={`w-full sm:w-auto text-center px-10 py-4 rounded-full text-base font-medium text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 ${isRtl ? "font-arabic" : ""}`}
                style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
              >
                {t("reserve_spot")} {isRtl ? "←" : "→"}
              </Link>
              <p className={`text-xs text-[#9ca3af] text-center ${isRtl ? "font-arabic" : ""}`}>
                {t("pricing_disclaimer")}
              </p>
            </div>
          </div>

          <div
            className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full opacity-8"
            style={{ background: "radial-gradient(circle, #0d7377, transparent)" }}
          />
        </motion.div>
      </div>
    </section>
  );
}
