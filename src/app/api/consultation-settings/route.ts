import { isAdminSession, isSameOrigin } from "@/lib/serverSecurity";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { calculateWaylTotalIqd, getWaylConversionRate } from "@/lib/wayl";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  calculateFinalPrice,
  getConsultationSettings,
  saveConsultationSettings,
  validateConsultationSettings,
} from "@/lib/consultationSettings";

export const dynamic = "force-dynamic";

/** Public read — booking UI needs current duration/pricing. */
export async function GET() {
  try {
    const db = getSupabaseAdmin();
    const settings = await getConsultationSettings(db);
    const finalPrice = calculateFinalPrice(settings.base_price_usd, settings.discount_percent);
    const rate = getWaylConversionRate();
    return NextResponse.json({
      ...settings,
      final_price_usd: finalPrice,
      payment_total_iqd: calculateWaylTotalIqd(finalPrice, rate),
      usd_to_iqd_rate: rate,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "PRICING_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

/** Admin-only write. */
export async function PUT(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const current = await getConsultationSettings(getSupabaseAdmin());
  const validated = validateConsultationSettings({
    session_duration_minutes: body.session_duration_minutes ?? current.session_duration_minutes,
    base_price_usd: body.base_price_usd ?? current.base_price_usd,
    discount_percent: body.discount_percent ?? current.discount_percent,
  });

  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const saved = await saveConsultationSettings(db, validated);
  if ("error" in saved) {
    return NextResponse.json({ error: saved.error }, { status: 500 });
  }

  return NextResponse.json({
    ...validated,
    final_price_usd: calculateFinalPrice(validated.base_price_usd, validated.discount_percent),
  });
}
