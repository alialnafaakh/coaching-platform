"use client";

import { useEffect, useState } from "react";
import { TimeSlot, ConsultationSettingsPublic } from "@/types";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import ConsultationPriceSummary from "@/components/booking/ConsultationPriceSummary";
import { DEFAULT_CONSULTATION_SETTINGS, calculateFinalPrice } from "@/lib/consultationSettings";

interface Props {
  slot: TimeSlot;
  date: Date;
}

export default function BookingForm({ slot, date }: Props) {
  const { isRtl, t, lang } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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

  const formattedDate = new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
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
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || t("error_generic"));
      }
      const id = data.appointment?.id;
      const token = data.token;
      if (!id || !token) {
        throw new Error(t("error_generic"));
      }
      window.location.href = `/booking-confirmed?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("error_generic"));
    } finally {
      setLoading(false);
    }
  };

  const inputCls = `w-full px-4 py-3 rounded-xl border border-[#e5e0d8] bg-[#faf9f6] text-[#1a1a2e] text-sm placeholder:text-[#9ca3af] focus:outline-none focus:border-[#0d7377] focus:ring-2 focus:ring-[#0d7377]/10 transition-all ${isRtl ? "text-right font-arabic" : ""}`;
  const isFormValid = name.trim().length > 1 && email.trim().length > 0;

  return (
    <motion.form
      onSubmit={handleReserve}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`space-y-5 ${isRtl ? "text-right" : "text-left"}`}
    >
      <div className="p-4 rounded-xl bg-[#0d7377]/6 border border-[#0d7377]/15">
        <p className={`text-xs text-[#0d7377] font-medium uppercase tracking-wider mb-1 ${isRtl ? "font-arabic" : ""}`}>
          {t("your_booking")}
        </p>
        <p className={`text-sm font-semibold text-[#1a1a2e] ${isRtl ? "font-arabic" : ""}`}>
          {formattedDate} {isRtl ? "في" : "at"}{" "}
          {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
        </p>
        <ConsultationPriceSummary
          className="mt-2"
          durationMinutes={pricing.session_duration_minutes}
          basePriceUsd={pricing.base_price_usd}
          discountPercent={pricing.discount_percent}
          finalPriceUsd={pricing.final_price_usd}
        />
      </div>

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

      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
        <p className={`text-xs font-medium text-amber-800 mb-1 ${isRtl ? "font-arabic" : ""}`}>
          {t("payment_required")}
        </p>
        <p className={`text-xs text-amber-700 leading-relaxed ${isRtl ? "font-arabic" : ""}`}>
          {t("booking_hold_note")}
        </p>
      </div>

      {error && (
        <p className={`text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl ${isRtl ? "font-arabic" : ""}`}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !isFormValid}
        className={`w-full py-4 rounded-xl text-base font-medium text-white transition-all duration-200 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${isRtl ? "font-arabic" : ""}`}
        style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {t("reserving")}
          </>
        ) : (
          t("reserve_session")
        )}
      </button>
    </motion.form>
  );
}
