"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { href: "/admin", label: "📊 Overview" },
  { href: "/admin/slots", label: "🗓 Booking Times" },
  { href: "/admin/appointments", label: "📋 Appointments" },
  { href: "/admin/settings", label: "⚙️ Consultation Settings" },
  { href: "/admin/content", label: "📝 Edit Content" },
  { href: "/admin/reviews", label: "⭐ Reviews" },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`px-3 py-2.5 rounded-xl text-sm transition-colors ${
              active
                ? "bg-white/15 text-white"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="px-2">
      <p
        className="text-xl mb-0.5"
        style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
      >
        Maryem
      </p>
      <p className="text-xs text-white/40">Admin Dashboard</p>
    </div>
  );
}

function SignOutLink({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <a
      href="/api/auth/signout"
      onClick={onNavigate}
      className="block px-3 py-2.5 rounded-xl text-xs text-white/40 hover:text-white/70 transition-colors"
    >
      Sign out ↗
    </a>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change (covers programmatic navigation too).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while mobile drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      {/* Desktop sidebar — same visual as before */}
      <aside className="hidden lg:flex w-56 bg-[#1a1a2e] text-white flex-col py-8 px-4 fixed inset-y-0 left-0 z-40">
        <div className="mb-10">
          <Brand />
        </div>
        <NavLinks />
        <div className="mt-auto">
          <SignOutLink />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header
        className="lg:hidden sticky top-0 z-40 bg-[#1a1a2e] text-white border-b border-white/10"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <button
            type="button"
            aria-label="Open admin menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 hover:bg-white/15"
          >
            <span className="sr-only">Menu</span>
            <span className="flex flex-col gap-1.5" aria-hidden>
              <span className="block w-5 h-0.5 bg-white rounded-full" />
              <span className="block w-5 h-0.5 bg-white rounded-full" />
              <span className="block w-5 h-0.5 bg-white rounded-full" />
            </span>
          </button>
          <div className="text-center min-w-0 flex-1">
            <p
              className="text-lg leading-tight truncate"
              style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
            >
              Maryem
            </p>
            <p className="text-[11px] text-white/45">Admin</p>
          </div>
          <div className="w-10" aria-hidden />
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {open && (
        <button
          type="button"
          aria-label="Close menu overlay"
          className="lg:hidden fixed inset-0 z-50 bg-black/45"
          onClick={close}
        />
      )}

      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-[min(18rem,85vw)] max-w-full bg-[#1a1a2e] text-white flex flex-col py-6 px-4 shadow-2xl transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
        style={{ paddingTop: "max(1.5rem, env(safe-area-inset-top))" }}
        aria-hidden={!open}
      >
        <div className="flex items-start justify-between gap-3 mb-8">
          <Brand />
          <button
            type="button"
            aria-label="Close admin menu"
            onClick={close}
            className="w-9 h-9 rounded-xl bg-white/10 text-white/80 hover:bg-white/15 text-lg leading-none"
          >
            ×
          </button>
        </div>
        <NavLinks onNavigate={close} />
        <div className="mt-auto pt-6">
          <SignOutLink onNavigate={close} />
        </div>
      </aside>

      {/* Main content: full viewport width; desktop offset via padding (not margin+w-full) */}
      <main className="min-w-0 w-full max-w-full overflow-x-hidden lg:pl-56">
        <div
          className="min-w-0 w-full max-w-full px-4 py-5 sm:px-6 sm:py-6 lg:p-8"
          style={{
            paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
