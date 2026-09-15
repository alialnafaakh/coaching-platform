"use client";

import { motion, useInView, type Variants } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.15, ease: "easeOut" as const },
  }),
};

function formatAverage(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export default function AboutSection({ content }: { content?: any }) {
  const { isRtl, t } = useLanguage();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);

  const tags = t("tags");
  const imageAlt =
    typeof content?.imageAlt === "string" && content.imageAlt.trim()
      ? content.imageAlt.trim()
      : isRtl
        ? "مريم — كوتش علاقات بيولوجية نفسية اجتماعية"
        : "Maryem — biopsychosocial relationship coach";

  useEffect(() => {
    let cancelled = false;
    fetch("/api/reviews/public")
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (!r.ok) {
          setAverageRating(null);
          setReviewCount(0);
          return;
        }
        const avg =
          typeof d.average_rating === "number" && Number.isFinite(d.average_rating)
            ? d.average_rating
            : null;
        const count =
          typeof d.review_count === "number" && d.review_count > 0 ? d.review_count : 0;
        setAverageRating(avg);
        setReviewCount(count);
      })
      .catch(() => {
        if (!cancelled) {
          setAverageRating(null);
          setReviewCount(0);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ratingBadge =
    averageRating != null && reviewCount > 0 ? (
      <p className={`text-xs font-medium leading-snug ${isRtl ? "font-arabic" : ""}`}>
        ★ {formatAverage(averageRating)} · {t("client_rating")}
      </p>
    ) : (
      <p className={`text-xs font-medium leading-snug ${isRtl ? "font-arabic" : ""}`}>
        {t("client_loved")}
      </p>
    );

  return (
    <section id="about" ref={ref} className="py-28 px-6 bg-[#f0ede6] overflow-x-hidden">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        {/* Image / visual block */}
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="relative w-full min-w-0"
        >
          <div
            className="aspect-[4/5] rounded-3xl overflow-hidden"
            style={{
              background:
                "linear-gradient(160deg, #0d7377 0%, #14a3a8 50%, #d4a843 100%)",
            }}
          >
            {content?.imageUrl ? (
              <img
                src={content.imageUrl}
                alt={imageAlt}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className={`w-full h-full flex items-end p-8 ${
                  isRtl ? "text-right" : "text-left"
                }`}
              >
                <div className="text-white">
                  <p
                    className={`text-6xl mb-2 ${isRtl ? "font-arabic-display" : ""}`}
                    style={{
                      fontFamily: isRtl ? undefined : "Cormorant Garamond, Georgia, serif",
                    }}
                  >
                    {isRtl ? "م." : "M."}
                  </p>
                  <p className={`text-white/70 text-sm ${isRtl ? "font-arabic" : ""}`}>
                    {isRtl
                      ? "كوتش معتمدة · ممارسة بيولوجية نفسية اجتماعية"
                      : "Certified Coach · BPS Practitioner"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Desktop: floating cards */}
          <motion.div
            initial={{ opacity: 0, x: isRtl ? -40 : 40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.5 }}
            className={`hidden md:block absolute ${
              isRtl ? "-left-6" : "-right-6"
            } top-12 bg-white rounded-2xl p-5 shadow-xl max-w-[200px] ${
              isRtl ? "text-right" : "text-left"
            }`}
          >
            <p className={`text-3xl font-semibold text-[#0d7377] ${isRtl ? "font-arabic" : ""}`}>
              {content?.statValue?.trim() || (isRtl ? "+200" : "200+")}
            </p>
            <p
              className={`text-xs text-[#6b7280] mt-0.5 leading-snug break-words ${
                isRtl ? "font-arabic" : ""
              }`}
            >
              {content?.statLabel?.trim() || t("lives_transformed")}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: isRtl ? 30 : -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.65 }}
            className={`hidden md:block absolute ${
              isRtl ? "-right-4" : "-left-4"
            } bottom-16 bg-[#1a1a2e] text-white rounded-2xl px-4 py-3 shadow-xl max-w-[220px] ${
              isRtl ? "text-right" : "text-left"
            }`}
          >
            {ratingBadge}
          </motion.div>

          {/* Mobile: stack badges under image — no negative offsets */}
          <div className="md:hidden mt-4 flex flex-col gap-3">
            <div
              className={`bg-white rounded-2xl p-4 shadow-sm border border-[#e5e0d8] ${
                isRtl ? "text-right" : "text-left"
              }`}
            >
              <p className={`text-2xl font-semibold text-[#0d7377] ${isRtl ? "font-arabic" : ""}`}>
                {content?.statValue?.trim() || (isRtl ? "+200" : "200+")}
              </p>
              <p
                className={`text-xs text-[#6b7280] mt-1 leading-snug break-words ${
                  isRtl ? "font-arabic" : ""
                }`}
              >
                {content?.statLabel?.trim() || t("lives_transformed")}
              </p>
            </div>
            <div
              className={`bg-[#1a1a2e] text-white rounded-2xl px-4 py-3.5 shadow-sm flex items-center ${
                isRtl ? "text-right justify-end" : "text-left"
              }`}
            >
              {ratingBadge}
            </div>
          </div>
        </motion.div>

        {/* Text */}
        <div className={isRtl ? "text-right" : "text-left"}>
          <motion.p
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className={`text-xs uppercase tracking-widest text-[#0d7377] font-medium mb-4 ${
              isRtl ? "font-arabic" : ""
            }`}
          >
            {t("about_maryem")}
          </motion.p>

          <motion.h2
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className={`text-4xl md:text-5xl text-[#1a1a2e] mb-6 leading-tight ${
              isRtl ? "font-arabic-display" : ""
            }`}
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
            className={`text-[#6b7280] text-base leading-relaxed mb-5 ${
              isRtl ? "font-arabic" : ""
            }`}
          >
            {content?.text1 || ""}
          </motion.p>

          <motion.p
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className={`text-[#6b7280] text-base leading-relaxed mb-8 ${
              isRtl ? "font-arabic" : ""
            }`}
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
                className={`px-3 py-1.5 rounded-full text-xs font-medium text-[#0d7377] bg-[#0d7377]/8 border border-[#0d7377]/20 ${
                  isRtl ? "font-arabic" : ""
                }`}
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
