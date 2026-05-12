import Link from "next/link";

export default function AdminOverviewPage() {
  return (
    <div>
      <h1
        className="text-3xl text-[#1a1a2e] mb-2"
        style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
      >
        Overview
      </h1>
      <p className="text-sm text-[#6b7280] mb-10">
        Welcome back, Maryem. Manage your coaching schedule below.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <Link
          href="/admin/slots"
          className="bg-white rounded-2xl p-6 border border-[#e5e0d8] hover:border-[#0d7377]/30 hover:shadow-md transition-all group"
        >
          <p className="text-3xl mb-3">🗓</p>
          <p className="font-semibold text-[#1a1a2e] group-hover:text-[#0d7377] transition-colors">
            Manage Time Slots
          </p>
          <p className="text-sm text-[#9ca3af] mt-1">
            Add or remove available booking slots
          </p>
        </Link>

        <Link
          href="/admin/appointments"
          className="bg-white rounded-2xl p-6 border border-[#e5e0d8] hover:border-[#0d7377]/30 hover:shadow-md transition-all group"
        >
          <p className="text-3xl mb-3">📋</p>
          <p className="font-semibold text-[#1a1a2e] group-hover:text-[#0d7377] transition-colors">
            View Appointments
          </p>
          <p className="text-sm text-[#9ca3af] mt-1">
            See all bookings and manage them
          </p>
        </Link>
      </div>

      <div className="bg-[#0d7377]/6 rounded-2xl p-5 border border-[#0d7377]/15">
        <p className="text-sm font-medium text-[#0d7377] mb-1">💡 Quick Tip</p>
        <p className="text-sm text-[#6b7280]">
          Add time slots a few days in advance so clients can book. Clients can
          only book starting from tomorrow — same-day booking is disabled.
        </p>
      </div>
    </div>
  );
}
