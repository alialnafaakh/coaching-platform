"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

interface Testimonial {
  name: string;
  role: string;
  date?: string;
  quote: string;
  stars: number;
}

export default function TestimonialsSection({ title = "Stories of Change" }: { title?: string }) {
  const { isRtl, t, lang } = useLanguage();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  // Load testimonials from saved content (API), fallback to language context defaults
  useEffect(() => {
    fetch("/api/content")
      .then((r) => r.json())
      .then((d) => {
        const saved = d?.content?.[lang]?.testimonials;
        if (saved && saved.length > 0) {
          setTestimonials(saved);
        } else {
          // Fallback to language context defaults
          const fallback = t("testimonials_data") as unknown as Testimonial[];
          setTestimonials(Array.isArray(fallback) ? fallback : []);
        }
      })
      .catch(() => {
        const fallback = t("testimonials_data") as unknown as Testimonial[];
        setTestimonials(Array.isArray(fallback) ? fallback : []);
      });
  }, [lang]);

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
          {testimonials.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: 0.1 + i * 0.15 }}
              className={`bg-white rounded-2xl p-7 border border-[#e5e0d8] flex flex-col gap-5 hover:shadow-md transition-shadow duration-300 ${isRtl ? "text-right" : "text-left"}`}
            >
              {/* Stars */}
              <div className={`flex gap-0.5 ${isRtl ? "flex-row-reverse" : "flex-row"}`}>
                {[1, 2, 3, 4, 5].map((idx) => (
                  <span
                    key={idx}
                    className="text-sm"
                    style={{ color: idx <= (item.stars ?? 5) ? "#d4a843" : "#e5e0d8" }}
                  >
                    ★
                  </span>
                ))}
              </div>

              {/* Quote */}
              <blockquote className={`text-sm text-[#374151] leading-relaxed flex-1 ${isRtl ? "font-arabic" : ""}`}>
                {isRtl ? "«" : "\u201c"}{item.quote}{isRtl ? "»" : "\u201d"}
              </blockquote>

              {/* Author + date */}
              <div className={`flex items-center gap-3 pt-2 border-t border-[#f3f0ea] ${isRtl ? "flex-row-reverse" : "flex-row"}`}>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #0d7377, #d4a843)" }}
                >
                  {item.name?.charAt(0) ?? "?"}
                </div>
                <div className={`flex-1 ${isRtl ? "text-right" : "text-left"}`}>
                  <p className={`text-sm font-medium text-[#1a1a2e] ${isRtl ? "font-arabic" : ""}`}>
                    {item.name}
                  </p>
                  <p className={`text-xs text-[#9ca3af] ${isRtl ? "font-arabic" : ""}`}>
                    {item.role}
                    {item.date ? ` · ${item.date}` : ""}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
