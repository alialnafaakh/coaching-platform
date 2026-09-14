"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Appointment } from "@/types";
import { motion } from "framer-motion";
import { canOpenConsultation } from "@/lib/consultationAccess";

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending_payment: "bg-amber-50 text-amber-700 border-amber-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  pending_qi_payment: "bg-amber-50 text-amber-700 border-amber-200",
  in_progress: "bg-sky-50 text-sky-700 border-sky-200",
  completed: "bg-slate-50 text-slate-600 border-slate-200",
  cancelled: "bg-red-50 text-red-500 border-red-200",
};

const PAYMENT_STYLES: Record<string, string> = {
  unpaid: "bg-amber-50 text-amber-700 border-amber-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-500 border-red-200",
};

function consultationLabel(status: string) {
  if (status === "in_progress") return "In progress";
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Not started";
  return "Scheduled";
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export default function AppointmentTable() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchAppts = () => {
    setLoading(true);
    fetch("/api/appointments")
      .then((r) => r.json())
      .then((d) => setAppointments(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAppts();
  }, []);

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this appointment and free the time slot?")) return;
    setCancelling(id);
    await fetch(`/api/appointments?id=${id}`, { method: "PATCH" });
    setCancelling(null);
    fetchAppts();
  };

  return (
    <div>
      <h1
        className="text-3xl text-[#1a1a2e] mb-2"
        style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
      >
        Appointments
      </h1>
      <p className="text-sm text-[#6b7280] mb-8">
        All client bookings. Cancel any appointment to free its time slot.
      </p>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-2xl animate-pulse border border-[#e5e0d8]" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-16 text-[#9ca3af] text-sm">No appointments yet.</div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt, i) => (
            <motion.div
              key={appt.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl p-5 border border-[#e5e0d8] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #0d7377, #d4a843)" }}
                >
                  {appt.client_name.charAt(0).toUpperCase()}
                </div>

                <div>
                  <p className="font-medium text-sm text-[#1a1a2e]">{appt.client_name}</p>
                  <p className="text-xs text-[#9ca3af]">{appt.client_email}</p>
                  {appt.time_slots && (
                    <p className="text-xs text-[#6b7280] mt-0.5">
                      {format(new Date(`${appt.time_slots.date}T00:00:00`), "MMM d, yyyy")} ·{" "}
                      {appt.time_slots.start_time.slice(0, 5)} – {appt.time_slots.end_time.slice(0, 5)}
                    </p>
                  )}
                  {(appt.session_duration_minutes != null || appt.final_price_usd != null) && (
                    <p className="text-xs text-[#0d7377] mt-0.5">
                      {appt.session_duration_minutes != null
                        ? `${appt.session_duration_minutes} min`
                        : null}
                      {appt.session_duration_minutes != null && appt.final_price_usd != null
                        ? " · "
                        : null}
                      {appt.final_price_usd != null
                        ? `$${Number(appt.final_price_usd).toFixed(
                            Number(appt.final_price_usd) % 1 === 0 ? 0 : 2
                          )}`
                        : null}
                      {appt.discount_percent != null && Number(appt.discount_percent) > 0
                        ? ` (${Number(appt.discount_percent)}% off)`
                        : null}
                    </p>
                  )}
                  {appt.notes && (
                    <p className="text-xs text-[#9ca3af] mt-1 italic max-w-xs truncate">
                      &ldquo;{appt.notes}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-end flex-shrink-0">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${
                    STATUS_STYLES[appt.status] ?? "bg-[#f0ede6] text-[#6b7280] border-[#e5e0d8]"
                  }`}
                >
                  {statusLabel(appt.status)}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${
                    PAYMENT_STYLES[appt.payment_status] ??
                    "bg-[#f0ede6] text-[#6b7280] border-[#e5e0d8]"
                  }`}
                >
                  {statusLabel(appt.payment_status || "unpaid")}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-medium border bg-[#faf9f6] text-[#6b7280] border-[#e5e0d8]">
                  {consultationLabel(appt.status)}
                </span>

                {canOpenConsultation(appt.status) ? (
                  <Link
                    href={`/admin/appointments/${appt.id}/consultation`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                    style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
                  >
                    Open consultation
                  </Link>
                ) : (
                  <span className="px-3 py-1.5 rounded-lg text-xs text-[#9ca3af] border border-[#e5e0d8] bg-[#faf9f6]">
                    {appt.status === "pending_payment"
                      ? "Awaiting payment"
                      : appt.status === "completed"
                        ? "Ended"
                        : "Unavailable"}
                  </span>
                )}

                {appt.status !== "cancelled" && appt.status !== "completed" && (
                  <button
                    onClick={() => handleCancel(appt.id)}
                    disabled={cancelling === appt.id}
                    className="px-3 py-1.5 rounded-lg text-xs text-red-500 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {cancelling === appt.id ? "…" : "Cancel"}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
