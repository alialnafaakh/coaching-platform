import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function Footer({ siteName = "Maryem" }: { siteName?: string }) {
  const { isRtl, t } = useLanguage();

  const links = [
    { href: "#about", label: t("about") },
    { href: "#services", label: t("services") },
    { href: "#testimonials", label: t("testimonials") },
    { href: "#pricing", label: t("pricing") },
  ];

  return (
    <footer className="bg-[#1a1a2e] text-white py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className={`flex flex-col md:flex-row justify-between items-start gap-8 ${isRtl ? "md:flex-row-reverse text-right" : "text-left"}`}>
          <div>
            <p
              className={`text-2xl mb-2 ${isRtl ? "font-arabic-display" : ""}`}
              style={{ fontFamily: isRtl ? undefined : "Cormorant Garamond, Georgia, serif" }}
            >
              {siteName}
            </p>
            <p className={`text-sm text-white/50 max-w-xs ${isRtl ? "font-arabic" : ""}`}>
              {isRtl 
                ? "الكوتشينج البيولوجي النفسي الاجتماعي — حيث يلتقي العلم بالقلب." 
                : "Biopsychosocial Relationship Coaching — where science meets the heart."}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <p className={`text-xs uppercase tracking-widest text-white/40 mb-1 ${isRtl ? "font-arabic" : ""}`}>
              {t("navigate")}
            </p>
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className={`text-sm text-white/60 hover:text-white transition-colors ${isRtl ? "font-arabic" : ""}`}
              >
                {l.label}
              </a>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <p className={`text-xs uppercase tracking-widest text-white/40 mb-1 ${isRtl ? "font-arabic" : ""}`}>
              {t("contact")}
            </p>
            <a
              href="mailto:hello@maryemcoaching.com"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              hello@maryemcoaching.com
            </a>
            <Link
              href="/book"
              className={`mt-2 inline-block px-5 py-2 rounded-full text-sm font-medium text-white text-center ${isRtl ? "font-arabic" : ""}`}
              style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
            >
              {t("book_session")} {isRtl ? "←" : "→"}
            </Link>
          </div>
        </div>

        <div className={`mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-white/30 ${isRtl ? "md:flex-row-reverse" : ""}`}>
          <p className={isRtl ? "font-arabic" : ""}>© {new Date().getFullYear()} {siteName}. {t("all_rights")}</p>
          <Link href="/admin" className={`hover:text-white/60 transition-colors flex items-center gap-1 ${isRtl ? "font-arabic" : ""}`}>
            {t("admin")} {isRtl ? "↖" : "↗"}
          </Link>
        </div>
      </div>
    </footer>
  );
}
