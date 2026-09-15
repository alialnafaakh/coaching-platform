"use client";

import { useLanguage } from "@/context/LanguageContext";

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className="flex items-center gap-0.5 bg-[#f0ede6] p-1 rounded-full border border-[#e5e0d8]"
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`min-w-[40px] min-h-[36px] px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
          lang === "en"
            ? "bg-[#0d7377] text-white shadow-sm"
            : "text-[#6b7280] hover:text-[#1a1a2e]"
        }`}
        aria-pressed={lang === "en"}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("ar")}
        className={`min-w-[40px] min-h-[36px] px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
          lang === "ar"
            ? "bg-[#0d7377] text-white shadow-sm"
            : "text-[#6b7280] hover:text-[#1a1a2e]"
        }`}
        aria-pressed={lang === "ar"}
      >
        AR
      </button>
    </div>
  );
}
