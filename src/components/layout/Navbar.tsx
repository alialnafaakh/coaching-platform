"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

import { useLanguage } from "@/context/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Navbar({ siteName = "Maryem" }: { siteName?: string }) {
  const { isRtl, t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "#about", label: t("about") },
    { href: "#services", label: t("services") },
    { href: "#testimonials", label: t("testimonials") },
    { href: "#pricing", label: t("pricing") },
  ];

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-md shadow-sm border-b border-[#e5e0d8]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
            style={{ background: "linear-gradient(135deg, #0d7377, #d4a843)" }}
          >
            {siteName.charAt(0)}
          </span>
          <span
            className={`font-display text-xl text-[#1a1a2e] tracking-wide ${isRtl ? "font-arabic-display" : ""}`}
            style={{ fontFamily: isRtl ? undefined : "Cormorant Garamond, Georgia, serif" }}
          >
            {siteName}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-[#6b7280] hover:text-[#0d7377] transition-colors duration-200"
            >
              {l.label}
            </a>
          ))}
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link
              href="/book"
              className="px-5 py-2 rounded-full text-sm font-medium text-white transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
            >
              {t("book_session")} {isRtl ? "←" : "→"}
            </Link>
          </div>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-[#1a1a2e]"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <div className="w-5 space-y-1">
            <span
              className={`block h-0.5 bg-current transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-1.5" : ""}`}
            />
            <span
              className={`block h-0.5 bg-current transition-all duration-300 ${menuOpen ? "opacity-0" : ""}`}
            />
            <span
              className={`block h-0.5 bg-current transition-all duration-300 ${menuOpen ? "-rotate-45 -translate-y-1.5" : ""}`}
            />
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-[#e5e0d8] overflow-hidden"
          >
            <div className="px-6 py-4 flex flex-col gap-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-[#6b7280] uppercase tracking-wider">Language / اللغة</span>
                <LanguageSwitcher />
              </div>
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="text-sm font-medium text-[#6b7280] hover:text-[#0d7377] transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  {l.label}
                </a>
              ))}
              <Link
                href="/book"
                onClick={() => setMenuOpen(false)}
                className="w-full text-center px-5 py-2 rounded-full text-sm font-medium text-white"
                style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
              >
                {t("book_session")} {isRtl ? "←" : "→"}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
