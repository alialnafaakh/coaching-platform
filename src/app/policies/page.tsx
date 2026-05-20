"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useLanguage } from "@/context/LanguageContext";

const policies = {
  en: [
    {
      id: "payment",
      icon: "💳",
      title: "Payment Policy",
      sections: [
        {
          heading: "Session Pricing",
          body: "Sessions are currently offered at a special rate of $50 (regular price $100). Full payment is required at the time of booking to secure your appointment.",
        },
        {
          heading: "Payment Processing",
          body: "All payments are processed securely through Stripe, a globally trusted payment platform. Transactions are protected by SSL/TLS encryption. We accept all major credit and debit cards.",
        },
        {
          heading: "Data Security",
          body: "Your payment information is never stored on our servers. All card data is handled exclusively by Stripe in compliance with PCI-DSS standards. We only receive confirmation that payment was successful.",
        },
        {
          heading: "Currency",
          body: "All prices are listed in US Dollars (USD). Your bank or card provider may apply a currency conversion fee if your account is in a different currency.",
        },
      ],
    },
    {
      id: "cancellation",
      icon: "📋",
      title: "Cancellation & Return Policy",
      sections: [
        {
          heading: "Cancellation Window",
          body: "You may cancel your appointment at any time up to 24 hours before the scheduled session start time. Cancellations within this window are eligible for a refund.",
        },
        {
          heading: "Refund Amount",
          body: "Cancellations made more than 24 hours in advance are eligible for an 80–100% refund of the total amount paid. The exact refund percentage depends on processing fees applied by Stripe at the time of the transaction.",
        },
        {
          heading: "Late Cancellations",
          body: "Cancellations made less than 24 hours before the scheduled session are non-refundable. No exceptions will be made for late cancellations, including missed appointments.",
        },
        {
          heading: "After the Consultation",
          body: "Once a session has taken place, no refund will be issued under any circumstances. By proceeding with your booking, you acknowledge and agree to this policy.",
        },
        {
          heading: "How to Cancel",
          body: "To cancel your appointment, please contact us at biopsychosocial.site@gmail.com with your full name, booking date, and reason for cancellation as soon as possible.",
        },
      ],
    },
    {
      id: "privacy",
      icon: "🔒",
      title: "Privacy & Data Protection Policy",
      sections: [
        {
          heading: "What We Collect",
          body: "We collect your full name, email address, preferred session date and time, and any personal context you voluntarily share in the booking form (e.g. what brings you to coaching). This information is used solely to prepare for and deliver your session.",
        },
        {
          heading: "How We Use Your Data",
          body: "Your information is used to confirm your booking, send you a session reminder and confirmation email, prepare your coach for the session, and send post-session follow-up where applicable. We do not use your data for marketing without your explicit consent.",
        },
        {
          heading: "Payment Information",
          body: "All payment data is processed and stored exclusively by Stripe. We never see, access, or store your card or bank details on our systems. Stripe complies with PCI-DSS Level 1 standards — the highest level of payment security.",
        },
        {
          heading: "Confidentiality",
          body: "All information shared during sessions — whether in the booking form or verbally during the consultation — is treated with the strictest professional confidentiality. Session notes are not shared with any third party.",
        },
        {
          heading: "No Third-Party Sharing",
          body: "We do not sell, rent, trade, or share your personal data with any third parties for commercial purposes. Your data remains private and is only accessible by the coach.",
        },
        {
          heading: "Data Retention",
          body: "We retain your personal data for up to 2 years following your last session. After this period, all personal data is securely and permanently deleted. You may request earlier deletion at any time.",
        },
        {
          heading: "Your Rights",
          body: "You have the right to access, correct, export, or request deletion of your personal data at any time. To exercise these rights, contact us at biopsychosocial.site@gmail.com and we will respond within 7 business days.",
        },
        {
          heading: "Cookies & Tracking",
          body: "This website does not use tracking cookies or third-party analytics tools. We do not monitor your browsing behaviour or build advertising profiles.",
        },
        {
          heading: "Contact",
          body: "For any questions or concerns regarding your privacy or personal data, please reach out at biopsychosocial.site@gmail.com.",
        },
      ],
    },
  ],
  ar: [
    {
      id: "payment",
      icon: "💳",
      title: "سياسة الدفع",
      sections: [
        {
          heading: "أسعار الجلسات",
          body: "تُقدَّم الجلسات حاليًا بسعر خاص يبلغ 50 دولارًا (السعر الأصلي 100 دولار). يُشترط سداد المبلغ كاملًا وقت الحجز لتأكيد موعدك.",
        },
        {
          heading: "معالجة المدفوعات",
          body: "تُعالَج جميع المدفوعات بأمان عبر منصة Stripe الموثوقة عالميًا. وتُحمى المعاملات بتشفير SSL/TLS. نقبل جميع بطاقات الائتمان والخصم الرئيسية.",
        },
        {
          heading: "أمان البيانات",
          body: "لا يتم تخزين معلومات الدفع الخاصة بك على خوادمنا. تُعالَج جميع بيانات البطاقات حصريًا من قِبل Stripe وفق معايير PCI-DSS. نحن نتلقى فقط تأكيدًا بنجاح الدفع.",
        },
        {
          heading: "العملة",
          body: "جميع الأسعار مدرجة بالدولار الأمريكي (USD). قد يطبّق بنكك أو مزود البطاقة رسوم تحويل عملة إذا كان حسابك بعملة مختلفة.",
        },
      ],
    },
    {
      id: "cancellation",
      icon: "📋",
      title: "سياسة الإلغاء والاسترداد",
      sections: [
        {
          heading: "نافذة الإلغاء",
          body: "يمكنك إلغاء موعدك في أي وقت حتى 24 ساعة قبل وقت بدء الجلسة المقررة. الإلغاءات ضمن هذه النافذة مؤهلة للاسترداد.",
        },
        {
          heading: "مبلغ الاسترداد",
          body: "الإلغاءات التي تتم قبل أكثر من 24 ساعة مؤهلة لاسترداد 80 إلى 100% من المبلغ الإجمالي المدفوع. تعتمد النسبة الدقيقة للاسترداد على رسوم المعالجة التي يطبّقها Stripe وقت المعاملة.",
        },
        {
          heading: "الإلغاء المتأخر",
          body: "الإلغاءات التي تتم في غضون أقل من 24 ساعة قبل الجلسة المقررة غير قابلة للاسترداد. لا تُقبل أي استثناءات للإلغاء المتأخر، بما في ذلك المواعيد الفائتة.",
        },
        {
          heading: "بعد إجراء الاستشارة",
          body: "بمجرد إجراء الجلسة، لن يُصدر أي استرداد بأي حال من الأحوال. بالمضي قدمًا في حجزك، فإنك تقرّ وتوافق على هذه السياسة.",
        },
        {
          heading: "كيفية الإلغاء",
          body: "لإلغاء موعدك، يرجى التواصل معنا على biopsychosocial.site@gmail.com مع ذكر اسمك الكامل وتاريخ الحجز وسبب الإلغاء في أقرب وقت ممكن.",
        },
      ],
    },
    {
      id: "privacy",
      icon: "🔒",
      title: "سياسة الخصوصية وحماية البيانات",
      sections: [
        {
          heading: "ما الذي نجمعه",
          body: "نجمع اسمك الكامل وعنوان بريدك الإلكتروني والتاريخ والوقت المفضلَين للجلسة، وأي سياق شخصي تشاركه طوعًا في نموذج الحجز. تُستخدم هذه المعلومات فقط للتحضير لجلستك وتقديمها.",
        },
        {
          heading: "كيف نستخدم بياناتك",
          body: "تُستخدم معلوماتك لتأكيد حجزك، وإرسال تذكير وتأكيد الجلسة بالبريد الإلكتروني، وتهيئة المدربة لجلستك، وإرسال متابعة ما بعد الجلسة عند الاقتضاء. لا نستخدم بياناتك للتسويق دون موافقتك الصريحة.",
        },
        {
          heading: "معلومات الدفع",
          body: "تُعالَج جميع بيانات الدفع وتُخزَّن حصريًا من قِبل Stripe. لا نرى أو نصل إلى أو نخزّن تفاصيل بطاقتك أو حسابك المصرفي على أنظمتنا. يمتثل Stripe لمعايير PCI-DSS من المستوى الأول — أعلى مستوى لأمان الدفع.",
        },
        {
          heading: "السرية المهنية",
          body: "تُعامَل جميع المعلومات المشاركة خلال الجلسات — سواء في نموذج الحجز أو شفهيًا خلال الاستشارة — بأشد درجات السرية المهنية. لا تُشارك ملاحظات الجلسة مع أي طرف ثالث.",
        },
        {
          heading: "عدم المشاركة مع أطراف ثالثة",
          body: "لا نبيع أو نؤجر أو نتداول أو نشارك بياناتك الشخصية مع أي أطراف ثالثة لأغراض تجارية. تبقى بياناتك خاصة ولا يمكن الوصول إليها إلا من قِبل المدربة.",
        },
        {
          heading: "الاحتفاظ بالبيانات",
          body: "نحتفظ ببياناتك الشخصية لمدة تصل إلى سنتين بعد جلستك الأخيرة. بعد هذه الفترة، تُحذف جميع البيانات الشخصية بشكل آمن ودائم. يمكنك طلب الحذف المبكر في أي وقت.",
        },
        {
          heading: "حقوقك",
          body: "يحق لك الوصول إلى بياناتك الشخصية أو تصحيحها أو تصديرها أو طلب حذفها في أي وقت. لممارسة هذه الحقوق، تواصل معنا على biopsychosocial.site@gmail.com وسنرد في غضون 7 أيام عمل.",
        },
        {
          heading: "ملفات تعريف الارتباط والتتبع",
          body: "لا يستخدم هذا الموقع ملفات تعريف الارتباط للتتبع أو أدوات التحليلات التابعة لجهات خارجية. نحن لا نراقب سلوك تصفحك ولا نبني ملفات تعريف إعلانية.",
        },
        {
          heading: "التواصل",
          body: "لأي أسئلة أو استفسارات تتعلق بخصوصيتك أو بياناتك الشخصية، يرجى التواصل معنا على biopsychosocial.site@gmail.com.",
        },
      ],
    },
  ],
};

export default function PoliciesPage() {
  const { isRtl } = useLanguage();
  const content = isRtl ? policies.ar : policies.en;
  const [activeTab, setActiveTab] = useState(0);
  const [openSection, setOpenSection] = useState<number | null>(null);

  // Switch to correct tab when navigating via hash link (e.g. /policies#cancellation)
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      const idx = content.findIndex((p) => p.id === hash);
      if (idx !== -1) setActiveTab(idx);
    }
  }, []);

  const active = content[activeTab];

  return (
    <>
      <Navbar />
      <main className={`min-h-screen bg-[#faf9f6] pt-24 pb-20 ${isRtl ? "text-right" : "text-left"}`}>
        {/* Hero */}
        <div
          className="py-16 px-6 text-white text-center"
          style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #0d7377 100%)" }}
        >
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-xs uppercase tracking-widest text-white/50 mb-3 ${isRtl ? "font-arabic" : ""}`}
          >
            {isRtl ? "الشفافية والثقة" : "Transparency & Trust"}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`text-4xl md:text-5xl mb-4 ${isRtl ? "font-arabic-display" : ""}`}
            style={{ fontFamily: isRtl ? undefined : "Cormorant Garamond, Georgia, serif" }}
          >
            {isRtl ? "سياساتنا" : "Our Policies"}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`text-sm text-white/60 max-w-md mx-auto ${isRtl ? "font-arabic" : ""}`}
          >
            {isRtl
              ? "نؤمن بالشفافية الكاملة. اقرأ سياساتنا لتعرف كيف نتعامل مع حجزك وبياناتك."
              : "We believe in full transparency. Read our policies to understand how we handle your booking and your data."}
          </motion.p>
        </div>

        {/* Tab Nav */}
        <div className="sticky top-16 z-10 bg-[#faf9f6]/90 backdrop-blur border-b border-[#e5e0d8] px-6">
          <div className={`max-w-3xl mx-auto flex ${isRtl ? "flex-row-reverse" : ""} overflow-x-auto`}>
            {content.map((policy, i) => (
              <button
                key={policy.id}
                id={`policy-tab-${policy.id}`}
                onClick={() => { setActiveTab(i); setOpenSection(null); }}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
                  activeTab === i
                    ? "border-[#0d7377] text-[#0d7377]"
                    : "border-transparent text-[#6b7280] hover:text-[#1a1a2e]"
                } ${isRtl ? "font-arabic flex-row-reverse" : ""}`}
              >
                <span>{policy.icon}</span>
                <span>{policy.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Policy Content */}
        <div className="max-w-3xl mx-auto px-6 py-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {/* Policy title */}
              <div className={`flex items-center gap-3 mb-8 ${isRtl ? "flex-row-reverse" : ""}`}>
                <span className="text-4xl">{active.icon}</span>
                <h2
                  className={`text-3xl text-[#1a1a2e] ${isRtl ? "font-arabic-display" : ""}`}
                  style={{ fontFamily: isRtl ? undefined : "Cormorant Garamond, Georgia, serif" }}
                >
                  {active.title}
                </h2>
              </div>

              {/* Accordion sections */}
              <div className="space-y-3">
                {active.sections.map((section, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl border border-[#e5e0d8] overflow-hidden shadow-sm"
                  >
                    <button
                      id={`section-${active.id}-${idx}`}
                      onClick={() => setOpenSection(openSection === idx ? null : idx)}
                      className={`w-full flex items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-[#f8f6f2] ${isRtl ? "flex-row-reverse text-right" : ""}`}
                    >
                      <span className={`font-medium text-[#1a1a2e] text-sm ${isRtl ? "font-arabic" : ""}`}>
                        {section.heading}
                      </span>
                      <motion.span
                        animate={{ rotate: openSection === idx ? 45 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-[#0d7377] text-xl flex-shrink-0"
                      >
                        +
                      </motion.span>
                    </button>

                    <AnimatePresence>
                      {openSection === idx && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className={`px-6 pb-5 pt-0 text-sm text-[#6b7280] leading-relaxed border-t border-[#f0ede6] ${isRtl ? "font-arabic" : ""}`}>
                            {section.body}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              {/* Contact note */}
              <div
                className={`mt-10 p-5 rounded-2xl text-sm ${isRtl ? "font-arabic text-right" : ""}`}
                style={{ background: "linear-gradient(135deg, #e6f4f4, #f0fafa)" }}
              >
                <p className="text-[#0d7377] font-medium mb-1">
                  {isRtl ? "هل لديك أسئلة؟" : "Have questions?"}
                </p>
                <p className="text-[#6b7280]">
                  {isRtl
                    ? "لا تتردد في التواصل معنا على "
                    : "Don't hesitate to reach out at "}
                  <a
                    href="mailto:biopsychosocial.site@gmail.com"
                    className="text-[#0d7377] underline underline-offset-2 hover:text-[#0a5c60] transition-colors"
                  >
                    biopsychosocial.site@gmail.com
                  </a>
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <Footer />
    </>
  );
}
