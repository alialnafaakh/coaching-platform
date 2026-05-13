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

export default function TestimonialsSection({ title = "Stories of Change" }: { title?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="testimonials" ref={ref} className="py-28 px-6 bg-[#faf9f6]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            className="text-xs uppercase tracking-widest text-[#0d7377] font-medium mb-4"
          >
            {title}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl text-[#1a1a2e]"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
          >
            What clients say
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: 0.1 + i * 0.15 }}
              className="bg-white rounded-2xl p-7 border border-[#e5e0d8] flex flex-col gap-5 hover:shadow-md transition-shadow duration-300"
            >
              {/* Stars */}
              <div className="flex gap-0.5">
                {Array.from({ length: t.stars }).map((_, idx) => (
                  <span key={idx} className="text-[#d4a843] text-sm">★</span>
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-sm text-[#374151] leading-relaxed flex-1">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3 pt-2 border-t border-[#f3f0ea]">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #0d7377, #d4a843)" }}
                >
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1a1a2e]">{t.name}</p>
                  <p className="text-xs text-[#9ca3af]">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
