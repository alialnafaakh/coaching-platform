"use client";

import { motion, useInView, type Variants } from "framer-motion";
import { useRef } from "react";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.15, ease: "easeOut" as const },
  }),
};

import { useLanguage } from "@/context/LanguageContext";

export default function AboutSection({ content }: { content?: any }) {
  const { isRtl, t } = useLanguage();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  const tags = t("tags") as unknown as string[];

  return (
    <section id="about" ref={ref} className="py-28 px-6 bg-[#f0ede6]">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        {/* Image / visual block */}
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="relative"
        >
          <div
            className="aspect-[4/5] rounded-3xl overflow-hidden"
            style={{
              background:
                "linear-gradient(160deg, #0d7377 0%, #14a3a8 50%, #d4a843 100%)",
            }}
          >
            {content?.imageUrl ? (
              <img src={content.imageUrl} alt="About Maryem" className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full flex items-end p-8 ${isRtl ? "text-right" : "text-left"}`}>
                <div className="text-white">
                  <p
                    className={`text-6xl mb-2 ${isRtl ? "font-arabic-display" : ""}`}
                    style={{ fontFamily: isRtl ? undefined : "Cormorant Garamond, Georgia, serif" }}
                  >
                    {isRtl ? "م." : "M."}
                  </p>
                  <p className={`text-white/70 text-sm ${isRtl ? "font-arabic" : ""}`}>
                    {isRtl ? "كوتش معتمدة · ممارسة بيولوجية نفسية اجتماعية" : "Certified Coach · BPS Practitioner"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Floating credential card */}
          <motion.div
            initial={{ opacity: 0, x: isRtl ? -40 : 40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.5 }}
            className={`absolute ${isRtl ? "-left-6" : "-right-6"} top-12 bg-white rounded-2xl p-5 shadow-xl max-w-[180px] ${isRtl ? "text-right" : "text-left"}`}
          >
            <p className={`text-3xl font-semibold text-[#0d7377] ${isRtl ? "font-arabic" : ""}`}>
              {isRtl ? "+200" : "200+"}
            </p>
            <p className={`text-xs text-[#6b7280] mt-0.5 ${isRtl ? "font-arabic" : ""}`}>
              {t("lives_transformed")}
            </p>
          </motion.div>

          {/* Floating badge */}
          <motion.div
            initial={{ opacity: 0, x: isRtl ? 30 : -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.65 }}
            className={`absolute ${isRtl ? "-right-4" : "-left-4"} bottom-16 bg-[#1a1a2e] text-white rounded-2xl px-4 py-3 shadow-xl ${isRtl ? "text-right" : "text-left"}`}
          >
            <p className={`text-xs font-medium ${isRtl ? "font-arabic" : ""}`}>
              {isRtl ? "⭐ 5.0 · متوسط تقييم العملاء" : `⭐ 5.0 · ${t("client_rating")}`}
            </p>
          </motion.div>
        </motion.div>

        {/* Text */}
        <div className={isRtl ? "text-right" : "text-left"}>
          <motion.p
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className={`text-xs uppercase tracking-widest text-[#0d7377] font-medium mb-4 ${isRtl ? "font-arabic" : ""}`}
          >
            {t("about_maryem")}
          </motion.p>

          <motion.h2
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className={`text-4xl md:text-5xl text-[#1a1a2e] mb-6 leading-tight ${isRtl ? "font-arabic-display" : ""}`}
            style={{ fontFamily: isRtl ? undefined : "Cormorant Garamond, Georgia, serif" }}
          >
            {t("about_headline").split(t("about_highlight"))[0]}
            <span
              style={{
                background: "linear-gradient(135deg, #0d7377, #d4a843)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {t("about_highlight")}
            </span>
            {t("about_headline").split(t("about_highlight"))[1]}
          </motion.h2>

          <motion.p
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className={`text-[#6b7280] text-base leading-relaxed mb-5 ${isRtl ? "font-arabic" : ""}`}
          >
            {content?.text1 || ""}
          </motion.p>

          <motion.p
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className={`text-[#6b7280] text-base leading-relaxed mb-8 ${isRtl ? "font-arabic" : ""}`}
          >
            {content?.text2 || ""}
          </motion.p>

          <motion.div
            custom={5}
            variants={fadeUp}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className={`flex flex-wrap gap-3 ${isRtl ? "justify-end" : "justify-start"}`}
          >
            {tags.map((tag) => (
              <span
                key={tag}
                className={`px-3 py-1.5 rounded-full text-xs font-medium text-[#0d7377] bg-[#0d7377]/8 border border-[#0d7377]/20 ${isRtl ? "font-arabic" : ""}`}
              >
                {tag}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
