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

export default function AboutSection({ content }: { content?: any }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

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
              <div className="w-full h-full flex items-end p-8">
                <div className="text-white">
                  <p
                    className="text-6xl mb-2"
                    style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
                  >
                    M.
                  </p>
                  <p className="text-white/70 text-sm">Certified Coach · BPS Practitioner</p>
                </div>
              </div>
            )}
          </div>

          {/* Floating credential card */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="absolute -right-6 top-12 bg-white rounded-2xl p-5 shadow-xl max-w-[180px]"
          >
            <p className="text-3xl font-semibold text-[#0d7377]">200+</p>
            <p className="text-xs text-[#6b7280] mt-0.5">
              lives transformed through compassionate coaching
            </p>
          </motion.div>

          {/* Floating badge */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.65 }}
            className="absolute -left-4 bottom-16 bg-[#1a1a2e] text-white rounded-2xl px-4 py-3 shadow-xl"
          >
            <p className="text-xs font-medium">⭐ 5.0 · Avg. client rating</p>
          </motion.div>
        </motion.div>

        {/* Text */}
        <div>
          <motion.p
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className="text-xs uppercase tracking-widest text-[#0d7377] font-medium mb-4"
          >
            About Maryem
          </motion.p>

          <motion.h2
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className="text-4xl md:text-5xl text-[#1a1a2e] mb-6 leading-tight"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
          >
            Relationships are{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #0d7377, #d4a843)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              biological,
            </span>{" "}
            psychological, and social — all at once.
          </motion.h2>

          <motion.p
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className="text-[#6b7280] text-base leading-relaxed mb-5"
          >
            {content?.text1 || "My work is grounded in the biopsychosocial model — the understanding that our nervous system, our childhood story, and our cultural context all shape the way we love, attach, and repair."}
          </motion.p>

          <motion.p
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className="text-[#6b7280] text-base leading-relaxed mb-8"
          >
            {content?.text2 || "I am a certified relationship coach trained in attachment theory, somatic awareness, and systemic family dynamics. My sessions are a safe, non-judgmental space where real change begins."}
          </motion.p>

          <motion.div
            custom={5}
            variants={fadeUp}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className="flex flex-wrap gap-3"
          >
            {[
              "Attachment Theory",
              "Somatic Coaching",
              "Systemic Therapy",
              "Emotion Regulation",
              "Communication",
            ].map((tag) => (
              <span
                key={tag}
                className="px-3 py-1.5 rounded-full text-xs font-medium text-[#0d7377] bg-[#0d7377]/8 border border-[#0d7377]/20"
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
