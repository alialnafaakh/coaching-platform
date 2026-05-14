"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function CTASection() {
  const { isRtl, t } = useLanguage();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-28 px-6 bg-[#1a1a2e] overflow-hidden relative">
      {/* Background orbs */}
      <div
        className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl opacity-20"
        style={{ background: "radial-gradient(circle, #0d7377, transparent)" }}
      />
      <div
        className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full blur-3xl opacity-15"
        style={{ background: "radial-gradient(circle, #d4a843, transparent)" }}
      />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          className="text-xs uppercase tracking-widest text-[#d4a843] font-medium mb-6"
        >
          {t("cta_eyebrow")}
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1 }}
          className={`text-4xl md:text-6xl text-white mb-6 leading-tight ${isRtl ? "font-arabic-display" : ""}`}
          style={{ fontFamily: isRtl ? undefined : "Cormorant Garamond, Georgia, serif" }}
        >
          {t("cta_headline")}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-white/60 text-base mb-10 max-w-xl mx-auto"
        >
          {t("cta_subheadline")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Link
            href="/book"
            className="inline-block px-10 py-5 rounded-full text-base font-medium text-white shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200"
            style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
          >
            {t("book_now")} {isRtl ? "←" : "→"}
          </Link>

          <p className="mt-5 text-xs text-white/30">
            {t("cta_footer")}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
