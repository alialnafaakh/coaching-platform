"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { format } from "date-fns";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useLanguage } from "@/context/LanguageContext";
import type { PublicAppointment } from "@/types";
import { bookingStatusCopy } from "@/lib/bookingStatus";


function BookingConfirmedContent() {
  const { isRtl, t, lang } = useLanguage();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const token = searchParams.get("token");

  const [appointment, setAppointment] = useState<PublicAppointment | null>(null);
  const [loading, setLoading] = useState(Boolean(id && token));
  const [error, setError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  async function requestCheckout() {
    if (!id || !token) return;
    setCheckoutLoading(true);
    setCheckoutError("");
    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointment_id: id, token }),
      });
      const data = await response.json();
      if (!response.ok || typeof data.url !== "string") {
        throw new Error(t("payment_setup_error"));
      }
      window.location.assign(data.url);
    } catch {
      setCheckoutError(t("payment_setup_error"));
    } finally {
      setCheckoutLoading(false);
    }
  }

  useEffect(() => {
    if (!id || !token) {
      setError(t("booking_missing_access"));
      setLoading(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setLoading(true);
    setAppointment(null);
    setError("");
    // Browser return is informational. Only read database state; the webhook
    // owns payment confirmation. Poll while the hold is still pending.
    const load = () => fetch(`/api/bookings/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || t("booking_not_found"));
        }
        if (!cancelled) {
          setAppointment(data.appointment);
          setError("");
          if (data.appointment?.status !== "cancelled" &&
              (data.appointment?.status === "pending_payment" || data.appointment?.payment_status !== "paid")) {
            timer = setTimeout(load, 3000);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(t("payment_status_error"));
          timer = setTimeout(load, 3000);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    void load();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id, token, t]);

  const verifying = searchParams.get("payment") === "returned" || appointment?.payment_status === "paid";
  const setupFailed = searchParams.get("payment") === "unavailable";
  const copy = bookingStatusCopy(appointment, t);
  if (copy.tone === "pending") {
    copy.badge = verifying ? t("verifying_payment") : t("payment_required");
    copy.headline = verifying ? t("verifying_payment") : setupFailed ? t("payment_setup_error") : t("booking_pending_headline");
  }
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
            <p className={`text-[#6b7280] ${isRtl ? "font-arabic" : ""}`}>{t("verifying_payment")}</p>
          ) : error ? (
            <>
              <h1
                className={`text-4xl text-[#1a1a2e] mb-4 ${isRtl ? "font-arabic-display" : ""}`}
                style={{ fontFamily: isRtl ? undefined : "Cormorant Garamond, Georgia, serif" }}
              >
                {t("payment_status_error")}
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
                    : verifying ? t("verifying_payment_sub") : t("booking_pending_sub")}
              </p>

              {appointment && (
                <div className={`p-5 rounded-2xl border mb-6 ${isRtl ? "text-right" : "text-left"} ${toneStyles.box}`}>
                  <p className={`text-sm font-medium mb-2 ${isRtl ? "font-arabic" : ""} ${toneStyles.label}`}>
                    {copy.tone === "confirmed" ? t("your_booking") : t("selected_session")}
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

              {copy.tone === "pending" && !verifying && (
                <div
                  id="booking-payment"
                  className={`p-5 rounded-2xl border border-dashed border-[#e5e0d8] bg-white mb-8 ${isRtl ? "text-right" : "text-left"}`}
                >
                  <p className={`text-sm font-medium text-[#1a1a2e] mb-1 ${isRtl ? "font-arabic" : ""}`}>
                    {t("payment_required")}
                  </p>
                  <p className={`text-sm text-[#6b7280] leading-relaxed ${isRtl ? "font-arabic" : ""}`}>
                    {lang === "ar" ? "أكملي الدفع. يبقى الموعد بانتظار تأكيد الدفع الآمن." : "Complete checkout. Your appointment remains pending until payment is verified."}
                  </p>
                  {searchParams.get("payment") === "unavailable" && (
                    <p className="mt-3 text-sm text-amber-800">
                      {lang === "ar" ? "تعذر تجهيز الدفع. تم الاحتفاظ بحجزك المؤقت؛ تواصلي معنا إذا استمرت المشكلة." : "Checkout could not be prepared. Your existing hold is preserved; contact support if this continues."}
                    </p>
                  )}
                  <button type="button" onClick={requestCheckout} disabled={checkoutLoading}
                    className="mt-4 w-full rounded-xl bg-[#0d7377] px-5 py-3 text-sm text-white disabled:opacity-60">
                    {checkoutLoading ? (lang === "ar" ? "جاري تجهيز الدفع…" : "Preparing checkout…") : lang === "ar" ? "الدفع عبر ويل" : "Continue to Wayl checkout"}
                  </button>
                  {checkoutError && <p role="alert" className="mt-3 text-sm text-red-600">{checkoutError}</p>}
                </div>
              )}

              {appointment?.status === "cancelled" && appointment.payment_status === "paid" && (
                <p role="status" className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                  {lang === "ar" ? "تم استلام الدفع بعد انتهاء الحجز أو إلغائه. لم تتم إعادة حجز الموعد. يرجى التواصل معنا للمراجعة اليدوية." : "Payment was received after the hold ended or was cancelled. The time has not been rebooked. Please contact support for manual review."}
                </p>
              )}

              {copy.tone === "confirmed" &&
                appointment &&
                id &&
                token &&
                appointment.status !== "completed" && (
                <div className={`p-5 rounded-2xl border mb-8 bg-[#0d7377]/6 border-[#0d7377]/15 ${isRtl ? "text-right" : "text-left"}`}>
                  <p className={`text-sm font-medium mb-3 text-[#0d7377] ${isRtl ? "font-arabic" : ""}`}>
                    {t("consultation_ready")}
                  </p>
                  <Link
                    href={`/consultation/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`}
                    className={`inline-block w-full text-center px-6 py-3 rounded-xl text-sm font-medium text-white mb-4 ${isRtl ? "font-arabic" : ""}`}
                    style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
                  >
                    {t("join_consultation")}
                  </Link>
                  <ul className={`text-sm text-[#6b7280] space-y-1 ${isRtl ? "font-arabic" : ""}`}>
                    <li>{t("check_inbox")}</li>
                    <li>{t("add_calendar")}</li>
                    <li>{t("intake_sent")}</li>
                  </ul>
                </div>
              )}

              {appointment?.status === "completed" && id && token && (
                <div className={`p-5 rounded-2xl border mb-8 bg-[#0d7377]/6 border-[#0d7377]/15 ${isRtl ? "text-right" : "text-left"}`}>
                  <p className={`text-sm font-medium mb-3 text-[#0d7377] ${isRtl ? "font-arabic" : ""}`}>
                    {t("review_thank_you")}
                  </p>
                  <Link
                    href={`/review/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`}
                    className={`inline-block w-full text-center px-6 py-3 rounded-xl text-sm font-medium text-white ${isRtl ? "font-arabic" : ""}`}
                    style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
                  >
                    {t("review_leave_review")}
                  </Link>
                </div>
              )}

              {copy.tone === "confirmed" && !(id && token) && (
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
