"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "ar";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  isRtl: boolean;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const UI_STRINGS: Record<Language, Record<string, string>> = {
  en: {
    book_session: "Book a Session",
    book_now: "Book Your Session — $50",
    learn_more: "Learn More",
    about: "About",
    services: "Services",
    testimonials: "Testimonials",
    pricing: "Pricing",
    contact: "Contact",
    navigate: "Navigate",
    all_rights: "All rights reserved.",
    redirecting: "Redirecting to Stripe...",
    confirm_pay: "Confirm & Pay $50 →",
    your_booking: "Your Booking",
    full_name: "Full Name",
    email_address: "Email Address",
    what_brings: "What brings you here? (optional)",
    secure_payment: "Secure payment via Stripe · SSL encrypted",
    admin: "Admin",
    cta_eyebrow: "Ready when you are",
    cta_headline: "The relationship you want starts with one honest session.",
    cta_subheadline: "Book your 40-minute session today. Pick a time that works for you — starting tomorrow.",
    cta_footer: "50% off today · Secure payment via Stripe · Refundable if needed",
    areas_of_focus: "Areas of focus",
    about_maryem: "About Maryem",
    about_headline: "Relationships are biological, psychological, and social — all at once.",
    about_highlight: "biological,",
    lives_transformed: "lives transformed through compassionate coaching",
    client_rating: "Avg. client rating",
    tags: ["Attachment Theory", "Somatic Coaching", "Systemic Therapy", "Emotion Regulation", "Communication"],
    what_clients_say: "What clients say",
    testimonials_data: [
      {
        name: "Sofia R.",
        role: "Navigating a divorce",
        quote: "I came in completely numb. Maryem helped me understand *why* I kept shutting down emotionally — and gave me tools to change that. Life-changing.",
      },
      {
        name: "James & Laura K.",
        role: "Couple, together 8 years",
        quote: "We were repeating the same argument for years. After just three sessions with Maryem, we finally understood each other's nervous systems. We're different people now.",
      },
      {
        name: "Amir T.",
        role: "Single, working on patterns",
        quote: "I kept attracting the same kind of unavailable partner. Maryem helped me trace it back to its root and actually change my attachment style. Incredible work.",
      },
    ],
    pricing_headline: "One session. Real change.",
    one_on_one: "1-on-1 Coaching Session",
    pricing_badge: "50% OFF — Limited Time Offer",
    pricing_footer: "40 minutes · Secure payment via Stripe",
    reserve_spot: "Reserve My Spot",
    pricing_disclaimer: "Secure checkout · No subscriptions · Cancel anytime",
    booking_notes_placeholder: "Brief context about what you'd like to work on…",
    booking_name_placeholder: "Your full name",
    booking_email_placeholder: "you@example.com",
    minute_session: "40-minute session",
    error_generic: "Something went wrong. Please try again.",
  },
  ar: {
    book_session: "احجز جلسة",
    book_now: "احجز جلستك — 50 دولار",
    learn_more: "تعرف على المزيد",
    about: "من أنا",
    services: "الخدمات",
    testimonials: "آراء العملاء",
    pricing: "الأسعار",
    contact: "اتصل بي",
    navigate: "تصفح الموقع",
    all_rights: "جميع الحقوق محفوظة.",
    redirecting: "جاري التحويل إلى Stripe...",
    confirm_pay: "تأكيد ودفع 50 دولار ←",
    your_booking: "حجزك",
    full_name: "الاسم الكامل",
    email_address: "البريد الإلكتروني",
    what_brings: "ما الذي يأتي بك إلى هنا؟ (اختياري)",
    secure_payment: "دفع آمن عبر Stripe · مشفر SSL",
    admin: "لوحة التحكم",
    cta_eyebrow: "جاهزون عندما تكونين جاهزة",
    cta_headline: "العلاقة التي تطمحين إليها تبدأ بجلسة واحدة صادقة.",
    cta_subheadline: "احجزي جلستك التي تبلغ 40 دقيقة اليوم. اختاري الوقت المناسب لك — بدءًا من الغد.",
    cta_footer: "خصم 50% اليوم · دفع آمن عبر Stripe · قابل للاسترداد إذا لزم الأمر",
    areas_of_focus: "مجالات التركيز",
    about_maryem: "عن مريم",
    about_headline: "العلاقات بيولوجية ونفسية واجتماعية — كلها في وقت واحد.",
    about_highlight: "بيولوجية،",
    lives_transformed: "حياة تحولت من خلال الكوتشينج الرحيم",
    client_rating: "متوسط تقييم العملاء",
    tags: ["نظرية التعلق", "الكوتشينج الجسدي", "العلاج النظامي", "تنظيم المشاعر", "التواصل"],
    what_clients_say: "ماذا يقول العملاء",
    testimonials_data: [
      {
        name: "صوفيا ر.",
        role: "تمر بطلاق",
        quote: "جئت وأنا أشعر بالخدر تمامًا. ساعدتني مريم في فهم *لماذا* كنت أغلق عاطفيًا باستمرار — وأعطتني الأدوات لتغيير ذلك. تجربة غيرت حياتي.",
      },
      {
        name: "جيمس ولورا ك.",
        role: "زوجان، معًا منذ 8 سنوات",
        quote: "كنا نكرر نفس الجدال لسنوات. بعد ثلاث جلسات فقط مع مريم، فهمنا أخيرًا الجهاز العصبي لكل منا. نحن أشخاص مختلفون الآن.",
      },
      {
        name: "أمير ت.",
        role: "أعزب، يعمل على أنماط التعلق",
        quote: "كنت أجذب دائمًا نفس النوع من الشركاء غير المتاحين. ساعدتني مريم في تتبع ذلك حتى جذوره وتغيير أسلوب تعلقي بالفعل. عمل لا يصدق.",
      },
    ],
    pricing_headline: "جلسة واحدة. تغيير حقيقي.",
    one_on_one: "جلسة كوتشينج خاصة (1 لـ 1)",
    pricing_badge: "خصم 50% — عرض لفترة محدودة",
    pricing_footer: "40 دقيقة · دفع آمن عبر Stripe",
    reserve_spot: "احجز مكاني الآن",
    pricing_disclaimer: "دفع آمن · لا توجد اشتراكات · إلغاء في أي وقت",
    booking_notes_placeholder: "سياق موجز حول ما ترغبين في العمل عليه...",
    booking_name_placeholder: "اسمك الكامل",
    booking_email_placeholder: "you@example.com",
    minute_session: "جلسة لمدة 40 دقيقة",
    error_generic: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
  }
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem("lang") as Language;
    if (saved) setLang(saved);
  }, []);

  const handleSetLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem("lang", newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
  };

  const t = (key: string) => UI_STRINGS[lang][key] || key;

  return (
    <LanguageContext.Provider value={{ lang, setLang: handleSetLang, isRtl: lang === "ar", t }}>
      <div className={lang === "ar" ? "font-arabic" : ""}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
