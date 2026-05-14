"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const services = [
  {
    icon: "🧠",
    title: "Biopsychosocial Assessment",
    description:
      "We begin by mapping the full picture — your nervous system patterns, your relational history, and the social forces shaping your connections today.",
  },
  {
    icon: "💞",
    title: "Couples & Partnership Coaching",
    description:
      "For partners ready to break old cycles. We work on communication, repair, and building a secure attachment — together.",
  },
  {
    icon: "🌱",
    title: "Individual Relationship Coaching",
    description:
      "For those navigating loneliness, dating, divorce, or the aftermath of a difficult relationship. You don't have to figure it out alone.",
  },
  {
    icon: "🔄",
    title: "Pattern Interruption",
    description:
      "Deep-rooted patterns live in the body. Somatic-informed techniques help you notice, interrupt, and rewire reactive cycles at the source.",
  },
  {
    icon: "🗣️",
    title: "Communication Mastery",
    description:
      "Learn to express needs clearly, listen without defensiveness, and have the conversations you've been avoiding — with skill and care.",
  },
  {
    icon: "🛡️",
    title: "Boundaries & Self-worth",
    description:
      "Understand why boundaries collapse — and rebuild them from a place of self-respect, not fear. Healthy limits are an act of love.",
  },
];

import { useLanguage } from "@/context/LanguageContext";

export default function ServicesSection({ title = "What We Work On" }: { title?: string }) {
  const { isRtl } = useLanguage();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

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

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
              whileHover={{ y: -4 }}
              className="bg-white rounded-2xl p-7 border border-[#e5e0d8] hover:border-[#0d7377]/30 hover:shadow-lg transition-all duration-300 group"
            >
              <span className="text-3xl mb-4 block">{s.icon}</span>
              <h3
                className="text-lg text-[#1a1a2e] mb-3 group-hover:text-[#0d7377] transition-colors"
                style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontWeight: 500 }}
              >
                {s.title}
              </h3>
              <p className="text-sm text-[#6b7280] leading-relaxed">
                {s.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
