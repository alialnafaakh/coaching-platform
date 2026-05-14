"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useLanguage } from "@/context/LanguageContext";

export default function BookingConfirmedPage() {
  const { isRtl, t } = useLanguage();

  return (
    <>
      <Navbar />
      <main className={`min-h-screen bg-[#faf9f6] flex items-center justify-center px-6 pt-20 ${isRtl ? "text-right" : "text-left"}`}>
        <div className="max-w-md text-center">
          {/* Checkmark */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-8 shadow-lg"
            style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
          >
            ✓
          </div>

          <h1
            className={`text-4xl text-[#1a1a2e] mb-4 ${isRtl ? "font-arabic-display" : ""}`}
            style={{ fontFamily: isRtl ? undefined : "Cormorant Garamond, Georgia, serif" }}
          >
            {t("booked_headline")}
          </h1>

          <p className={`text-[#6b7280] text-base leading-relaxed mb-8 ${isRtl ? "font-arabic" : ""}`}>
            {t("booked_subheadline")}
          </p>

          <div className={`p-5 rounded-2xl bg-[#0d7377]/6 border border-[#0d7377]/15 mb-8 ${isRtl ? "text-right" : "text-left"}`}>
            <p className={`text-sm font-medium text-[#0d7377] mb-1 ${isRtl ? "font-arabic" : ""}`}>{t("whats_next")}</p>
            <ul className={`text-sm text-[#6b7280] space-y-1 ${isRtl ? "font-arabic" : ""}`}>
              <li>{isRtl ? "✉️ تحقق من بريدك الإلكتروني للحصول على رسالة التأكيد" : `✉️ ${t("check_inbox")}`}</li>
              <li>{isRtl ? "📅 أضف الجلسة إلى تقويمك" : `📅 ${t("add_calendar")}`}</li>
              <li>{isRtl ? "📝 سيتم إرسال استبيان موجز إليك" : `📝 ${t("intake_sent")}`}</li>
            </ul>
          </div>

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
