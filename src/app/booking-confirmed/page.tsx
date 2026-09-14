"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { format } from "date-fns";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useLanguage, type StringTranslationKey } from "@/context/LanguageContext";
import type { PublicAppointment } from "@/types";

function statusCopy(
  appointment: PublicAppointment | null,
  t: (key: StringTranslationKey) => string
) {
  if (!appointment) {
    return {
      badge: t("payment_required"),
      headline: t("booking_pending_headline"),
      tone: "pending" as const,
    };
  }

  if (appointment.status === "confirmed") {
    return {
      badge: t("confirmed_label"),
      headline: t("booked_headline"),
      tone: "confirmed" as const,
    };
  }

  if (appointment.status === "in_progress") {
    return {
      badge: t("in_progress_label"),
      headline: t("in_progress_label"),
      tone: "confirmed" as const,
    };
  }

  if (appointment.status === "completed") {
    return {
      badge: t("completed_label"),
      headline: t("completed_label"),
      tone: "confirmed" as const,
    };
  }

  if (appointment.status === "cancelled") {
    return {
      badge: t("cancelled_label"),
      headline: t("expired_hold"),
      tone: "cancelled" as const,
    };
  }

  return {
    badge: appointment.payment_status === "unpaid" ? t("payment_required") : t("pending_payment_label"),
    headline: t("booking_pending_headline"),
    tone: "pending" as const,
  };
}

function BookingConfirmedContent() {
  const { isRtl, t, lang } = useLanguage();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const token = searchParams.get("token");

  const [appointment, setAppointment] = useState<PublicAppointment | null>(null);
  const [loading, setLoading] = useState(Boolean(id && token));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id || !token) {
      setError(t("booking_missing_access"));
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetch(`/api/bookings/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || t("booking_not_found"));
        }
        if (!cancelled) setAppointment(data.appointment);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("error_generic"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, token, t]);

  const copy = statusCopy(appointment, t);
  const locale = lang === "ar" ? "ar-EG" : "en-US";
  const formattedDate = appointment?.date
    ? new Intl.DateTimeFormat(locale, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(`${appointment.date}T00:00:00`))
    : "";
  const holdUntil = appointment?.payment_expires_at
    ? format(new Date(appointment.payment_expires_at), "HH:mm")
    : "";

  const toneStyles = {
    pending: {
      iconBg: "linear-gradient(135deg, #c8922a, #d4a843)",
      box: "bg-amber-50 border-amber-200",
      label: "text-[#9a7520]",
      icon: "⏳",
    },
    confirmed: {
      iconBg: "linear-gradient(135deg, #0d7377, #14a3a8)",
      box: "bg-[#0d7377]/6 border-[#0d7377]/15",
      label: "text-[#0d7377]",
      icon: "✓",
    },
    cancelled: {
      iconBg: "linear-gradient(135deg, #9ca3af, #6b7280)",
      box: "bg-red-50 border-red-200",
      label: "text-red-600",
      icon: "✕",
    },
  }[copy.tone];

  return (
    <>
      <Navbar />
      <main className={`min-h-screen bg-[#faf9f6] flex items-center justify-center px-6 pt-20 ${isRtl ? "text-right" : "text-left"}`}>
        <div className="max-w-md w-full text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-8 shadow-lg"
            style={{ background: toneStyles.iconBg }}
          >
            {toneStyles.icon}
          </div>

          {loading ? (
            <p className={`text-[#6b7280] ${isRtl ? "font-arabic" : ""}`}>{t("loading_booking")}</p>
          ) : error ? (
            <>
              <h1
                className={`text-4xl text-[#1a1a2e] mb-4 ${isRtl ? "font-arabic-display" : ""}`}
                style={{ fontFamily: isRtl ? undefined : "Cormorant Garamond, Georgia, serif" }}
              >
                {t("booking_not_found")}
              </h1>
              <p className={`text-[#6b7280] text-base leading-relaxed mb-8 ${isRtl ? "font-arabic" : ""}`}>
                {error}
              </p>
            </>
          ) : (
            <>
              <p className={`text-xs font-medium uppercase tracking-wider mb-3 ${isRtl ? "font-arabic" : ""} ${toneStyles.label}`}>
                {copy.badge}
              </p>
              <h1
                className={`text-4xl text-[#1a1a2e] mb-4 ${isRtl ? "font-arabic-display" : ""}`}
                style={{ fontFamily: isRtl ? undefined : "Cormorant Garamond, Georgia, serif" }}
              >
                {copy.headline}
              </h1>
              <p className={`text-[#6b7280] text-base leading-relaxed mb-8 ${isRtl ? "font-arabic" : ""}`}>
                {copy.tone === "confirmed"
                  ? t("booked_subheadline")
                  : copy.tone === "cancelled"
                    ? t("expired_hold_sub")
                    : t("booking_pending_sub")}
              </p>

              {appointment && (
                <div className={`p-5 rounded-2xl border mb-6 ${isRtl ? "text-right" : "text-left"} ${toneStyles.box}`}>
                  <p className={`text-sm font-medium mb-2 ${isRtl ? "font-arabic" : ""} ${toneStyles.label}`}>
                    {t("your_booking")}
                  </p>
                  <p className={`text-sm text-[#1a1a2e] font-medium ${isRtl ? "font-arabic" : ""}`}>
                    {appointment.client_name}
                  </p>
                  {formattedDate && (
                    <p className={`text-sm text-[#6b7280] mt-1 ${isRtl ? "font-arabic" : ""}`}>
                      {formattedDate} · {appointment.start_time.slice(0, 5)} – {appointment.end_time.slice(0, 5)}
                    </p>
                  )}
                  <p className={`text-xs text-[#9ca3af] mt-2 ${isRtl ? "font-arabic" : ""}`}>
                    {t("istanbul_time")}
                  </p>
                  {copy.tone === "pending" && holdUntil && (
                    <p className={`text-xs mt-3 ${isRtl ? "font-arabic" : ""} ${toneStyles.label}`}>
                      {t("hold_until")} {holdUntil}
                    </p>
                  )}
                </div>
              )}

              {copy.tone === "pending" && (
                <div
                  id="booking-payment"
                  className={`p-5 rounded-2xl border border-dashed border-[#e5e0d8] bg-white mb-8 ${isRtl ? "text-right" : "text-left"}`}
                >
                  <p className={`text-sm font-medium text-[#1a1a2e] mb-1 ${isRtl ? "font-arabic" : ""}`}>
                    {t("payment_required")}
                  </p>
                  <p className={`text-sm text-[#6b7280] leading-relaxed ${isRtl ? "font-arabic" : ""}`}>
                    {t("payment_next_note")}
                  </p>
                </div>
              )}

              {copy.tone === "confirmed" && (
                <div className={`p-5 rounded-2xl border mb-8 bg-[#0d7377]/6 border-[#0d7377]/15 ${isRtl ? "text-right" : "text-left"}`}>
                  <p className={`text-sm font-medium mb-1 text-[#0d7377] ${isRtl ? "font-arabic" : ""}`}>
                    {t("whats_next")}
                  </p>
                  <ul className={`text-sm text-[#6b7280] space-y-1 ${isRtl ? "font-arabic" : ""}`}>
                    <li>{t("check_inbox")}</li>
                    <li>{t("add_calendar")}</li>
                    <li>{t("intake_sent")}</li>
                  </ul>
                </div>
              )}
            </>
          )}

          <Link
            href="/"
            className={`inline-block px-8 py-3 rounded-full text-sm font-medium text-white ${isRtl ? "font-arabic" : ""}`}
            style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
          >
            {t("back_home")}
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function BookingConfirmedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#faf9f6]" />}>
      <BookingConfirmedContent />
    </Suspense>
  );
}
