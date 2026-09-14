import type { SupabaseClient } from "@supabase/supabase-js";

export type ConsultationSettings = {
  session_duration_minutes: number;
  base_price_usd: number;
  discount_percent: number;
};

export const DEFAULT_CONSULTATION_SETTINGS: ConsultationSettings = {
  session_duration_minutes: 40,
  base_price_usd: 50,
  discount_percent: 0,
};

export const MIN_SESSION_MINUTES = 15;
export const MAX_SESSION_MINUTES = 180;

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function calculateFinalPrice(basePriceUsd: number, discountPercent: number): number {
  const base = Math.max(0, basePriceUsd);
  const discount = Math.min(100, Math.max(0, discountPercent));
  return Math.round(base * (1 - discount / 100) * 100) / 100;
}

export function validateConsultationSettings(input: {
  session_duration_minutes?: unknown;
  base_price_usd?: unknown;
  discount_percent?: unknown;
}): ConsultationSettings | { error: string } {
  const duration = asFiniteNumber(input.session_duration_minutes);
  const base = asFiniteNumber(input.base_price_usd);
  const discount = asFiniteNumber(input.discount_percent);

  if (duration === null || !Number.isInteger(duration)) {
    return { error: "Session duration must be a whole number of minutes." };
  }
  if (duration < MIN_SESSION_MINUTES || duration > MAX_SESSION_MINUTES) {
    return {
      error: `Session duration must be between ${MIN_SESSION_MINUTES} and ${MAX_SESSION_MINUTES} minutes.`,
    };
  }

  if (base === null || base < 0) {
    return { error: "Base price must be a non-negative number." };
  }

  if (discount === null || discount < 0 || discount > 100) {
    return { error: "Discount must be between 0 and 100." };
  }

  return {
    session_duration_minutes: duration,
    base_price_usd: Math.round(base * 100) / 100,
    discount_percent: Math.round(discount * 100) / 100,
  };
}

function rowToSettings(row: Record<string, unknown> | null | undefined): ConsultationSettings {
  if (!row) return { ...DEFAULT_CONSULTATION_SETTINGS };
  const validated = validateConsultationSettings({
    session_duration_minutes: row.session_duration_minutes,
    base_price_usd: row.base_price_usd,
    discount_percent: row.discount_percent,
  });
  if ("error" in validated) return { ...DEFAULT_CONSULTATION_SETTINGS };
  return validated;
}

export async function getConsultationSettings(
  db: SupabaseClient
): Promise<ConsultationSettings> {
  try {
    const { data, error } = await db
      .from("consultation_settings")
      .select("session_duration_minutes, base_price_usd, discount_percent")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) {
      return { ...DEFAULT_CONSULTATION_SETTINGS };
    }
    return rowToSettings(data as Record<string, unknown>);
  } catch {
    return { ...DEFAULT_CONSULTATION_SETTINGS };
  }
}

export async function saveConsultationSettings(
  db: SupabaseClient,
  settings: ConsultationSettings
): Promise<{ ok: true } | { error: string }> {
  const payload = {
    id: 1,
    session_duration_minutes: settings.session_duration_minutes,
    base_price_usd: settings.base_price_usd,
    discount_percent: settings.discount_percent,
    updated_at: new Date().toISOString(),
  };

  const { error } = await db.from("consultation_settings").upsert(payload, { onConflict: "id" });
  if (error) {
    console.error("consultation_settings upsert error:", error);
    return {
      error:
        error.message.includes("consultation_settings") || error.code === "42P01"
          ? "Consultation settings table is missing. Run the SQL migration first."
          : "Unable to save consultation settings.",
    };
  }
  return { ok: true };
}

/** Build HH:MM(:SS) end time from a start time + duration minutes. */
export function endTimeFromStart(startTime: string, durationMinutes: number): string {
  const parts = startTime.split(":").map((p) => Number(p));
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  const s = parts[2] || 0;
  const total = h * 60 + m + durationMinutes;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  const hasSeconds = startTime.split(":").length >= 3;
  const base = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  return hasSeconds ? `${base}:${String(s).padStart(2, "0")}` : base;
}

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
}
