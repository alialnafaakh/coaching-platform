"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TimeSlot } from "@/types";
import Link from "next/link";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import ConsultationPriceSummary from "@/components/booking/ConsultationPriceSummary";
import { useConsultationPricing } from "@/context/ConsultationPricingContext";
import CurrentConsultationPrice from "@/components/booking/CurrentConsultationPrice";

export type BookingFormDraft = {
  name: string;
  email: string;
  notes: string;
};

interface Props {
  slot: TimeSlot;
  date: Date;
  draft: BookingFormDraft;
  onDraftChange: (draft: BookingFormDraft) => void;
}

export default function BookingForm({ slot, date, draft, onDraftChange }: Props) {
  const router = useRouter();
  const { isRtl, t, lang } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { pricing } = useConsultationPricing();

  const formattedDate = new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !pricing) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_id: slot.id,
          client_name: draft.name,
          client_email: draft.email,
          notes: draft.notes,
          date: format(date, "yyyy-MM-dd"),
          start_time: slot.start_time,
          end_time: slot.end_time,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const message = isRtl
          ? res.status === 409 ? "تغيّر هذا الوقت أو السعر. حدّثي الصفحة واختاري موعدًا متاحًا."
            : res.status === 429 ? "محاولات الحجز كثيرة. انتظري قليلًا ثم حاولي مجددًا."
            : res.status === 503 ? "الحجز غير متاح مؤقتًا. يُرجى المحاولة لاحقًا أو التواصل مع الدعم."
            : "يُرجى مراجعة بيانات الحجز والمحاولة مجددًا."
          : data.message || t("error_generic");
        throw new Error(message);
      }
      const id = data.appointment?.id;
      const token = data.token;
      if (!id || !token) {
        throw new Error(t("error_generic"));
      }
      // Review a changed server snapshot before making a checkout request.
      if (data.appointment.final_price_usd !== pricing.final_price_usd ||
          data.appointment.payment_total_iqd !== pricing.payment_total_iqd) {
        router.push(`/booking-confirmed?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}&payment=review`);
        return;
      }
      // The hold already exists. Checkout never creates another appointment.
      try {
        const checkout = await fetch("/api/payments/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appointment_id: id, token, expected_total_iqd: data.appointment.payment_total_iqd }),
        });
        const payment = await checkout.json();
        if (!checkout.ok || typeof payment.url !== "string") throw new Error();
        window.location.assign(payment.url);
      } catch {
        // Keep access to the existing hold when configuration or checkout fails.
        router.push(`/booking-confirmed?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}&payment=unavailable`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("error_generic"));
    } finally {
      setLoading(false);
    }
  };

  const inputCls = `w-full px-4 py-3 rounded-xl border border-[#e5e0d8] bg-[#faf9f6] text-[#1a1a2e] text-base placeholder:text-[#9ca3af] focus:outline-none focus:border-[#0d7377] focus:ring-2 focus:ring-[#0d7377]/10 transition-all ${isRtl ? "text-right font-arabic" : ""}`;
  const isFormValid = draft.name.trim().length > 1 && draft.email.trim().length > 0;

  if (!pricing) return <CurrentConsultationPrice />;

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
          {t("selected_session")}
        </p>
        <p className={`text-sm font-semibold text-[#1a1a2e] ${isRtl ? "font-arabic" : ""}`}>
          {formattedDate}
          <bdi dir="ltr" className="block mt-1">{slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}</bdi>
        </p>
        <ConsultationPriceSummary
          className="mt-2"
          durationMinutes={pricing.session_duration_minutes}
          totalIqd={pricing.payment_total_iqd}
          basePriceUsd={pricing.base_price_usd}
          discountPercent={pricing.discount_percent}
          finalPriceUsd={pricing.final_price_usd}
        />
      </div>

      <div>
        <label htmlFor="booking-name" className={`block text-sm font-medium text-[#374151] mb-1.5 ${isRtl ? "font-arabic" : ""}`}>
          {t("full_name")}
        </label>
        <input
          id="booking-name" autoComplete="name" aria-describedby={error ? "booking-error" : undefined}
          type="text"
          required
          value={draft.name}
          onChange={(e) => onDraftChange({ ...draft, name: e.target.value })}
          placeholder={t("booking_name_placeholder")}
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="booking-email" className={`block text-sm font-medium text-[#374151] mb-1.5 ${isRtl ? "font-arabic" : ""}`}>
          {t("email_address")}
        </label>
        <input
          id="booking-email" autoComplete="email" dir="ltr" aria-describedby={`email-hint${error ? " booking-error" : ""}`}
          type="email"
          required
          value={draft.email}
          onChange={(e) => onDraftChange({ ...draft, email: e.target.value })}
          placeholder={t("booking_email_placeholder")}
          className={inputCls}
        />
        <p id="email-hint" className="mt-2 text-sm text-[#6b7280]">{isRtl ? "ستُرسل دعوة الجلسة إلى هذا البريد بعد تأكيد الدفع." : "Your session invitation will be sent here after payment is confirmed."}</p>
      </div>

      <div>
        <label htmlFor="booking-notes" className={`block text-sm font-medium text-[#374151] mb-1.5 ${isRtl ? "font-arabic" : ""}`}>
          {t("what_brings")}
        </label>
        <textarea
          id="booking-notes" aria-describedby="notes-hint"
          rows={3}
          value={draft.notes}
          onChange={(e) => onDraftChange({ ...draft, notes: e.target.value })}
          placeholder={t("booking_notes_placeholder")}
          className={`${inputCls} resize-none`}
        />
        <p id="notes-hint" className="mt-2 text-sm text-[#6b7280]">{isRtl ? "اختياري. شاركي فقط ما ترغبين في مشاركته للتحضير للجلسة." : "Optional. Share only what you feel comfortable sharing to help prepare for your session."}</p>
      </div>

      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
        <p className={`text-xs font-medium text-amber-800 mb-1 ${isRtl ? "font-arabic" : ""}`}>
          {t("payment_required")}
        </p>
        <p className={`text-sm text-amber-800 leading-relaxed ${isRtl ? "font-arabic" : ""}`}>
          {t("booking_hold_note")}
          <Link href="/policies#cancellation" className="block mt-2 underline underline-offset-4">{t("pricing_disclaimer")}</Link>
        </p>
      </div>

      {error && (
        <p id="booking-error" role="alert" className={`text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl ${isRtl ? "font-arabic" : ""}`}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !isFormValid}
        className={`w-full min-h-[48px] py-4 rounded-xl text-base font-medium text-white transition-all duration-200 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${isRtl ? "font-arabic" : ""}`}
        style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
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
