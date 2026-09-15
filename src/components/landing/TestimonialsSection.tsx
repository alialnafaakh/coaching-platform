"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

interface Testimonial {
  id?: string;
  name: string;
  role: string;
  date?: string;
  quote: string;
  stars?: number;
  verified?: boolean;
  featured?: boolean;
}

function StarRow({
  stars,
  isRtl,
  label,
}: {
  stars: number;
  isRtl: boolean;
  label: string;
}) {
  return (
    <div
      className={`flex gap-0.5 ${isRtl ? "flex-row-reverse" : "flex-row"}`}
      role="img"
      aria-label={label}
    >
      {[1, 2, 3, 4, 5].map((idx) => (
        <span
          key={idx}
          className="text-sm"
          aria-hidden
          style={{ color: idx <= stars ? "#d4a843" : "#e5e0d8" }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function ReviewCard({
  item,
  index,
  inView,
  isRtl,
  ratingLabel,
  verifiedLabel,
}: {
  item: Testimonial;
  index: number;
  inView: boolean;
  isRtl: boolean;
  ratingLabel: string;
  verifiedLabel: string;
}) {
  const starCount = item.stars ?? 5;
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay: 0.05 + Math.min(index, 8) * 0.08 }}
      className={`bg-white rounded-2xl p-7 border border-[#e5e0d8] flex flex-col gap-5 hover:shadow-md transition-shadow duration-300 ${
        isRtl ? "text-right" : "text-left"
      }`}
    >
      <div className={`flex flex-wrap items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}>
        <StarRow stars={starCount} isRtl={isRtl} label={ratingLabel} />
        {item.verified === true && (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide uppercase bg-[#0d7377]/10 text-[#0d7377] border border-[#0d7377]/20 ${
              isRtl ? "font-arabic normal-case tracking-normal" : ""
            }`}
          >
            {verifiedLabel}
          </span>
        )}
      </div>

      <blockquote className={`text-sm text-[#374151] leading-relaxed flex-1 ${isRtl ? "font-arabic" : ""}`}>
        {isRtl ? "«" : "\u201c"}
        {item.quote}
        {isRtl ? "»" : "\u201d"}
      </blockquote>

      <div
        className={`flex items-center gap-3 pt-2 border-t border-[#f3f0ea] ${
          isRtl ? "flex-row-reverse" : "flex-row"
        }`}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #0d7377, #d4a843)" }}
          aria-hidden
        >
          {item.name?.charAt(0) ?? "?"}
        </div>
        <div className={`flex-1 min-w-0 ${isRtl ? "text-right" : "text-left"}`}>
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
  );
}

export default function TestimonialsSection({
  title = "Stories of Change",
  curated,
}: {
  title?: string;
  /** CMS curated testimonials; undefined = use built-in fallback copy */
  curated?: Testimonial[];
}) {
  const { isRtl, t, lang } = useLanguage();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const [verified, setVerified] = useState<Testimonial[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const reviewsRes = await fetch(
          `/api/reviews/public?lang=${lang}&offset=0&limit=6`,
          { cache: "no-store" }
        );
        const reviewsData = await reviewsRes.json().catch(() => ({ reviews: [] }));
        const list: Testimonial[] = Array.isArray(reviewsData.reviews)
          ? reviewsData.reviews.map((r: Testimonial) => ({
              ...r,
              verified: true,
              featured: r.featured === true,
            }))
          : [];

        if (!cancelled) {
          setVerified(list);
          setOffset(list.length);
          setHasMore(reviewsData.has_more === true);
        }
      } catch {
        if (!cancelled) {
          setVerified([]);
          setHasMore(false);
          setOffset(0);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const loadMore = async () => {
    const requestLang = lang;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/reviews/public?lang=${requestLang}&offset=${offset}&limit=20`,
        { cache: "no-store" }
      );
      const data = await res.json();
      // Ignore stale responses if the site language changed mid-request.
      if (requestLang !== lang) return;
      const more: Testimonial[] = Array.isArray(data.reviews)
        ? data.reviews.map((r: Testimonial) => ({
            ...r,
            verified: true,
            featured: r.featured === true,
          }))
        : [];
      setVerified((prev) => {
        const seen = new Set(prev.map((p) => p.id).filter(Boolean));
        const merged = [...prev];
        for (const r of more) {
          if (r.id && seen.has(r.id)) continue;
          merged.push(r);
        }
        return merged;
      });
      setOffset((prev) => prev + more.length);
      setHasMore(data.has_more === true);
    } catch {
      /* keep current list */
    } finally {
      setLoadingMore(false);
    }
  };

  const curatedCards: Testimonial[] = (
    curated !== undefined ? curated : t("testimonials_data")
  ).map((c) => ({ ...c, verified: false, featured: false }));

  const showCurated = curatedCards.length > 0;
  const showVerified = verified.length > 0;

  return (
    <section id="testimonials" ref={ref} className="py-28 px-6 bg-[#faf9f6]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            className={`text-xs uppercase tracking-widest text-[#0d7377] font-medium mb-4 ${
              isRtl ? "font-arabic" : ""
            }`}
          >
            {title}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className={`text-4xl md:text-5xl text-[#1a1a2e] ${
              isRtl ? "font-arabic-display" : ""
            }`}
            style={{ fontFamily: isRtl ? undefined : "Cormorant Garamond, Georgia, serif" }}
          >
            {t("what_clients_say")}
          </motion.h2>
        </div>

        {showVerified && (
          <div className={`grid md:grid-cols-3 gap-6 ${isRtl ? "rtl" : "ltr"}`}>
            {verified.map((item, i) => {
              const starCount = item.stars ?? 5;
              const ratingLabel = t("rating_out_of")
                .replace("{n}", String(starCount))
                .replace("{max}", "5");
              return (
                <ReviewCard
                  key={item.id || `v-${i}`}
                  item={item}
                  index={i}
                  inView={inView}
                  isRtl={isRtl}
                  ratingLabel={ratingLabel}
                  verifiedLabel={t("verified_session")}
                />
              );
            })}
          </div>
        )}

        {hasMore && (
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className={`px-6 py-3 rounded-full text-sm font-medium text-[#0d7377] border border-[#0d7377]/30 hover:bg-[#0d7377]/5 transition-colors disabled:opacity-60 ${
                isRtl ? "font-arabic" : ""
              }`}
            >
              {loadingMore
                ? isRtl
                  ? "جاري التحميل..."
                  : "Loading..."
                : t("read_more_reviews")}
            </button>
          </div>
        )}

        {/* Curated marketing testimonials — never verified */}
        {showCurated && (
          <div className={`${showVerified ? "mt-14" : ""}`}>
            {showVerified && (
              <p
                className={`text-center text-xs uppercase tracking-widest text-[#9ca3af] mb-8 ${
                  isRtl ? "font-arabic" : ""
                }`}
              >
                {isRtl ? "قصص مختارة" : "Selected stories"}
              </p>
            )}
            <div className={`grid md:grid-cols-3 gap-6 ${isRtl ? "rtl" : "ltr"}`}>
              {curatedCards.map((item, i) => {
                const starCount = item.stars ?? 5;
                const ratingLabel = t("rating_out_of")
                  .replace("{n}", String(starCount))
                  .replace("{max}", "5");
                return (
                  <ReviewCard
                    key={`c-${item.name}-${i}`}
                    item={item}
                    index={i}
                    inView={inView}
                    isRtl={isRtl}
                    ratingLabel={ratingLabel}
                    verifiedLabel={t("verified_session")}
                  />
                );
              })}
            </div>
          </div>
        )}

        {!showVerified && !showCurated && (
          <p className={`text-center text-sm text-[#9ca3af] ${isRtl ? "font-arabic" : ""}`}>
            {isRtl ? "لا توجد مراجعات للعرض بعد." : "No reviews to show yet."}
          </p>
        )}
      </div>
    </section>
  );
}
