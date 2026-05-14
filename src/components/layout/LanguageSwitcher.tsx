"use client";

import { useLanguage } from "@/context/LanguageContext";
import { motion } from "framer-motion";

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex items-center gap-1 bg-[#f0ede6] p-1 rounded-full border border-[#e5e0d8]">
      <button
        onClick={() => setLang("en")}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
          lang === "en"
            ? "bg-[#0d7377] text-white shadow-sm"
            : "text-[#6b7280] hover:text-[#1a1a2e]"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLang("ar")}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
          lang === "ar"
            ? "bg-[#0d7377] text-white shadow-sm"
            : "text-[#6b7280] hover:text-[#1a1a2e]"
        }`}
      >
        AR
      </button>
    </div>
  );
}
