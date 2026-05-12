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

export default function BookPage() {
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

  const steps = ["Choose Date", "Choose Time", "Your Details"];
  const stepIndex = ["date", "time", "form"].indexOf(step);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#faf9f6] pt-24 pb-20 px-6">
        <div className="max-w-xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <h1
              className="text-4xl text-[#1a1a2e] mb-2"
              style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
            >
              Book a Session
            </h1>
            <p className="text-sm text-[#6b7280]">
              40-minute 1-on-1 coaching · {" "}
              <span className="line-through text-[#9ca3af]">$100</span>{" "}
              <span className="font-medium text-[#0d7377]">$50 today</span>
            </p>
          </motion.div>

          {/* Progress stepper */}
          <div className="flex items-center justify-center gap-2 mb-10">
            {steps.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    i <= stepIndex
                      ? "bg-[#0d7377] text-white"
                      : "bg-[#f0ede6] text-[#9ca3af]"
                  }`}
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
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-3xl shadow-sm border border-[#e5e0d8] p-6 md:p-8"
          >
            {step === "date" && (
              <div>
                <p className="text-sm font-medium text-[#1a1a2e] mb-6 text-center">
                  Select a date — available from tomorrow onwards
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
                  className="text-xs text-[#0d7377] mb-4 flex items-center gap-1 hover:underline"
                >
                  ← {format(date, "MMMM d")}
                </button>
                <p className="text-sm font-medium text-[#1a1a2e] mb-6">
                  Available times on{" "}
                  <span className="text-[#0d7377]">{format(date, "EEEE, MMMM d")}</span>
                  <span className="block text-xs font-normal text-[#6b7280] mt-1">
                    All times are in Istanbul Time (TRT).
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
                  className="text-xs text-[#0d7377] mb-4 flex items-center gap-1 hover:underline"
                >
                  ← Change time
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
