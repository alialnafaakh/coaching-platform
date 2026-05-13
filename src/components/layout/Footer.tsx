import Link from "next/link";

export default function Footer({ siteName = "Maryem" }: { siteName?: string }) {
  return (
    <footer className="bg-[#1a1a2e] text-white py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div>
            <p
              className="text-2xl mb-2"
              style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
            >
              {siteName}
            </p>
            <p className="text-sm text-white/50 max-w-xs">
              Biopsychosocial Relationship Coaching — where science meets the
              heart.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-widest text-white/40 mb-1">
              Navigate
            </p>
            {["#about", "#services", "#testimonials", "#pricing"].map((href) => (
              <a
                key={href}
                href={href}
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                {href.replace("#", "").charAt(0).toUpperCase() +
                  href.replace("#", "").slice(1)}
              </a>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-widest text-white/40 mb-1">
              Contact
            </p>
            <a
              href="mailto:hello@maryemcoaching.com"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              hello@maryemcoaching.com
            </a>
            <Link
              href="/book"
              className="mt-2 inline-block px-5 py-2 rounded-full text-sm font-medium text-white text-center"
              style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
            >
              Book a Session →
            </Link>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-white/30">
          <p>© {new Date().getFullYear()} {siteName}. All rights reserved.</p>
          <Link href="/admin" className="hover:text-white/60 transition-colors">
            Admin ↗
          </Link>
        </div>
      </div>
    </footer>
  );
}
