import type { SupabaseClient } from "@supabase/supabase-js";
import { tokensMatch } from "@/lib/bookings";
import type { ReviewModerationStatus } from "@/types";

const MAX_COMMENT_LENGTH = 2000;

function normalizeSlotRelation(
  raw: unknown
): { date: string; start_time: string } | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (!first || typeof first !== "object") return null;
    const slot = first as { date?: string; start_time?: string };
    if (!slot.date || !slot.start_time) return null;
    return { date: slot.date, start_time: slot.start_time };
  }
  if (typeof raw === "object") {
    const slot = raw as { date?: string; start_time?: string };
    if (!slot.date || !slot.start_time) return null;
    return { date: slot.date, start_time: slot.start_time };
  }
  return null;
}

function normalizeAppointmentRelation(raw: unknown): {
  client_name: string;
  status?: string;
} | null {
  if (!raw) return null;
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== "object") return null;
  const appt = row as { client_name?: string; status?: string };
  if (!appt.client_name) return null;
  return { client_name: appt.client_name, status: appt.status };
}

export function publicReviewDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Client";
  if (parts.length === 1) return parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0);
  return `${parts[0]} ${lastInitial}.`;
}

export function parseRating(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}

export function parseComment(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return null;
  // Strip tags / control chars; React still escapes on render.
  const trimmed = value
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim();
  if (trimmed.length > MAX_COMMENT_LENGTH) return null;
  return trimmed || null;
}

type AppointmentRow = {
  id: string;
  status: string;
  client_name: string;
  join_token: string;
  time_slots: { date: string; start_time: string } | null;
};

export async function loadAppointmentWithToken(
  db: SupabaseClient,
  appointmentId: string,
  token: string
): Promise<AppointmentRow | null> {
  if (!appointmentId || !token) return null;

  const { data, error } = await db
    .from("appointments")
    .select("id, status, client_name, join_token, time_slots(date, start_time)")
    .eq("id", appointmentId)
    .maybeSingle();

  if (error || !data || !data.join_token || !tokensMatch(token, data.join_token)) {
    return null;
  }

  const slot = normalizeSlotRelation(data.time_slots);
  return {
    id: data.id,
    status: data.status,
    client_name: data.client_name,
    join_token: data.join_token,
    time_slots: slot,
  };
}

export async function getReviewByAppointmentId(
  db: SupabaseClient,
  appointmentId: string
) {
  const { data, error } = await db
    .from("consultation_reviews")
    .select("id, appointment_id, rating, comment, moderation_status, created_at, reviewed_at")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (error) return null;
  return data;
}

export type PublicApprovedReview = {
  name: string;
  role: string;
  date: string;
  quote: string;
  stars: number;
  verified: true;
};

export async function fetchApprovedPublicReviews(
  db: SupabaseClient,
  roleLabelEn: string,
  roleLabelAr: string,
  lang: "en" | "ar"
): Promise<PublicApprovedReview[]> {
  const { data, error } = await db
    .from("consultation_reviews")
    .select("rating, comment, created_at, appointments(client_name, status)")
    .eq("moderation_status", "approved")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const locale = lang === "ar" ? "ar-EG" : "en-US";
  const roleLabel = lang === "ar" ? roleLabelAr : roleLabelEn;

  const rows = data.filter((row) => {
    const appt = normalizeAppointmentRelation(row.appointments);
    return appt?.status === "completed";
  });

  return rows.map((row) => {
    const appt = normalizeAppointmentRelation(row.appointments)!;
    const created = new Date(row.created_at as string);
    const date = new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
    }).format(created);
    const quote =
      typeof row.comment === "string" && row.comment.trim()
        ? row.comment.trim()
        : lang === "ar"
          ? "تقييم موثّق بعد استشارة مكتملة."
          : "Verified rating after a completed consultation.";

    return {
      name: publicReviewDisplayName(appt.client_name),
      role: roleLabel,
      date,
      quote,
      stars: row.rating as number,
      verified: true as const,
    };
  });
}

export async function moderateReview(
  db: SupabaseClient,
  reviewId: string,
  status: Extract<ReviewModerationStatus, "approved" | "rejected">
) {
  const { data, error } = await db
    .from("consultation_reviews")
    .update({
      moderation_status: status,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reviewId)
    .in("moderation_status", ["pending", "approved", "rejected"])
    .select("id, moderation_status, reviewed_at")
    .maybeSingle();

  if (error || !data) return null;
  return data;
}
