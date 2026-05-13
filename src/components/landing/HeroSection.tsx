"use client";

import { motion, type Variants } from "framer-motion";
import Link from "next/link";

const floatingOrb: Variants = {
  animate: {
    y: [0, -20, 0],
    scale: [1, 1.05, 1],
    transition: { duration: 6, repeat: Infinity, ease: "easeInOut" as const },
  },
};

export default function HeroSection({ content, availability = "Accepting New Clients" }: { content?: any; availability?: string }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#faf9f6]">
      {/* Ambient background orbs */}
      <motion.div
        variants={floatingOrb}
        animate="animate"
        className="absolute top-20 right-10 w-80 h-80 rounded-full blur-3xl opacity-20"
        style={{ background: "radial-gradient(circle, #0d7377, transparent)" }}
      />
      <motion.div
        variants={floatingOrb}
        animate="animate"
        style={{
          background: "radial-gradient(circle, #d4a843, transparent)",
          animationDelay: "3s",
        }}
        className="absolute bottom-20 left-10 w-64 h-64 rounded-full blur-3xl opacity-15"
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center pt-24 pb-16">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full bg-[#0d7377]/8 border border-[#0d7377]/20"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#0d7377] animate-pulse" />
          <span className="text-xs font-medium text-[#0d7377] tracking-wider uppercase">
            {availability}
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="text-5xl md:text-7xl leading-tight mb-6 text-[#1a1a2e]"
          style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontWeight: 400 }}
        >
          {content?.headline?.split(content?.highlight || "")[0] || "Heal the patterns. "}
          <em
            className="not-italic"
            style={{
              background: "linear-gradient(135deg, #0d7377, #d4a843)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {content?.highlight || "Deepen the bond."}
          </em>
          {content?.headline?.split(content?.highlight || "")[1] || ""}
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="text-lg md:text-xl text-[#6b7280] max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          {content?.subheadline || "Biopsychosocial coaching that weaves your biology, your story, and your social world into lasting, compassionate change — in yourself and your relationships."}
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/book"
            className="px-8 py-4 rounded-full text-base font-medium text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
            style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
          >
            Book Your Session — $50
          </Link>
          <a
            href="#about"
            className="px-8 py-4 rounded-full text-base font-medium text-[#0d7377] border border-[#0d7377]/30 hover:bg-[#0d7377]/5 transition-all duration-200"
          >
            Learn More ↓
          </a>
        </motion.div>

      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z"
            fill="#f0ede6"
            opacity="0.6"
          />
        </svg>
      </div>
    </section>
  );
}
