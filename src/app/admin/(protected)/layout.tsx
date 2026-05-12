import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin Dashboard | Maryem Coaching",
  robots: { index: false, follow: false },
};

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/admin/login");
  }

  const navItems = [
    { href: "/admin", label: "📊 Overview" },
    { href: "/admin/slots", label: "🗓 Manage Slots" },
    { href: "/admin/appointments", label: "📋 Appointments" },
    { href: "/admin/content", label: "📝 Edit Content" },
  ];

  return (
    <div className="min-h-screen bg-[#f5f3ef] flex">
      {/* Sidebar */}
      <aside className="w-56 bg-[#1a1a2e] text-white flex flex-col py-8 px-4 fixed inset-y-0 left-0 z-40">
        <div className="mb-10 px-2">
          <p
            className="text-xl mb-0.5"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
          >
            Maryem
          </p>
          <p className="text-xs text-white/40">Admin Dashboard</p>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto">
          <a
            href="/api/auth/signout"
            className="block px-3 py-2.5 rounded-xl text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            Sign out ↗
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-56 flex-1 p-8">{children}</main>
    </div>
  );
}
