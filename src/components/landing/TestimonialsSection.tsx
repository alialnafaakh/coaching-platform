"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const testimonials = [
  {
    name: "Sofia R.",
    role: "Navigating a divorce",
    quote:
      "I came in completely numb. Maryem helped me understand *why* I kept shutting down emotionally — and gave me tools to change that. Life-changing.",
    stars: 5,
  },
  {
    name: "James & Laura K.",
    role: "Couple, together 8 years",
    quote:
      "We were repeating the same argument for years. After just three sessions with Maryem, we finally understood each other's nervous systems. We're different people now.",
    stars: 5,
  },
  {
    name: "Amir T.",
    role: "Single, working on patterns",
    quote:
      "I kept attracting the same kind of unavailable partner. Maryem helped me trace it back to its root and actually change my attachment style. Incredible work.",
    stars: 5,
  },
];

import { useLanguage } from "@/context/LanguageContext";

export default function TestimonialsSection({ title = "Stories of Change" }: { title?: string }) {
  const { isRtl, t } = useLanguage();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const testimonialsData = t("testimonials_data") as unknown as any[];

  return (
    <section id="testimonials" ref={ref} className="py-28 px-6 bg-[#faf9f6]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            className={`text-xs uppercase tracking-widest text-[#0d7377] font-medium mb-4 ${isRtl ? "font-arabic" : ""}`}
          >
            {title}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className={`text-4xl md:text-5xl text-[#1a1a2e] ${isRtl ? "font-arabic-display" : ""}`}
            style={{ fontFamily: isRtl ? undefined : "Cormorant Garamond, Georgia, serif" }}
          >
            {t("what_clients_say")}
          </motion.h2>
        </div>

        <div className={`grid md:grid-cols-3 gap-6 ${isRtl ? "rtl" : "ltr"}`}>
          {testimonialsData.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: 0.1 + i * 0.15 }}
              className={`bg-white rounded-2xl p-7 border border-[#e5e0d8] flex flex-col gap-5 hover:shadow-md transition-shadow duration-300 ${isRtl ? "text-right" : "text-left"}`}
            >
              {/* Stars */}
              <div className={`flex gap-0.5 ${isRtl ? "flex-row-reverse" : "flex-row"}`}>
                {[1, 2, 3, 4, 5].map((idx) => (
                  <span key={idx} className="text-[#d4a843] text-sm">★</span>
                ))}
              </div>

              {/* Quote */}
              <blockquote className={`text-sm text-[#374151] leading-relaxed flex-1 ${isRtl ? "font-arabic" : ""}`}>
                {isRtl ? "«" : "“"}{item.quote}{isRtl ? "»" : "”"}
              </blockquote>

              {/* Author */}
              <div className={`flex items-center gap-3 pt-2 border-t border-[#f3f0ea] ${isRtl ? "flex-row-reverse" : "flex-row"}`}>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #0d7377, #d4a843)" }}
                >
                  {item.name.charAt(0)}
                </div>
                <div className={isRtl ? "text-right" : "text-left"}>
                  <p className={`text-sm font-medium text-[#1a1a2e] ${isRtl ? "font-arabic" : ""}`}>{item.name}</p>
                  <p className={`text-xs text-[#9ca3af] ${isRtl ? "font-arabic" : ""}`}>{item.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
