import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { expireExpiredHolds, toPublicAppointment, tokensMatch } from "@/lib/bookings";
import { calculateWaylTotalIqd, getWaylConversionRate, referenceAmount } from "@/lib/wayl";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get("token") || "";

  if (!id || !token) {
    return NextResponse.json(
      { error: "unauthorized", message: "Booking access token is required." },
      { status: 401 }
    );
  }

  const db = getSupabaseAdmin();

  try {
    await expireExpiredHolds(db);

    const { data: appt, error } = await db
      .from("appointments")
      .select("*, time_slots(*)")
      .eq("id", id)
      .maybeSingle();

    if (error || !appt || !appt.join_token || !tokensMatch(token, appt.join_token)) {
      return NextResponse.json(
        { error: "not_found", message: "Booking not found." },
        { status: 404 }
      );
    }


    let paymentTotalIqd: number | null = null;
    try {
      if (appt.payment_reference) paymentTotalIqd = referenceAmount(appt.payment_reference, appt.final_price_usd);
      else if (appt.status === "pending_payment" && appt.payment_status === "unpaid") {
        paymentTotalIqd = calculateWaylTotalIqd(appt.final_price_usd, getWaylConversionRate());
      }
    } catch { /* Historical or unavailable quotes must not prevent access to the booking. */ }
    return NextResponse.json({
      appointment: { ...toPublicAppointment(appt, appt.time_slots), payment_total_iqd: paymentTotalIqd },
    });
  } catch {
    console.error("SERVER_OPERATION_FAILED");
    return NextResponse.json(
      { error: "server_error", message: "Unable to load this booking." },
      { status: 500 }
    );
  }
}
