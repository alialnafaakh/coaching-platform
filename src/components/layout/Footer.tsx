import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

const InstagramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

const TikTokIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
  </svg>
);

export default function Footer({ siteName = "Maryem" }: { siteName?: string }) {
  const { isRtl, t } = useLanguage();

  const links = [
    { href: "#about", label: t("about") },
    { href: "#services", label: t("services") },
    { href: "#testimonials", label: t("testimonials") },
    { href: "#pricing", label: t("pricing") },
  ];

  const socialLinks = isRtl
    ? [
        {
          href: "https://www.instagram.com/all_love_to_me",
          icon: <InstagramIcon />,
          label: "إنستغرام",
          handle: "all_love_to_me",
          hoverColor: "hover:text-pink-400",
        },
        {
          href: "https://www.tiktok.com/@all_love_to_me",
          icon: <TikTokIcon />,
          label: "تيك توك",
          handle: "all_love_to_me",
          hoverColor: "hover:text-cyan-400",
        },
      ]
    : [
        {
          href: "https://www.instagram.com/evolvere.elegantly",
          icon: <InstagramIcon />,
          label: "Instagram",
          handle: "evolvere.elegantly",
          hoverColor: "hover:text-pink-400",
        },
      ];

  return (
    <footer className="bg-[#1a1a2e] text-white py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className={`flex flex-col md:flex-row justify-between items-start gap-8 ${isRtl ? "md:flex-row-reverse text-right" : "text-left"}`}>
          {/* Brand */}
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

            {/* Social Media Icons */}
            <div className={`mt-5 flex gap-3 ${isRtl ? "flex-row-reverse" : ""}`}>
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  title={`@${social.handle}`}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 ${social.hoverColor} hover:bg-white/10 hover:border-white/20 transition-all duration-300`}
                >
                  <span className="transition-transform duration-300 group-hover:scale-110">
                    {social.icon}
                  </span>
                  <span className={`text-xs font-medium ${isRtl ? "font-arabic" : ""}`}>
                    {social.label}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Navigation */}
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

          {/* Legal */}
          <div className="flex flex-col gap-2">
            <p className={`text-xs uppercase tracking-widest text-white/40 mb-1 ${isRtl ? "font-arabic" : ""}`}>
              {isRtl ? "القانونية" : "Legal"}
            </p>
            <Link href="/policies#payment" className={`text-sm text-white/60 hover:text-white transition-colors ${isRtl ? "font-arabic" : ""}`}>
              {isRtl ? "سياسة الدفع" : "Payment Policy"}
            </Link>
            <Link href="/policies#cancellation" className={`text-sm text-white/60 hover:text-white transition-colors ${isRtl ? "font-arabic" : ""}`}>
              {isRtl ? "سياسة الإلغاء والاسترداد" : "Cancellation Policy"}
            </Link>
            <Link href="/policies#privacy" className={`text-sm text-white/60 hover:text-white transition-colors ${isRtl ? "font-arabic" : ""}`}>
              {isRtl ? "سياسة الخصوصية" : "Privacy Policy"}
            </Link>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-2">
            <p className={`text-xs uppercase tracking-widest text-white/40 mb-1 ${isRtl ? "font-arabic" : ""}`}>
              {t("contact")}
            </p>
            <a
              href="mailto:biopsychosocial.site@gmail.com"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              biopsychosocial.site@gmail.com
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

        {/* Bottom Bar */}
        <div className={`mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/30 ${isRtl ? "md:flex-row-reverse" : ""}`}>
          <p className={isRtl ? "font-arabic" : ""}>© {new Date().getFullYear()} {siteName}. {t("all_rights")}</p>

          {/* Social handles in bottom bar */}
          <div className={`flex items-center gap-4 ${isRtl ? "flex-row-reverse" : ""}`}>
            {socialLinks.map((social) => (
              <a
                key={social.label + "-bottom"}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-1.5 hover:text-white/60 transition-colors ${social.hoverColor}`}
              >
                <span className="w-3.5 h-3.5">{social.icon}</span>
                <span>@{social.handle}</span>
              </a>
            ))}
          </div>

          <div className={`flex items-center gap-3 ${isRtl ? "flex-row-reverse" : ""}`}>
            <Link href="/policies" className={`hover:text-white/60 transition-colors ${isRtl ? "font-arabic" : ""}`}>
              {isRtl ? "السياسات" : "Policies"}
            </Link>
            <span className="text-white/10">·</span>
            <Link href="/admin" className={`hover:text-white/60 transition-colors flex items-center gap-1 ${isRtl ? "font-arabic" : ""}`}>
              {t("admin")} {isRtl ? "↖" : "↗"}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

