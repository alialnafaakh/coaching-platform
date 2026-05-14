"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BookingDatePicker from "@/components/booking/DatePicker";
import TimeSlotPicker from "@/components/booking/TimeSlotPicker";
import BookingForm from "@/components/booking/BookingForm";
import { TimeSlot } from "@/types";

type Step = "date" | "time" | "form";

import { useLanguage } from "@/context/LanguageContext";

export default function BookPage() {
  const { isRtl, t, lang } = useLanguage();
  const [step, setStep] = useState<Step>("date");
  const [date, setDate] = useState<Date | undefined>();
  const [slot, setSlot] = useState<TimeSlot | null>(null);

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
      <main className={`min-h-screen bg-[#faf9f6] pt-24 pb-20 px-6 ${isRtl ? "text-right" : "text-left"}`}>
        <div className="max-w-xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <h1
              className={`text-4xl text-[#1a1a2e] mb-2 ${isRtl ? "font-arabic-display" : ""}`}
              style={{ fontFamily: isRtl ? undefined : "Cormorant Garamond, Georgia, serif" }}
            >
              {t("book_session")}
            </h1>
            <p className={`text-sm text-[#6b7280] ${isRtl ? "font-arabic" : ""}`}>
              {t("minute_session")} · {" "}
              <span className="line-through text-[#9ca3af]">$100</span>{" "}
              <span className="font-medium text-[#0d7377]">{isRtl ? "50 دولار اليوم" : "$50 today"}</span>
            </p>
          </motion.div>

          {/* Progress stepper */}
          <div className={`flex items-center justify-center gap-2 mb-10 ${isRtl ? "flex-row-reverse" : "flex-row"}`}>
            {steps.map((label, i) => (
              <div key={label} className={`flex items-center gap-2 ${isRtl ? "flex-row-reverse" : "flex-row"}`}>
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    i <= stepIndex
                      ? "bg-[#0d7377] text-white"
                      : "bg-[#f0ede6] text-[#9ca3af]"
                  } ${isRtl ? "font-arabic" : ""}`}
                >
                  <span>{i + 1}</span>
                  <span className="hidden sm:block">{label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`w-6 h-px transition-colors ${
                      i < stepIndex ? "bg-[#0d7377]" : "bg-[#e5e0d8]"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step panels */}
          <motion.div
            key={step}
            initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-3xl shadow-sm border border-[#e5e0d8] p-6 md:p-8"
          >
            {step === "date" && (
              <div>
                <p className={`text-sm font-medium text-[#1a1a2e] mb-6 text-center ${isRtl ? "font-arabic" : ""}`}>
                  {t("select_date_info")}
                </p>
                <BookingDatePicker
                  selected={date}
                  onSelect={handleDateSelect}
                />
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
                <TimeSlotPicker
                  date={date}
                  selectedSlot={slot}
                  onSelect={handleSlotSelect}
                />
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
