import type { SupabaseClient } from "@supabase/supabase-js";
import { tokensMatch } from "@/lib/bookings";
import type { ReviewModerationStatus } from "@/types";

const MAX_COMMENT_LENGTH = 2000;
export const FEATURED_REVIEW_MAX = 6;

export type ReviewLanguage = "ar" | "en";

export function parseReviewLanguage(value: unknown): ReviewLanguage | null {
  return value === "ar" || value === "en" ? value : null;
}

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

function appointmentStatusFromRelation(raw: unknown): string | null {
  if (!raw) return null;
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== "object") return null;
  const status = (row as { status?: unknown }).status;
  return typeof status === "string" ? status : null;
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
  const trimmed = value
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim();
  if (trimmed.length > MAX_COMMENT_LENGTH) return null;
  return trimmed || null;
}

/** Allow clearing comment on admin edit (empty → null). Reject invalid types. */
export function parseCommentForAdminEdit(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value == null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim();
  if (trimmed.length > MAX_COMMENT_LENGTH) return undefined;
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
  const withLang = await db
    .from("consultation_reviews")
    .select(
      "id, appointment_id, rating, comment, moderation_status, language, created_at, reviewed_at"
    )
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (!withLang.error) return withLang.data;

  const { data, error } = await db
    .from("consultation_reviews")
    .select("id, appointment_id, rating, comment, moderation_status, created_at, reviewed_at")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (error) return null;
  return data;
}

export type PublicApprovedReview = {
  id: string;
  name: string;
  role: string;
  date: string;
  quote: string;
  stars: number;
  verified: true;
  featured: boolean;
  created_at: string;
};

export type PublicReviewSummary = {
  average_rating: number | null;
  review_count: number;
};

type ApprovedRowRaw = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  language?: string | null;
  is_featured?: boolean | null;
  appointments: unknown;
};

async function queryApprovedReviewRows(
  db: SupabaseClient,
  lang: ReviewLanguage
): Promise<{ rows: ApprovedRowRaw[]; featuredSupported: boolean; languageSupported: boolean }> {
  const withLangAndFeatured = await db
    .from("consultation_reviews")
    .select(
      "id, rating, comment, created_at, language, is_featured, appointments(client_name, status)"
    )
    .eq("moderation_status", "approved")
    .eq("language", lang)
    .order("created_at", { ascending: false });

  if (!withLangAndFeatured.error && withLangAndFeatured.data) {
    return {
      rows: withLangAndFeatured.data as unknown as ApprovedRowRaw[],
      featuredSupported: true,
      languageSupported: true,
    };
  }

  // Language column missing — refuse to mix languages publicly; return empty
  // until migration is applied (safer than showing EN+AR together).
  const msg = withLangAndFeatured.error?.message || "";
  if (msg.toLowerCase().includes("language") || withLangAndFeatured.error) {
    const featuredOnly = await db
      .from("consultation_reviews")
      .select("id, rating, comment, created_at, is_featured, appointments(client_name, status)")
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false });

    if (!featuredOnly.error && featuredOnly.data) {
      // Without language column we cannot safely filter — return none.
      return { rows: [], featuredSupported: true, languageSupported: false };
    }

    const bare = await db
      .from("consultation_reviews")
      .select("id, rating, comment, created_at, appointments(client_name, status)")
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false });

    return {
      rows: [],
      featuredSupported: !bare.error,
      languageSupported: false,
    };
  }

  return { rows: [], featuredSupported: false, languageSupported: false };
}

function mapApprovedRowsToPublic(
  rows: ApprovedRowRaw[],
  roleLabelEn: string,
  roleLabelAr: string,
  lang: "en" | "ar",
  featuredSupported: boolean
): PublicApprovedReview[] {
  const locale = lang === "ar" ? "ar-EG" : "en-US";
  const roleLabel = lang === "ar" ? roleLabelAr : roleLabelEn;

  const mapped: PublicApprovedReview[] = [];
  for (const row of rows) {
    const appt = normalizeAppointmentRelation(row.appointments);
    if (appt?.status !== "completed") continue;

    const created = new Date(row.created_at);
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

    mapped.push({
      id: row.id,
      name: publicReviewDisplayName(appt.client_name),
      role: roleLabel,
      date,
      quote,
      stars: row.rating as number,
      verified: true as const,
      featured: featuredSupported ? row.is_featured === true : false,
      created_at: row.created_at,
    });
  }
  return mapped;
}

/** Featured first (newest within), then newest non-featured. */
export function orderPublicReviews(reviews: PublicApprovedReview[]): PublicApprovedReview[] {
  const featured = reviews
    .filter((r) => r.featured)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  const rest = reviews
    .filter((r) => !r.featured)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  return [...featured, ...rest];
}

export async function fetchApprovedPublicReviews(
  db: SupabaseClient,
  roleLabelEn: string,
  roleLabelAr: string,
  lang: ReviewLanguage
): Promise<PublicApprovedReview[]> {
  const { rows, featuredSupported } = await queryApprovedReviewRows(db, lang);
  return orderPublicReviews(
    mapApprovedRowsToPublic(rows, roleLabelEn, roleLabelAr, lang, featuredSupported)
  );
}

export function summarizePublicReviews(
  reviews: Array<{ stars: number }>
): PublicReviewSummary {
  if (!reviews.length) {
    return { average_rating: null, review_count: 0 };
  }
  const ratings = reviews
    .map((r) => r.stars)
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 5);
  if (!ratings.length) {
    return { average_rating: null, review_count: 0 };
  }
  const sum = ratings.reduce((a, b) => a + b, 0);
  return {
    average_rating: Math.round((sum / ratings.length) * 10) / 10,
    review_count: ratings.length,
  };
}

export async function countFeaturedApproved(
  db: SupabaseClient,
  lang?: ReviewLanguage
): Promise<{ count: number; supported: boolean }> {
  let q = db
    .from("consultation_reviews")
    .select("id", { count: "exact", head: true })
    .eq("moderation_status", "approved")
    .eq("is_featured", true);

  if (lang) {
    q = q.eq("language", lang);
  }

  const { count, error } = await q;

  if (error) {
    return { count: 0, supported: false };
  }
  return { count: count ?? 0, supported: true };
}

export async function countFeaturedByLanguage(db: SupabaseClient): Promise<{
  ar: number;
  en: number;
  supported: boolean;
}> {
  const [ar, en] = await Promise.all([
    countFeaturedApproved(db, "ar"),
    countFeaturedApproved(db, "en"),
  ]);
  const supported = ar.supported && en.supported;
  return { ar: ar.count, en: en.count, supported };
}

export async function moderateReview(
  db: SupabaseClient,
  reviewId: string,
  status: Extract<ReviewModerationStatus, "approved" | "rejected">
) {
  const payload: Record<string, unknown> = {
    moderation_status: status,
    reviewed_at: new Date().toISOString(),
  };
  // Rejecting always clears featured (column may not exist yet — retry without).
  if (status === "rejected") {
    payload.is_featured = false;
  }

  let result = await db
    .from("consultation_reviews")
    .update(payload)
    .eq("id", reviewId)
    .in("moderation_status", ["pending", "approved", "rejected"])
    .select("id, moderation_status, reviewed_at, is_featured")
    .maybeSingle();

  if (result.error && status === "rejected") {
    result = await db
      .from("consultation_reviews")
      .update({
        moderation_status: status,
        reviewed_at: payload.reviewed_at,
      })
      .eq("id", reviewId)
      .in("moderation_status", ["pending", "approved", "rejected"])
      .select("id, moderation_status, reviewed_at")
      .maybeSingle();
  } else if (result.error) {
    result = await db
      .from("consultation_reviews")
      .update({
        moderation_status: status,
        reviewed_at: payload.reviewed_at,
      })
      .eq("id", reviewId)
      .in("moderation_status", ["pending", "approved", "rejected"])
      .select("id, moderation_status, reviewed_at")
      .maybeSingle();
  }

  if (result.error || !result.data) return null;
  return result.data;
}

export async function updateReviewContent(
  db: SupabaseClient,
  reviewId: string,
  fields: { rating?: number; comment?: string | null; language?: ReviewLanguage }
) {
  if (
    fields.rating === undefined &&
    fields.comment === undefined &&
    fields.language === undefined
  ) {
    return { ok: false as const, error: "No editable fields provided." };
  }

  const update: Record<string, unknown> = {};
  if (fields.rating !== undefined) update.rating = fields.rating;
  if (fields.comment !== undefined) update.comment = fields.comment;
  if (fields.language !== undefined) update.language = fields.language;

  // If changing language while featured, enforce destination language cap.
  if (fields.language !== undefined) {
    const { data: existing } = await db
      .from("consultation_reviews")
      .select("id, moderation_status, is_featured, language")
      .eq("id", reviewId)
      .maybeSingle();

    if (!existing) {
      return { ok: false as const, error: "Review not found." };
    }

    const moving =
      existing.language !== fields.language && existing.is_featured === true;
    if (moving && existing.moderation_status === "approved") {
      const { count, supported } = await countFeaturedApproved(db, fields.language);
      if (!supported) {
        return {
          ok: false as const,
          error:
            "Language/featured columns require migration. Run supabase-migration-review-featured-language.sql.",
        };
      }
      if (count >= FEATURED_REVIEW_MAX) {
        // Preserve appointment link; clear featured so move can succeed.
        update.is_featured = false;
      }
    }
  }

  const { data, error } = await db
    .from("consultation_reviews")
    .update(update)
    .eq("id", reviewId)
    .select(
      "id, rating, comment, moderation_status, language, is_featured, reviewed_at, created_at"
    )
    .maybeSingle();

  if (error) {
    const retry = await db
      .from("consultation_reviews")
      .update(update)
      .eq("id", reviewId)
      .select("id, rating, comment, moderation_status, reviewed_at, created_at")
      .maybeSingle();
    if (retry.error || !retry.data) {
      return { ok: false as const, error: error.message || "Unable to update review." };
    }
    return { ok: true as const, review: retry.data };
  }

  if (!data) return { ok: false as const, error: "Review not found." };
  return { ok: true as const, review: data };
}

export async function deleteReview(db: SupabaseClient, reviewId: string) {
  const { data, error } = await db
    .from("consultation_reviews")
    .delete()
    .eq("id", reviewId)
    .select("id")
    .maybeSingle();

  if (error || !data) return false;
  return true;
}

export async function setReviewFeatured(
  db: SupabaseClient,
  reviewId: string,
  featured: boolean
): Promise<{ ok: true; review: unknown } | { ok: false; error: string; status: number }> {
  const { data: existing, error: fetchError } = await db
    .from("consultation_reviews")
    .select("id, moderation_status, is_featured, language")
    .eq("id", reviewId)
    .maybeSingle();

  if (fetchError) {
    return {
      ok: false,
      error:
        "Featured/language columns require migration. Run supabase-migration-review-featured-language.sql.",
      status: 503,
    };
  }
  if (!existing) {
    return { ok: false, error: "Review not found.", status: 404 };
  }
  if (existing.moderation_status !== "approved") {
    return {
      ok: false,
      error: "Only approved reviews can be featured.",
      status: 400,
    };
  }

  const lang = parseReviewLanguage(existing.language);
  if (!lang) {
    return {
      ok: false,
      error: "Set the review language (Arabic or English) before featuring.",
      status: 400,
    };
  }

  if (featured && existing.is_featured !== true) {
    const { count, supported } = await countFeaturedApproved(db, lang);
    if (!supported) {
      return {
        ok: false,
        error:
          "Featured reviews require the is_featured column. Run supabase-migration-review-featured-language.sql.",
        status: 503,
      };
    }
    if (count >= FEATURED_REVIEW_MAX) {
      return {
        ok: false,
        error: `Maximum of ${FEATURED_REVIEW_MAX} featured ${lang === "ar" ? "Arabic" : "English"} reviews allowed.`,
        status: 400,
      };
    }
  }

  const { data, error } = await db
    .from("consultation_reviews")
    .update({ is_featured: featured })
    .eq("id", reviewId)
    .eq("moderation_status", "approved")
    .select(
      "id, moderation_status, language, is_featured, rating, comment, created_at, reviewed_at"
    )
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "Unable to update featured status.", status: 500 };
  }
  return { ok: true, review: data };
}
