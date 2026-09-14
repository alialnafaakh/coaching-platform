import { randomBytes, timingSafeEqual } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Appointment, AppointmentStatus, PaymentStatus, PublicAppointment } from "@/types";

export const PAYMENT_HOLD_MINUTES = 15;
export const ACTIVE_STATUSES: AppointmentStatus[] = [
  "pending_payment",
  "confirmed",
  "in_progress",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function newJoinToken(): string {
  return randomBytes(32).toString("base64url");
}

export function tokensMatch(provided: string, stored: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(stored);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function paymentExpiresAt(from = new Date()): string {
  return new Date(from.getTime() + PAYMENT_HOLD_MINUTES * 60 * 1000).toISOString();
}

export function validateCustomer(input: {
  client_name?: unknown;
  client_email?: unknown;
  notes?: unknown;
}): { client_name: string; client_email: string; notes: string | null } | { error: string } {
  const name = typeof input.client_name === "string" ? input.client_name.trim() : "";
  const email = typeof input.client_email === "string" ? input.client_email.trim().toLowerCase() : "";
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";

  if (name.length < 2 || name.length > 80) {
    return { error: "Please enter your full name." };
  }
  if (!EMAIL_RE.test(email) || email.length > 120) {
    return { error: "Please enter a valid email address." };
  }
  if (notes.length > 2000) {
    return { error: "Notes are too long." };
  }

  return { client_name: name, client_email: email, notes: notes || null };
}

export function toPublicAppointment(
  appt: Appointment,
  slot?: { date?: string; start_time?: string; end_time?: string }
): PublicAppointment {
  return {
    id: appt.id,
    status: appt.status,
    payment_status: appt.payment_status,
    payment_expires_at: appt.payment_expires_at,
    client_name: appt.client_name,
    client_email: appt.client_email,
    notes: appt.notes,
    date: slot?.date || appt.time_slots?.date || "",
    start_time: slot?.start_time || appt.time_slots?.start_time || "",
    end_time: slot?.end_time || appt.time_slots?.end_time || "",
  };
}

export async function expireExpiredHolds(db: SupabaseClient): Promise<void> {
  const now = new Date().toISOString();
  const { data: expired, error } = await db
    .from("appointments")
    .select("id, slot_id")
    .eq("status", "pending_payment")
    .eq("payment_status", "unpaid")
    .not("payment_expires_at", "is", null)
    .lt("payment_expires_at", now);

  if (error || !expired?.length) return;

  const ids = expired.map((row) => row.id);
  await db
    .from("appointments")
    .update({ status: "cancelled", payment_status: "failed" })
    .in("id", ids)
    .eq("status", "pending_payment");

  const slotIds = Array.from(new Set(expired.map((row) => row.slot_id)));
  for (const slotId of slotIds) {
    const { data: blockers } = await db
      .from("appointments")
      .select("id")
      .eq("slot_id", slotId)
      .in("status", ACTIVE_STATUSES)
      .limit(1);

    if (!blockers?.length) {
      await db.from("time_slots").update({ is_booked: false }).eq("id", slotId);
    }
  }
}

export function isHoldExpired(appt: {
  status: AppointmentStatus;
  payment_status?: PaymentStatus;
  payment_expires_at?: string | null;
}): boolean {
  if (appt.status !== "pending_payment") return false;
  if (!appt.payment_expires_at) return false;
  return new Date(appt.payment_expires_at).getTime() <= Date.now();
}
