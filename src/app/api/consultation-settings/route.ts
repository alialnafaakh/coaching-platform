import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
  const db = getSupabaseAdmin();
  const settings = await getConsultationSettings(db);
  return NextResponse.json({
    ...settings,
    final_price_usd: calculateFinalPrice(settings.base_price_usd, settings.discount_percent),
  });
}

/** Admin-only write. */
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
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
