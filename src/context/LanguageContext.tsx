"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "ar";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  isRtl: boolean;
  t: (key: string) => any;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const UI_STRINGS: Record<Language, Record<string, any>> = {
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
    choose_payment: "Choose Payment Method",
    pay_patreon: "Pay via Patreon",
    pay_patreon_desc: "International · Credit/Debit card · Secure",
    pay_qicard: "Pay via QI Card",
    pay_qicard_desc: "For residents in Iraq only",
    qicard_instructions: "Transfer $50 to the following QI Card number, then click Confirm below.",
    qicard_number_label: "QI Card Number",
    qicard_copied: "Copied!",
    qicard_copy: "Copy",
    qicard_confirm: "I've Transferred — Confirm Booking →",
    qicard_note: "⚠️ Your booking will be confirmed after payment is verified. Please keep your transfer receipt.",
    patreon_redirecting: "Opening Patreon...",
    patreon_confirm: "Continue to Patreon →",
    patreon_instructions: "You'll be redirected to Patreon to complete your $50 payment securely.",
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
    services_data: [
      {
        icon: "🧠",
        title: "Biopsychosocial Assessment",
        description: "We begin by mapping the full picture — your nervous system patterns, your relational history, and the social forces shaping your connections today.",
      },
      {
        icon: "💞",
        title: "Couples & Partnership Coaching",
        description: "For partners ready to break old cycles. We work on communication, repair, and building a secure attachment — together.",
      },
      {
        icon: "🌱",
        title: "Individual Relationship Coaching",
        description: "For those navigating loneliness, dating, divorce, or the aftermath of a difficult relationship. You don't have to figure it out alone.",
      },
      {
        icon: "🔄",
        title: "Pattern Interruption",
        description: "Deep-rooted patterns live in the body. Somatic-informed techniques help you notice, interrupt, and rewire reactive cycles at the source.",
      },
      {
        icon: "🗣️",
        title: "Communication Mastery",
        description: "Learn to express needs clearly, listen without defensiveness, and have the conversations you've been avoiding — with skill and care.",
      },
      {
        icon: "🛡️",
        title: "Boundaries & Self-worth",
        description: "Understand why boundaries collapse — and rebuild them from a place of self-respect, not fear. Healthy limits are an act of love.",
      },
    ],
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
    choose_date: "Choose Date",
    choose_time: "Choose Time",
    your_details: "Your Details",
    select_date_info: "Select a date — available from tomorrow onwards",
    available_times: "Available times on",
    istanbul_time: "All times are in Istanbul Time (TRT).",
    change_time: "Change time",
    no_slots_for: "No available slots for",
    choose_another_date: "Please choose another date.",
    booked_headline: "You're booked!",
    booked_subheadline: "Your session is confirmed. You'll receive a confirmation email shortly. I look forward to meeting you and exploring this work together.",
    whats_next: "What's next?",
    check_inbox: "Check your inbox for a confirmation email",
    add_calendar: "Add the session to your calendar",
    intake_sent: "A brief intake questionnaire will be sent to you",
    back_home: "Back to Home",
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
    choose_payment: "اختر طريقة الدفع",
    pay_patreon: "الدفع عبر Patreon",
    pay_patreon_desc: "دولي · بطاقة ائتمانية/خصم · آمن",
    pay_qicard: "الدفع عبر بطاقة QI",
    pay_qicard_desc: "للمقيمين في العراق فقط",
    qicard_instructions: "حوّل 50 دولارًا إلى رقم بطاقة QI التالي، ثم انقر على تأكيد أدناه.",
    qicard_number_label: "رقم بطاقة QI",
    qicard_copied: "تم النسخ!",
    qicard_copy: "نسخ",
    qicard_confirm: "لقد حوّلت المبلغ — تأكيد الحجز ←",
    qicard_note: "⚠️ سيتم تأكيد حجزك بعد التحقق من الدفع. يرجى الاحتفاظ بإيصال التحويل.",
    patreon_redirecting: "جاري فتح Patreon...",
    patreon_confirm: "المتابعة إلى Patreon →",
    patreon_instructions: "ستتم إعادة توجيهك إلى Patreon لإتمام دفع 50 دولارًا بأمان.",
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
    services_data: [
      {
        icon: "🧠",
        title: "التقييم البيولوجي النفسي الاجتماعي",
        description: "بدأنا برسم الصورة الكاملة — أنماط جهازك العصبي، وتاريخك العلائقي، والقوى الاجتماعية التي تشكل روابطك اليوم.",
      },
      {
        icon: "💞",
        title: "كوتشينج الأزواج والشركاء",
        description: "للشركاء المستعدين لكسر الدورات القديمة. نعمل على التواصل والإصلاح وبناء تعلق آمن — معًا.",
      },
      {
        icon: "🌱",
        title: "كوتشينج العلاقات الفردي",
        description: "لأولئك الذين يعانون من الوحدة، أو المواعدة، أو الطلاق، أو آثار علاقة صعبة. ليس عليك مواجهة الأمر بمفردك.",
      },
      {
        icon: "🔄",
        title: "مقاطعة الأنماط",
        description: "الأنماط العميقة تعيش في الجسد. تساعدك تقنيات الوعي الجسدي على ملاحظة ومقاطعة وإعادة توصيل الدورات التفاعلية من المصدر.",
      },
      {
        icon: "🗣️",
        title: "إتقان التواصل",
        description: "تعلمي التعبير عن الاحتياجات بوضوح، والاستماع دون دفاعية، وإجراء المحادثات التي كنت تتجنبينها — بمهارة ورعاية.",
      },
      {
        icon: "🛡️",
        title: "الحدود وتقدير الذات",
        description: "فهم لماذا تنهار الحدود — وإعادة بنائها من مكان يحترم الذات، وليس من الخوف. الحدود الصحية هي فعل حب.",
      },
    ],
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
    choose_date: "اختر التاريخ",
    choose_time: "اختر الوقت",
    your_details: "بياناتك",
    select_date_info: "اختر تاريخًا — متاح بدءًا من الغد",
    available_times: "الأوقات المتاحة في",
    istanbul_time: "جميع الأوقات بتوقيت اسطنبول (TRT).",
    change_time: "تغيير الوقت",
    no_slots_for: "لا توجد مواعيد متاحة ليوم",
    choose_another_date: "يرجى اختيار تاريخ آخر.",
    booked_headline: "تم الحجز بنجاح!",
    booked_subheadline: "تم تأكيد جلستك. ستصلك رسالة تأكيد عبر البريد الإلكتروني قريبًا. أتطلع إلى لقائك واستكشاف هذا العمل معًا.",
    whats_next: "ماذا بعد؟",
    check_inbox: "تحقق من بريدك الإلكتروني للحصول على رسالة التأكيد",
    add_calendar: "أضف الجلسة إلى تقويمك",
    intake_sent: "سيتم إرسال استبيان موجز إليك",
    back_home: "العودة للرئيسية",
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
