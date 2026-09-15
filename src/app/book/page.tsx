"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BookingDatePicker from "@/components/booking/DatePicker";
import TimeSlotPicker from "@/components/booking/TimeSlotPicker";
import BookingForm from "@/components/booking/BookingForm";
import ConsultationPriceSummary from "@/components/booking/ConsultationPriceSummary";
import { TimeSlot, ConsultationSettingsPublic } from "@/types";
import { useLanguage } from "@/context/LanguageContext";
import { DEFAULT_CONSULTATION_SETTINGS, calculateFinalPrice } from "@/lib/consultationSettings";

type Step = "date" | "time" | "form";

export default function BookPage() {
  const { isRtl, t, lang } = useLanguage();
  const [step, setStep] = useState<Step>("date");
  const [date, setDate] = useState<Date | undefined>();
  const [slot, setSlot] = useState<TimeSlot | null>(null);
  const [pricing, setPricing] = useState<ConsultationSettingsPublic>({
    ...DEFAULT_CONSULTATION_SETTINGS,
    final_price_usd: calculateFinalPrice(
      DEFAULT_CONSULTATION_SETTINGS.base_price_usd,
      DEFAULT_CONSULTATION_SETTINGS.discount_percent
    ),
  });

  useEffect(() => {
    fetch("/api/consultation-settings")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.session_duration_minutes === "number") {
          setPricing({
            session_duration_minutes: d.session_duration_minutes,
            base_price_usd: d.base_price_usd,
            discount_percent: d.discount_percent,
            final_price_usd: d.final_price_usd,
          });
        }
      })
      .catch(() => undefined);
  }, []);

  const handleDateSelect = (d: Date | undefined) => {
    setDate(d);
    setSlot(null);
    if (d) setStep("time");
  };

  const handleSlotSelect = (s: TimeSlot) => {
    setSlot(s);
    setStep("form");
  };

  const steps = [t("choose_date"), t("choose_time"), t("your_details")];
  const stepIndex = ["date", "time", "form"].indexOf(step);

  const formatDate = (d: Date, formatStr: string) => {
    return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-US", {
      weekday: formatStr.includes("EEEE") ? "long" : undefined,
      month: "long",
      day: "numeric",
    }).format(d);
  };

  return (
    <>
      <Navbar />
      <main className={`min-h-screen bg-[#faf9f6] pt-24 pb-20 px-4 sm:px-6 ${isRtl ? "text-right" : "text-left"}`}>
        <div className="max-w-xl mx-auto min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8 sm:mb-10"
          >
            <h1
              className={`text-3xl sm:text-4xl text-[#1a1a2e] mb-2 ${isRtl ? "font-arabic-display" : ""}`}
              style={{ fontFamily: isRtl ? undefined : "Cormorant Garamond, Georgia, serif" }}
            >
              {t("book_session")}
            </h1>
            <ConsultationPriceSummary
              className="flex flex-col items-center"
              durationMinutes={pricing.session_duration_minutes}
              basePriceUsd={pricing.base_price_usd}
              discountPercent={pricing.discount_percent}
              finalPriceUsd={pricing.final_price_usd}
            />
          </motion.div>

          {/* Step indicator: labels always visible on mobile (not numbers-only) */}
          <div
            className={`flex flex-col gap-2 mb-8 sm:mb-10 ${isRtl ? "items-stretch" : ""}`}
            aria-label={isRtl ? "خطوات الحجز" : "Booking steps"}
          >
            <div
              className={`flex items-stretch justify-between gap-1.5 sm:gap-2 ${
                isRtl ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {steps.map((label, i) => (
                <div
                  key={label}
                  className={`flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 rounded-full text-[11px] sm:text-xs font-medium transition-all ${
                    i === stepIndex
                      ? "bg-[#0d7377] text-white shadow-sm"
                      : i < stepIndex
                        ? "bg-[#0d7377]/15 text-[#0d7377]"
                        : "bg-[#f0ede6] text-[#9ca3af]"
                  } ${isRtl ? "font-arabic" : ""}`}
                  aria-current={i === stepIndex ? "step" : undefined}
                >
                  <span className="flex-shrink-0 opacity-80" aria-hidden>
                    {i + 1}
                  </span>
                  <span className="truncate">{label}</span>
                </div>
              ))}
            </div>
            <p
              className={`text-center text-xs text-[#6b7280] sm:hidden ${
                isRtl ? "font-arabic" : ""
              }`}
            >
              {isRtl
                ? `الخطوة ${stepIndex + 1} من ${steps.length}: ${steps[stepIndex]}`
                : `Step ${stepIndex + 1} of ${steps.length}: ${steps[stepIndex]}`}
            </p>
          </div>

          <motion.div
            key={step}
            initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-3xl shadow-sm border border-[#e5e0d8] p-4 sm:p-6 md:p-8"
          >
            {step === "date" && (
              <div>
                <p className={`text-sm font-medium text-[#1a1a2e] mb-6 text-center ${isRtl ? "font-arabic" : ""}`}>
                  {t("select_date_info")}
                </p>
                <BookingDatePicker selected={date} onSelect={handleDateSelect} />
              </div>
            )}

            {step === "time" && date && (
              <div>
                <button
                  onClick={() => setStep("date")}
                  className={`text-xs text-[#0d7377] mb-4 flex items-center gap-1 hover:underline ${isRtl ? "flex-row-reverse font-arabic" : ""}`}
                >
                  {isRtl ? "→" : "←"} {formatDate(date, "MMMM d")}
                </button>
                <p className={`text-sm font-medium text-[#1a1a2e] mb-6 ${isRtl ? "font-arabic" : ""}`}>
                  {t("available_times")}{" "}
                  <span className="text-[#0d7377]">{formatDate(date, "EEEE, MMMM d")}</span>
                  <span className={`block text-xs font-normal text-[#6b7280] mt-1 ${isRtl ? "font-arabic" : ""}`}>
                    {t("istanbul_time")}
                  </span>
                </p>
                <TimeSlotPicker date={date} selectedSlot={slot} onSelect={handleSlotSelect} />
              </div>
            )}

            {step === "form" && date && slot && (
              <div>
                <button
                  onClick={() => setStep("time")}
                  className={`text-xs text-[#0d7377] mb-4 flex items-center gap-1 hover:underline ${isRtl ? "flex-row-reverse font-arabic" : ""}`}
                >
                  {isRtl ? "→" : "←"} {t("change_time")}
                </button>
                <BookingForm slot={slot} date={date} />
              </div>
            )}
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
