"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import { useLanguage } from "@/context/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Navbar({ siteName }: { siteName?: string }) {
  const { isRtl, t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "/#about", label: t("about") },
    { href: "/#services", label: t("services") },
    { href: "/#testimonials", label: t("testimonials") },
    { href: "/#pricing", label: t("pricing") },
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
      <div
        className={`max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 min-w-0`}
      >
        {/* Logo — start side in LTR/RTL */}
        <Link
          href="/"
          onClick={(event) => {
            setMenuOpen(false);
            if (pathname === "/" && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
              event.preventDefault();
              router.replace("/", { scroll: false });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          className={`flex items-center gap-2 group min-w-0 shrink-0`}
        >
          <Image
            src="/brand/maryem-logo.webp"
            alt=""
            width={40}
            height={40}
            sizes="40px"
            priority
            className="w-10 h-10 object-contain rounded-full flex-shrink-0"
          />
          <span
            className={`font-display text-xl text-[#1a1a2e] tracking-wide ${isRtl ? "font-arabic-display" : ""}`}
            style={{ fontFamily: isRtl ? undefined : "Cormorant Garamond, Georgia, serif" }}
          >
            {siteName ?? (isRtl ? "مريم" : "Maryem")}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav
          className={`hidden lg:flex items-center gap-8`}
        >
          <div className={`flex items-center gap-8`}>
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-sm font-medium text-[#6b7280] hover:text-[#0d7377] transition-colors duration-200 whitespace-nowrap ${isRtl ? "font-arabic" : ""}`}
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className={`flex items-center gap-4`}>
            <LanguageSwitcher />
            <Link
              href="/book"
              className={`px-5 py-2 rounded-full text-sm font-medium text-white transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95 whitespace-nowrap ${isRtl ? "font-arabic" : ""}`}
              style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
            >
              {t("book_session")} {isRtl ? "←" : "→"}
            </Link>
          </div>
        </nav>

        {/* Mobile: language always visible + hamburger (≥44px) */}
        <div
          className={`lg:hidden flex items-center gap-1.5 flex-shrink-0`}
        >
          <LanguageSwitcher />
          <button
            type="button"
            className="inline-flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl text-[#1a1a2e] hover:bg-[#f0ede6]/80"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={isRtl ? (menuOpen ? "إغلاق القائمة" : "فتح القائمة") : (menuOpen ? "Close menu" : "Open menu")}
            aria-controls={menuOpen ? "mobile-navigation" : undefined}
            aria-expanded={menuOpen}
          >
            <div className="w-5 space-y-1.5" aria-hidden>
              <span
                className={`block h-0.5 bg-current transition-all duration-300 origin-center ${
                  menuOpen ? "rotate-45 translate-y-2" : ""
                }`}
              />
              <span
                className={`block h-0.5 bg-current transition-all duration-300 ${
                  menuOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`block h-0.5 bg-current transition-all duration-300 origin-center ${
                  menuOpen ? "-rotate-45 -translate-y-2" : ""
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            id="mobile-navigation"
            className="lg:hidden bg-white border-b border-[#e5e0d8] overflow-hidden"
          >
            <div
              className={`px-4 sm:px-6 py-4 flex flex-col gap-1 ${
                isRtl ? "text-right" : "text-left"
              }`}
            >
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`min-h-[44px] flex items-center text-sm font-medium text-[#6b7280] hover:text-[#0d7377] transition-colors ${isRtl ? "font-arabic" : ""}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href="/book"
                onClick={() => setMenuOpen(false)}
                className={`w-full text-center mt-2 px-5 py-3 min-h-[44px] rounded-full text-sm font-medium text-white ${isRtl ? "font-arabic" : ""}`}
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
