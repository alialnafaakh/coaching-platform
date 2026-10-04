import { NextResponse } from "next/server";
import { authorizedCron, PRIVATE_HEADERS } from "@/lib/serverSecurity";
import { getSupabaseAdmin } from "@/lib/supabase";
import { retryConsultationEmails } from "@/lib/consultationEmail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!authorizedCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_HEADERS });
  try {
    return NextResponse.json(await retryConsultationEmails(getSupabaseAdmin()), { headers: PRIVATE_HEADERS });
  } catch {
    console.error("SERVER_OPERATION_FAILED");
    return NextResponse.json({ error: "Worker unavailable" }, { status: 503, headers: PRIVATE_HEADERS });
  }
}
