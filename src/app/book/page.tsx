"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BookingDatePicker from "@/components/booking/DatePicker";
import TimeSlotPicker from "@/components/booking/TimeSlotPicker";
import BookingForm, { type BookingFormDraft } from "@/components/booking/BookingForm";
import ConsultationPriceSummary from "@/components/booking/ConsultationPriceSummary";
import { TimeSlot } from "@/types";
import { useLanguage } from "@/context/LanguageContext";
import { useConsultationPricing } from "@/context/ConsultationPricingContext";
import CurrentConsultationPrice from "@/components/booking/CurrentConsultationPrice";

type Step = "date" | "time" | "form";

function BookingBackButton({
  onClick,
  label,
  isRtl,
}: {
  onClick: () => void;
  label: string;
  isRtl: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium text-[#0d7377] border border-[#0d7377]/25 bg-white hover:bg-[#0d7377]/5 transition-colors ${
        isRtl ? "font-arabic" : ""
      }`}
    >
      <span aria-hidden className="text-base leading-none">
        {isRtl ? "→" : "←"}
      </span>
      <span>{label}</span>
    </button>
  );
}

export default function BookPage() {
  const { isRtl, t, lang } = useLanguage();
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const firstStep = useRef(true);
  const [step, setStep] = useState<Step>("date");
  useEffect(() => {
    if (firstStep.current) { firstStep.current = false; return; }
    stepHeading.current?.focus({ preventScroll: true });
    stepHeading.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [step]);
  const [date, setDate] = useState<Date | undefined>();
  const [slot, setSlot] = useState<TimeSlot | null>(null);
  const [draft, setDraft] = useState<BookingFormDraft>({
    name: "",
    email: "",
    notes: "",
  });
  const { pricing } = useConsultationPricing();

  /** Selecting a date advances to Time and clears an incompatible prior slot. */
  const handleDateSelect = (d: Date | undefined) => {
    setDate(d);
    setSlot(null);
    if (d) setStep("time");
  };

  const handleSlotSelect = (s: TimeSlot) => {
    setSlot(s);
    setStep("form");
  };

  const goBackToDate = () => {
    // Client-side only — preserve selected date; keep form draft.
    setStep("date");
  };

  const goBackToTime = () => {
    // Client-side only — preserve date + slot + draft; no API calls.
    setStep("time");
  };

  const steps = [t("choose_date"), t("choose_time"), t("your_details")];
  const stepIndex = ["date", "time", "form"].indexOf(step);
  const backLabel = t("booking_back");

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
      <main
        className={`min-h-screen bg-[#faf9f6] pt-24 pb-20 px-4 sm:px-6 ${
          isRtl ? "text-right" : "text-left"
        }`}
      >
        <div className="max-w-xl mx-auto min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8 sm:mb-10"
          >
            <h1
              className={`text-3xl sm:text-4xl text-[#1a1a2e] mb-2 ${
                isRtl ? "font-arabic-display" : ""
              }`}
              style={{
                fontFamily: isRtl ? undefined : "Cormorant Garamond, Georgia, serif",
              }}
            >
              {t("book_session")}
            </h1>
            {pricing ? <ConsultationPriceSummary
              className="flex flex-col items-center"
              durationMinutes={pricing.session_duration_minutes}
              totalIqd={pricing.payment_total_iqd}
              basePriceUsd={pricing.base_price_usd}
              discountPercent={pricing.discount_percent}
              finalPriceUsd={pricing.final_price_usd}
            /> : <CurrentConsultationPrice />}
          </motion.div>

          <div
            className={`flex flex-col gap-2 mb-8 sm:mb-10 ${isRtl ? "items-stretch" : ""}`}
            aria-label={isRtl ? "خطوات الحجز" : "Booking steps"}
          >
            <div
              className="flex flex-row items-stretch justify-between gap-1.5 sm:gap-2"
            >
              {steps.map((label, i) => (
                <div
                  key={label}
                  className={`flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 rounded-full text-[11px] sm:text-xs font-medium transition-all ${
                    i === stepIndex
                      ? "bg-[#0d7377] text-white shadow-sm"
                      : i < stepIndex
                        ? "bg-[#0d7377]/15 text-[#0d7377]"
                        : "bg-[#f0ede6] text-[#6b7280]"
                  } ${isRtl ? "font-arabic" : ""}`}
                  aria-current={i === stepIndex ? "step" : undefined}
                >
                  <span className="flex-shrink-0 opacity-80" aria-hidden>
                    {i + 1}
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{(isRtl ? ["التاريخ", "الوقت", "البيانات"] : ["Date", "Time", "Details"])[i]}</span>
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

          {pricing && <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-3xl shadow-sm border border-[#e5e0d8] p-4 sm:p-6 md:p-8"
          >
            <h2 ref={stepHeading} tabIndex={-1} className="sr-only scroll-mt-24">{steps[stepIndex]}</h2>
            {step === "date" && (
              <div>
                <p
                  className={`text-sm font-medium text-[#1a1a2e] mb-6 text-center ${
                    isRtl ? "font-arabic" : ""
                  }`}
                >
                  {t("select_date_info")}
                </p>
                <BookingDatePicker selected={date} onSelect={handleDateSelect} />
              </div>
            )}

            {step === "time" && date && (
              <div>
                <div className="mb-5">
                  <BookingBackButton
                    onClick={goBackToDate}
                    label={backLabel}
                    isRtl={isRtl}
                  />
                </div>
                <p className={`text-sm font-medium text-[#1a1a2e] mb-2 ${isRtl ? "font-arabic" : ""}`}>
                  {t("available_times")}{" "}
                  <span className="text-[#0d7377]">{formatDate(date, "EEEE, MMMM d")}</span>
                  <span
                    className={`block text-xs font-normal text-[#6b7280] mt-1 ${
                      isRtl ? "font-arabic" : ""
                    }`}
                  >
                    {t("istanbul_time")}
                  </span>
                </p>
                <TimeSlotPicker
                  date={date}
                  selectedSlot={
                    slot && date
                      ? // Guard: if slot somehow mismatches day, treat as none
                        slot
                      : null
                  }
                  onSelect={handleSlotSelect}
                />
              </div>
            )}

            {step === "form" && date && slot && (
              <div>
                <div className="mb-5">
                  <BookingBackButton
                    onClick={goBackToTime}
                    label={backLabel}
                    isRtl={isRtl}
                  />
                </div>
                <BookingForm
                  slot={slot}
                  date={date}
                  draft={draft}
                  onDraftChange={setDraft}
                />
              </div>
            )}
          </motion.div>}
        </div>
      </main>
      <Footer />
    </>
  );
}
