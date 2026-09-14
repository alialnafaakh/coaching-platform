"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "ar";

export type UiService = {
  icon: string;
  title: string;
  description: string;
};

export type UiTestimonial = {
  name: string;
  role: string;
  quote: string;
};

/** Catalog of UI copy. Most entries are strings; a few are structured data. */
export type UiStrings = {
  book_session: string;
  book_now: string;
  learn_more: string;
  about: string;
  services: string;
  testimonials: string;
  pricing: string;
  contact: string;
  navigate: string;
  all_rights: string;
  redirecting: string;
  confirm_pay: string;
  your_booking: string;
  full_name: string;
  email_address: string;
  what_brings: string;
  secure_payment: string;
  admin: string;
  choose_payment: string;
  pay_patreon: string;
  pay_patreon_desc: string;
  pay_qicard: string;
  pay_qicard_desc: string;
  qicard_instructions: string;
  qicard_number_label: string;
  qicard_copied: string;
  qicard_copy: string;
  qicard_confirm: string;
  qicard_note: string;
  patreon_redirecting: string;
  patreon_confirm: string;
  patreon_instructions: string;
  cta_eyebrow: string;
  cta_headline: string;
  cta_subheadline: string;
  cta_footer: string;
  areas_of_focus: string;
  about_maryem: string;
  about_headline: string;
  about_highlight: string;
  lives_transformed: string;
  client_rating: string;
  tags: string[];
  services_data: UiService[];
  what_clients_say: string;
  testimonials_data: UiTestimonial[];
  pricing_headline: string;
  one_on_one: string;
  pricing_badge: string;
  pricing_footer: string;
  reserve_spot: string;
  pricing_disclaimer: string;
  booking_notes_placeholder: string;
  booking_name_placeholder: string;
  booking_email_placeholder: string;
  minute_session: string;
  minutes_unit: string;
  session_label: string;
  off_label: string;
  error_generic: string;
  choose_date: string;
  choose_time: string;
  your_details: string;
  select_date_info: string;
  available_times: string;
  istanbul_time: string;
  change_time: string;
  no_slots_for: string;
  choose_another_date: string;
  booked_headline: string;
  booked_subheadline: string;
  whats_next: string;
  check_inbox: string;
  add_calendar: string;
  intake_sent: string;
  back_home: string;
  reserve_session: string;
  reserving: string;
  payment_required: string;
  pending_payment_label: string;
  confirmed_label: string;
  cancelled_label: string;
  in_progress_label: string;
  completed_label: string;
  booking_pending_headline: string;
  booking_pending_sub: string;
  booking_hold_note: string;
  payment_next_note: string;
  hold_until: string;
  expired_hold: string;
  expired_hold_sub: string;
  loading_booking: string;
  booking_not_found: string;
  booking_missing_access: string;
  join_consultation: string;
  open_consultation: string;
  consultation_unavailable: string;
  consultation_opens_at: string;
  consultation_window_closed: string;
  enter_consultation: string;
  connecting: string;
  connected: string;
  reconnecting: string;
  call_error: string;
  left_call: string;
  mic_on: string;
  mic_off: string;
  camera_on: string;
  camera_off: string;
  leave_call: string;
  end_consultation: string;
  ending_consultation: string;
  end_consultation_confirm: string;
  waiting_for_other: string;
  you_label: string;
  other_participant: string;
  media_permission_hint: string;
  consultation_room_title: string;
  consultation_ready: string;
};

export type TranslationKey = keyof UiStrings;
export type StringTranslationKey = {
  [K in TranslationKey]: UiStrings[K] extends string ? K : never;
}[TranslationKey];

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  isRtl: boolean;
  t: <K extends TranslationKey>(key: K) => UiStrings[K];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const UI_STRINGS: Record<Language, UiStrings> = {
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
    redirecting: "Redirecting to payment...",
    confirm_pay: "Confirm & Pay $50 →",
    your_booking: "Your Booking",
    full_name: "Full Name",
    email_address: "Email Address",
    what_brings: "What brings you here? (optional)",
    secure_payment: "Secure payment · SSL encrypted",
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
    cta_subheadline: "Book your session today. Pick a time that works for you — starting tomorrow.",
    cta_footer: "Secure payment · Refundable if needed",
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
    pricing_badge: "Limited Time Offer",
    pricing_footer: "Secure payment",
    reserve_spot: "Reserve My Spot",
    pricing_disclaimer: "Secure checkout · No subscriptions · Cancel anytime",
    booking_notes_placeholder: "Brief context about what you'd like to work on…",
    booking_name_placeholder: "Your full name",
    booking_email_placeholder: "you@example.com",
    minute_session: "Private session",
    minutes_unit: "minutes",
    session_label: "session",
    off_label: "off",
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
    reserve_session: "Reserve this time",
    reserving: "Reserving your time…",
    payment_required: "Payment required",
    pending_payment_label: "Pending payment",
    confirmed_label: "Confirmed",
    cancelled_label: "Cancelled",
    in_progress_label: "In progress",
    completed_label: "Completed",
    booking_pending_headline: "Your time is reserved",
    booking_pending_sub: "This session is held for you while payment is prepared. It is not confirmed until payment is completed.",
    booking_hold_note: "Submitting this form reserves the time as pending payment. The session is not confirmed until payment is completed.",
    payment_next_note: "Online payment will be connected in the next step. This reservation stays unpaid until then.",
    hold_until: "Reservation held until",
    expired_hold: "This reservation has expired",
    expired_hold_sub: "The payment window ended and this time is available again. You can book another session.",
    loading_booking: "Loading your booking…",
    booking_not_found: "Booking not found",
    booking_missing_access: "This booking link is missing or incomplete.",
    join_consultation: "Join consultation",
    open_consultation: "Open consultation",
    consultation_unavailable: "Consultation unavailable",
    consultation_opens_at: "You can join from",
    consultation_window_closed: "The join window for this consultation has ended.",
    enter_consultation: "Enter consultation room",
    connecting: "Connecting…",
    connected: "Connected",
    reconnecting: "Reconnecting…",
    call_error: "Unable to connect to the consultation room.",
    left_call: "You left the consultation.",
    mic_on: "Mute",
    mic_off: "Unmute",
    camera_on: "Camera off",
    camera_off: "Camera on",
    leave_call: "Leave",
    end_consultation: "End consultation",
    ending_consultation: "Ending…",
    end_consultation_confirm: "End this consultation for everyone? This cannot be undone.",
    waiting_for_other: "Waiting for the other participant…",
    you_label: "You",
    other_participant: "Participant",
    media_permission_hint: "Camera or microphone access was denied. You can still join with devices off.",
    consultation_room_title: "Consultation room",
    consultation_ready: "Your consultation room is ready.",
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
    redirecting: "جاري التحويل إلى الدفع...",
    confirm_pay: "تأكيد ودفع 50 دولار ←",
    your_booking: "حجزك",
    full_name: "الاسم الكامل",
    email_address: "البريد الإلكتروني",
    what_brings: "ما الذي يأتي بك إلى هنا؟ (اختياري)",
    secure_payment: "دفع آمن · مشفر SSL",
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
    cta_subheadline: "احجزي جلستك اليوم. اختاري الوقت المناسب لك — بدءًا من الغد.",
    cta_footer: "دفع آمن · قابل للاسترداد إذا لزم الأمر",
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
    pricing_badge: "عرض لفترة محدودة",
    pricing_footer: "دفع آمن",
    reserve_spot: "احجز مكاني الآن",
    pricing_disclaimer: "دفع آمن · لا توجد اشتراكات · إلغاء في أي وقت",
    booking_notes_placeholder: "سياق موجز حول ما ترغبين في العمل عليه...",
    booking_name_placeholder: "اسمك الكامل",
    booking_email_placeholder: "you@example.com",
    minute_session: "جلسة خاصة",
    minutes_unit: "دقيقة",
    session_label: "جلسة",
    off_label: "خصم",
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
    reserve_session: "احجزي هذا الموعد",
    reserving: "جاري حجز الموعد…",
    payment_required: "الدفع مطلوب",
    pending_payment_label: "بانتظار الدفع",
    confirmed_label: "مؤكد",
    cancelled_label: "ملغى",
    in_progress_label: "قيد التنفيذ",
    completed_label: "مكتمل",
    booking_pending_headline: "تم حجز الوقت",
    booking_pending_sub: "تم حجز هذه الجلسة لك ريثما يُجهّز الدفع. لن يتم التأكيد قبل إتمام الدفع.",
    booking_hold_note: "إرسال هذا النموذج يحجز الوقت بحالة انتظار الدفع. الجلسة غير مؤكدة حتى يكتمل الدفع.",
    payment_next_note: "سيتم ربط الدفع الإلكتروني في الخطوة التالية. يبقى هذا الحجز غير مدفوع حتى ذلك الحين.",
    hold_until: "الحجز محفوظ حتى",
    expired_hold: "انتهت صلاحية هذا الحجز",
    expired_hold_sub: "انتهت مهلة الدفع وأصبح هذا الوقت متاحًا مرة أخرى. يمكنك حجز جلسة أخرى.",
    loading_booking: "جاري تحميل حجزك…",
    booking_not_found: "لم يتم العثور على الحجز",
    booking_missing_access: "رابط هذا الحجز ناقص أو غير مكتمل.",
    join_consultation: "الانضمام إلى الاستشارة",
    open_consultation: "فتح الاستشارة",
    consultation_unavailable: "الاستشارة غير متاحة",
    consultation_opens_at: "يمكنك الانضمام ابتداءً من",
    consultation_window_closed: "انتهت مهلة الانضمام إلى هذه الاستشارة.",
    enter_consultation: "الدخول إلى غرفة الاستشارة",
    connecting: "جاري الاتصال…",
    connected: "متصل",
    reconnecting: "إعادة الاتصال…",
    call_error: "تعذّر الاتصال بغرفة الاستشارة.",
    left_call: "غادرت الاستشارة.",
    mic_on: "كتم الصوت",
    mic_off: "إلغاء الكتم",
    camera_on: "إيقاف الكاميرا",
    camera_off: "تشغيل الكاميرا",
    leave_call: "مغادرة",
    end_consultation: "إنهاء الاستشارة",
    ending_consultation: "جاري الإنهاء…",
    end_consultation_confirm: "إنهاء هذه الاستشارة للجميع؟ لا يمكن التراجع عن ذلك.",
    waiting_for_other: "بانتظار المشارك الآخر…",
    you_label: "أنت",
    other_participant: "المشارك",
    media_permission_hint: "تم رفض إذن الكاميرا أو الميكروفون. يمكنك الانضمام مع إيقاف الأجهزة.",
    consultation_room_title: "غرفة الاستشارة",
    consultation_ready: "غرفة الاستشارة جاهزة.",
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

  const t = <K extends TranslationKey>(key: K): UiStrings[K] => UI_STRINGS[lang][key];

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
