"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useLanguage } from "@/context/LanguageContext";

function BookingConfirmedContent() {
  const { isRtl, t } = useLanguage();
  const searchParams = useSearchParams();
  const method = searchParams.get("method");
  const isQiCard = method === "qicard";

  return (
    <>
      <Navbar />
      <main className={`min-h-screen bg-[#faf9f6] flex items-center justify-center px-6 pt-20 ${isRtl ? "text-right" : "text-left"}`}>
        <div className="max-w-md text-center">
          {/* Icon */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-8 shadow-lg"
            style={{
              background: isQiCard
                ? "linear-gradient(135deg, #c8922a, #d4a843)"
                : "linear-gradient(135deg, #0d7377, #14a3a8)",
            }}
          >
            {isQiCard ? "🇮🇶" : "✓"}
          </div>

          <h1
            className={`text-4xl text-[#1a1a2e] mb-4 ${isRtl ? "font-arabic-display" : ""}`}
            style={{ fontFamily: isRtl ? undefined : "Cormorant Garamond, Georgia, serif" }}
          >
            {isQiCard
              ? isRtl ? "تم استلام طلبك!" : "Request Received!"
              : t("booked_headline")}
          </h1>

          <p className={`text-[#6b7280] text-base leading-relaxed mb-8 ${isRtl ? "font-arabic" : ""}`}>
            {isQiCard
              ? isRtl
                ? "تم تسجيل حجزك بنجاح. سيتم تأكيد جلستك فور التحقق من تحويل بطاقة QI. يرجى الاحتفاظ بإيصال التحويل."
                : "Your booking request has been recorded. Your session will be confirmed once your QI Card transfer is verified. Please keep your transfer receipt."
              : t("booked_subheadline")}
          </p>

          <div className={`p-5 rounded-2xl border mb-8 ${isRtl ? "text-right" : "text-left"} ${isQiCard ? "bg-[#d4a843]/6 border-[#d4a843]/20" : "bg-[#0d7377]/6 border-[#0d7377]/15"}`}>
            <p className={`text-sm font-medium mb-1 ${isRtl ? "font-arabic" : ""} ${isQiCard ? "text-[#9a7520]" : "text-[#0d7377]"}`}>
              {t("whats_next")}
            </p>
            <ul className={`text-sm text-[#6b7280] space-y-1 ${isRtl ? "font-arabic" : ""}`}>
              {isQiCard ? (
                <>
                  <li>{isRtl ? "🏦 تأكد من إتمام تحويل 50 دولار إلى رقم بطاقة QI المُرسل إليك" : "🏦 Ensure you've transferred $50 to QI Card number 8476363836"}</li>
                  <li>{isRtl ? "✉️ ستصلك رسالة تأكيد بالبريد الإلكتروني بعد التحقق من الدفع" : "✉️ You'll receive a confirmation email once payment is verified"}</li>
                  <li>{isRtl ? "⏳ قد يستغرق التحقق حتى 24 ساعة" : "⏳ Verification may take up to 24 hours"}</li>
                </>
              ) : (
                <>
                  <li>{isRtl ? "✉️ تحقق من بريدك الإلكتروني للحصول على رسالة التأكيد" : `✉️ ${t("check_inbox")}`}</li>
                  <li>{isRtl ? "📅 أضف الجلسة إلى تقويمك" : `📅 ${t("add_calendar")}`}</li>
                  <li>{isRtl ? "📝 سيتم إرسال استبيان موجز إليك" : `📝 ${t("intake_sent")}`}</li>
                </>
              )}
            </ul>
          </div>

          <Link
            href="/"
            className={`inline-block px-8 py-3 rounded-full text-sm font-medium text-white ${isRtl ? "font-arabic" : ""}`}
            style={{
              background: isQiCard
                ? "linear-gradient(135deg, #c8922a, #d4a843)"
                : "linear-gradient(135deg, #0d7377, #14a3a8)",
            }}
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
