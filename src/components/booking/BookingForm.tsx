"use client";

import { useState } from "react";
import { TimeSlot } from "@/types";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
  slot: TimeSlot;
  date: Date;
}

const PATREON_URL = "https://www.patreon.com/posts/1-1-private-139320980";
const QI_CARD_NUMBER = "8476363836";

type PaymentMethod = "patreon" | "qicard" | null;

export default function BookingForm({ slot, date }: Props) {
  const { isRtl, t, lang } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [copied, setCopied] = useState(false);
  const [qiSubmitting, setQiSubmitting] = useState(false);

  const formattedDate = new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);

  const handlePatreonPay = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    window.open(PATREON_URL, "_blank", "noopener,noreferrer");
    setTimeout(() => setLoading(false), 1500);
  };

  const handleQiCardConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setQiSubmitting(true);
    try {
      const res = await fetch("/api/qi-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_id: slot.id,
          client_name: name,
          client_email: email,
          notes,
          date: format(date, "yyyy-MM-dd"),
          start_time: slot.start_time,
          end_time: slot.end_time,
          payment_method: "qicard",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("error_generic"));
      window.location.href = "/booking-confirmed?method=qicard";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("error_generic"));
    } finally {
      setQiSubmitting(false);
    }
  };

  const copyQiNumber = () => {
    navigator.clipboard.writeText(QI_CARD_NUMBER).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const inputCls = `w-full px-4 py-3 rounded-xl border border-[#e5e0d8] bg-[#faf9f6] text-[#1a1a2e] text-sm placeholder:text-[#9ca3af] focus:outline-none focus:border-[#0d7377] focus:ring-2 focus:ring-[#0d7377]/10 transition-all ${isRtl ? "text-right font-arabic" : ""}`;

  const isFormValid = name.trim().length > 0 && email.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`space-y-5 ${isRtl ? "text-right" : "text-left"}`}
    >
      {/* Booking Summary */}
      <div className="p-4 rounded-xl bg-[#0d7377]/6 border border-[#0d7377]/15">
        <p className={`text-xs text-[#0d7377] font-medium uppercase tracking-wider mb-1 ${isRtl ? "font-arabic" : ""}`}>
          {t("your_booking")}
        </p>
        <p className={`text-sm font-semibold text-[#1a1a2e] ${isRtl ? "font-arabic" : ""}`}>
          {formattedDate} {isRtl ? "في" : "at"}{" "}
          {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
        </p>
        <p className={`text-sm text-[#6b7280] ${isRtl ? "font-arabic" : ""}`}>
          {t("minute_session")} ·{" "}
          <span className="line-through text-[#9ca3af]">$100</span>{" "}
          <span className="font-semibold text-[#0d7377]">$50</span>
        </p>
      </div>

      {/* Personal Details Fields */}
      <div>
        <label className={`block text-xs font-medium text-[#6b7280] mb-1.5 ${isRtl ? "font-arabic" : ""}`}>
          {t("full_name")}
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("booking_name_placeholder")}
          className={inputCls}
        />
      </div>

      <div>
        <label className={`block text-xs font-medium text-[#6b7280] mb-1.5 ${isRtl ? "font-arabic" : ""}`}>
          {t("email_address")}
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("booking_email_placeholder")}
          className={inputCls}
        />
      </div>

      <div>
        <label className={`block text-xs font-medium text-[#6b7280] mb-1.5 ${isRtl ? "font-arabic" : ""}`}>
          {t("what_brings")}
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("booking_notes_placeholder")}
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* Payment Method Selection */}
      <div>
        <p className={`text-xs font-medium text-[#6b7280] mb-3 ${isRtl ? "font-arabic" : ""}`}>
          {t("choose_payment")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Patreon Option */}
          <button
            type="button"
            onClick={() => setPaymentMethod("patreon")}
            className={`group relative flex flex-col gap-2 p-4 rounded-2xl border-2 text-left transition-all duration-200 hover:shadow-md ${
              paymentMethod === "patreon"
                ? "border-[#0d7377] bg-[#0d7377]/6 shadow-sm"
                : "border-[#e5e0d8] bg-white hover:border-[#0d7377]/40"
            } ${isRtl ? "text-right" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">🅿️</span>
              {paymentMethod === "patreon" && (
                <span className="w-5 h-5 rounded-full bg-[#0d7377] flex items-center justify-center text-white text-xs flex-shrink-0">✓</span>
              )}
            </div>
            <div>
              <p className={`text-sm font-semibold text-[#1a1a2e] ${isRtl ? "font-arabic" : ""}`}>
                {t("pay_patreon")}
              </p>
              <p className={`text-xs text-[#6b7280] mt-0.5 ${isRtl ? "font-arabic" : ""}`}>
                {t("pay_patreon_desc")}
              </p>
            </div>
          </button>

          {/* QI Card Option */}
          <button
            type="button"
            onClick={() => setPaymentMethod("qicard")}
            className={`group relative flex flex-col gap-2 p-4 rounded-2xl border-2 text-left transition-all duration-200 hover:shadow-md ${
              paymentMethod === "qicard"
                ? "border-[#d4a843] bg-[#d4a843]/6 shadow-sm"
                : "border-[#e5e0d8] bg-white hover:border-[#d4a843]/40"
            } ${isRtl ? "text-right" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">🇮🇶</span>
              {paymentMethod === "qicard" && (
                <span className="w-5 h-5 rounded-full bg-[#d4a843] flex items-center justify-center text-white text-xs flex-shrink-0">✓</span>
              )}
            </div>
            <div>
              <p className={`text-sm font-semibold text-[#1a1a2e] ${isRtl ? "font-arabic" : ""}`}>
                {t("pay_qicard")}
              </p>
              <p className={`text-xs text-[#6b7280] mt-0.5 ${isRtl ? "font-arabic" : ""}`}>
                {t("pay_qicard_desc")}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Patreon Payment Panel */}
      <AnimatePresence mode="wait">
        {paymentMethod === "patreon" && (
          <motion.div
            key="patreon-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <div className="p-4 rounded-xl bg-[#0d7377]/6 border border-[#0d7377]/20 flex items-start gap-3">
              <span className="text-lg mt-0.5">🔒</span>
              <p className={`text-sm text-[#374151] leading-relaxed ${isRtl ? "font-arabic" : ""}`}>
                {t("patreon_instructions")}
              </p>
            </div>

            {error && (
              <p className={`text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl ${isRtl ? "font-arabic" : ""}`}>
                ⚠️ {error}
              </p>
            )}

            <form onSubmit={handlePatreonPay}>
              <button
                type="submit"
                disabled={loading || !isFormValid}
                className={`w-full py-4 rounded-xl text-base font-medium text-white transition-all duration-200 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${isRtl ? "font-arabic" : ""}`}
                style={{ background: "linear-gradient(135deg, #f96854, #e85d44)" }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    {t("patreon_redirecting")}
                  </>
                ) : (
                  t("patreon_confirm")
                )}
              </button>
            </form>
          </motion.div>
        )}

        {/* QI Card Payment Panel */}
        {paymentMethod === "qicard" && (
          <motion.div
            key="qicard-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <p className={`text-sm text-[#374151] leading-relaxed ${isRtl ? "font-arabic" : ""}`}>
              {t("qicard_instructions")}
            </p>

            {/* QI Card Number Display */}
            <div className="p-4 rounded-xl border-2 border-[#d4a843]/40 bg-[#d4a843]/5">
              <p className={`text-xs font-medium text-[#9a7520] mb-2 uppercase tracking-wider ${isRtl ? "font-arabic" : ""}`}>
                {t("qicard_number_label")}
              </p>
              <div className={`flex items-center gap-3 ${isRtl ? "flex-row-reverse" : ""}`}>
                <span
                  className="text-2xl font-bold text-[#1a1a2e] tracking-widest select-all"
                  style={{ fontFamily: "monospace" }}
                >
                  {QI_CARD_NUMBER}
                </span>
                <button
                  type="button"
                  onClick={copyQiNumber}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex-shrink-0 ${
                    copied
                      ? "bg-green-100 text-green-700 border border-green-300"
                      : "bg-[#d4a843]/15 text-[#9a7520] border border-[#d4a843]/30 hover:bg-[#d4a843]/25"
                  } ${isRtl ? "font-arabic" : ""}`}
                >
                  {copied ? `✓ ${t("qicard_copied")}` : t("qicard_copy")}
                </button>
              </div>
            </div>

            {/* Warning note */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <p className={`text-xs text-amber-700 leading-relaxed ${isRtl ? "font-arabic" : ""}`}>
                {t("qicard_note")}
              </p>
            </div>

            {error && (
              <p className={`text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl ${isRtl ? "font-arabic" : ""}`}>
                ⚠️ {error}
              </p>
            )}

            <form onSubmit={handleQiCardConfirm}>
              <button
                type="submit"
                disabled={qiSubmitting || !isFormValid}
                className={`w-full py-4 rounded-xl text-base font-medium text-white transition-all duration-200 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${isRtl ? "font-arabic" : ""}`}
                style={{ background: "linear-gradient(135deg, #c8922a, #d4a843)" }}
              >
                {qiSubmitting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    {t("redirecting")}
                  </>
                ) : (
                  t("qicard_confirm")
                )}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {!paymentMethod && (
        <p className={`text-center text-xs text-[#9ca3af] ${isRtl ? "font-arabic" : ""}`}>
          {t("secure_payment")}
        </p>
      )}
    </motion.div>
  );
}
