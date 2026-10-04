"use client";

import { useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import CurrentConsultationPrice from "@/components/booking/CurrentConsultationPrice";
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
          body: "The current session price and any discount are shown below and when you book. Your booking keeps the price agreed at reservation; later pricing changes do not change that booking.",
        },
        {
          heading: "Payment Processing",
          body: "Online payments are processed through Wayl. After you reserve a time, you can continue to Wayl to complete payment. Your booking is confirmed only after the payment provider securely verifies successful payment. Reaching or returning from the payment page does not confirm a booking.",
        },
        {
          heading: "Data Security",
          body: "We do not collect or store your card or bank details on this website. You enter payment details through Wayl. The website receives payment confirmation to update your booking.",
        },
        {
          heading: "Currency",
          body: "Prices are displayed in US Dollars (USD). Wayl checkout is charged in Iraqi Dinars (IQD), calculated using the website’s applicable USD-to-IQD conversion rate at checkout. The payable IQD amount is shown before you continue to payment.",
        },
        { heading: "Pending reservations", body: "An unpaid or unverified booking remains pending. Its temporary hold may expire if payment is not completed and verified in time. Cancellation and refund requests are governed by our Cancellation & Refund Policy." }
      ],
    },
    {
      id: "cancellation",
      icon: "📋",
      title: "Cancellation & Refund Policy",
      sections: [
        {
          heading: "Cancellation Window",
          body: "You may cancel your appointment at any time up to 24 hours before the scheduled session start time. Cancellations within this window are eligible for a refund.",
        },
        {
          heading: "Refund Amount",
          body: "Cancellations made at least 24 hours in advance are eligible for an 80–100% refund of the total amount paid. The exact refund percentage may depend on processing fees applied by the payment provider at the time of the transaction.",
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
          body: "We do not collect or store card or bank details on this website. Payment details are processed through Wayl.",
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
          body: "تظهر أدناه وعند الحجز أسعار الجلسات الحالية وأي خصم متاح. يحتفظ حجزك بالسعر المعتمد وقت الحجز، ولا تؤثر تغييرات الأسعار اللاحقة على هذا الحجز.",
        },
        {
          heading: "معالجة المدفوعات",
          body: "تُعالج المدفوعات الإلكترونية عبر ويل (Wayl). بعد حجز الوقت مؤقتًا، يمكنك المتابعة إلى ويل لإتمام الدفع. لا يُؤكَّد الحجز إلا بعد التحقق الآمن من نجاح الدفع لدى مزود الدفع؛ والوصول إلى صفحة الدفع أو العودة منها لا يعني تأكيد الحجز.",
        },
        {
          heading: "أمان البيانات",
          body: "لا نجمع أو نخزّن بيانات بطاقتك أو حسابك المصرفي على هذا الموقع. تُدخل بيانات الدفع عبر ويل، ويتلقى الموقع تأكيد الدفع لتحديث حالة حجزك.",
        },
        {
          heading: "العملة",
          body: "تُعرض الأسعار بالدولار الأمريكي (USD)، بينما يُحصَّل الدفع عبر ويل بالدينار العراقي (IQD). يُحسب المبلغ وفق سعر التحويل المعتمد على الموقع عند الدفع، ويظهر لك المبلغ المستحق بالدينار قبل المتابعة.",
        },
        { heading: "الحجز المؤقت", body: "يبقى الحجز بانتظار التأكيد إذا لم يكتمل الدفع أو لم يُتحقق منه. وقد تنتهي صلاحية الحجز المؤقت إذا لم يكتمل الدفع والتحقق خلال المهلة المحددة. تخضع طلبات الإلغاء والاسترداد لسياسة الإلغاء والاسترداد على الموقع." }
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
          body: "الإلغاءات التي تتم قبل 24 ساعة على الأقل مؤهلة لاسترداد 80 إلى 100% من المبلغ الإجمالي المدفوع. قد تعتمد النسبة الدقيقة للاسترداد على رسوم المعالجة التي يطبّقها مزود الدفع وقت المعاملة.",
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
          body: "لا نجمع أو نخزّن تفاصيل البطاقات أو الحسابات المصرفية على هذا الموقع. تُعالج بيانات الدفع عبر ويل.",
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

function subscribeHash(notify: () => void) {
  window.addEventListener("hashchange", notify);
  window.addEventListener("popstate", notify);
  return () => { window.removeEventListener("hashchange", notify); window.removeEventListener("popstate", notify); };
}
export default function PoliciesPage() {
  const { isRtl } = useLanguage();
  const content = isRtl ? policies.ar : policies.en;
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash.slice(1), () => "");
  const activeTab = Math.max(0, content.findIndex(p => p.id === hash));
  const [openSection, setOpenSection] = useState<number | null>(null);

  const active = content[activeTab];
  const selectPolicy = (index: number) => { window.location.hash = content[index].id; setOpenSection(null); };

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
            className={`text-xs uppercase tracking-widest text-white/70 mb-3 ${isRtl ? "font-arabic" : ""}`}
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
            className={`text-sm text-white/80 max-w-md mx-auto ${isRtl ? "font-arabic" : ""}`}
          >
            {isRtl
              ? "نؤمن بالشفافية الكاملة. اقرأ سياساتنا لتعرف كيف نتعامل مع حجزك وبياناتك."
              : "We believe in full transparency. Read our policies to understand how we handle your booking and your data."}
          </motion.p>
        </div>

        {/* Tab Nav */}
        <div className="sticky top-16 z-10 bg-[#faf9f6]/90 backdrop-blur border-b border-[#e5e0d8] px-6">
          <div className="max-w-3xl mx-auto py-3 sm:hidden">
            <label htmlFor="policy-selector" className="block mb-2 text-sm text-[#374151]">{isRtl ? "اختر السياسة" : "Choose a policy"}</label>
            <select id="policy-selector" value={activeTab} onChange={event => selectPolicy(Number(event.target.value))} aria-controls="policy-content" className="w-full rounded-xl border border-[#e5e0d8] bg-white p-3 text-base">
              {content.map((policy, i) => <option key={policy.id} value={i}>{policy.title}</option>)}
            </select>
          </div>
          <div className="max-w-3xl mx-auto hidden sm:flex overflow-x-auto">
            {content.map((policy, i) => (
              <button
                key={policy.id}
                id={`policy-tab-${policy.id}`}
                onClick={() => selectPolicy(i)}
                aria-pressed={activeTab === i}
                aria-controls="policy-content"
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
        <div id="policy-content" className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
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
                      aria-expanded={openSection === idx}
                      aria-controls={`panel-${active.id}-${idx}`}
                      onClick={() => setOpenSection(openSection === idx ? null : idx)}
                      className={`w-full flex items-center justify-between gap-4 px-6 py-5 transition-colors hover:bg-[#f8f6f2] ${isRtl ? "text-right" : "text-left"}`}
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

                    <div id={`panel-${active.id}-${idx}`} role="region" aria-labelledby={`section-${active.id}-${idx}`} hidden={openSection !== idx}>
                      <div className={`px-6 pb-5 pt-3 text-base text-[#4b5563] leading-relaxed border-t border-[#f0ede6] ${isRtl ? "font-arabic" : ""}`}>
                        <p>{section.body}</p>
                        {active.id === "payment" && idx === 0 && <div className="mt-4"><CurrentConsultationPrice /></div>}
                        {active.id === "payment" && idx === active.sections.length - 1 && <Link href="/policies#cancellation" onClick={event => { event.preventDefault(); selectPolicy(1); }} className="inline-block mt-3 text-[#0d7377] underline">{isRtl ? "سياسة الإلغاء والاسترداد" : "Cancellation & Refund Policy"}</Link>}
                      </div>
                    </div>
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
