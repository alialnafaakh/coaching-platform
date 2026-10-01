import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Booking approval is owned by the verified payment webhook, not the admin.
// Keep an explicit response for stale clients; session start/end routes are separate.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(
    { error: "Bookings are confirmed automatically after verified payment." },
    { status: 410 }
  );
}
