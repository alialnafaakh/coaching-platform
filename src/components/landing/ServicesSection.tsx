"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

import { useLanguage } from "@/context/LanguageContext";

export default function ServicesSection({ title = "What We Work On" }: { title?: string }) {
  const { isRtl, t } = useLanguage();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const servicesData = t("services_data");

  return (
    <section id="services" ref={ref} className="py-28 px-6 bg-[#faf9f6]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className={`text-4xl md:text-5xl text-[#1a1a2e] ${isRtl ? "font-arabic-display" : ""}`}
            style={{ fontFamily: isRtl ? undefined : "Cormorant Garamond, Georgia, serif" }}
          >
            {title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`mt-4 text-[#6b7280] max-w-xl mx-auto text-base ${isRtl ? "font-arabic" : ""}`}
          >
            {isRtl 
              ? "كل جلسة مصممة خصيصًا لمكانك الحالي. هذه هي الخيوط التي ننسجها معًا في أغلب الأحيان."
              : "Every session is tailored to where you are. These are the threads we most often weave together."}
          </motion.p>
        </div>

        <div className={`grid md:grid-cols-2 lg:grid-cols-3 gap-6 ${isRtl ? "rtl" : "ltr"}`}>
          {servicesData.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
              whileHover={{ y: -4 }}
              className={`bg-white rounded-2xl p-7 border border-[#e5e0d8] hover:border-[#0d7377]/30 hover:shadow-lg transition-all duration-300 group ${isRtl ? "text-right" : "text-left"}`}
            >
              <span className={`text-3xl mb-4 block ${isRtl ? "text-right" : "text-left"}`}>{s.icon}</span>
              <h3
                className={`text-lg text-[#1a1a2e] mb-3 group-hover:text-[#0d7377] transition-colors ${isRtl ? "font-arabic-display" : ""}`}
                style={{ fontFamily: isRtl ? undefined : "Cormorant Garamond, Georgia, serif", fontWeight: isRtl ? 700 : 500 }}
              >
                {s.title}
              </h3>
              <p className={`text-sm text-[#6b7280] leading-relaxed ${isRtl ? "font-arabic" : ""}`}>
                {s.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
