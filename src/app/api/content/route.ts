import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
};

export async function GET() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("site_content")
    .select("content")
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ content: {} }, { headers: NO_STORE });
    }
    return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE });
  }

  return NextResponse.json(
    { content: data.content },
    { headers: NO_STORE }
  );
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { content } = await request.json();
    if (!content || typeof content !== "object") {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: existing, error: fetchError } = await supabase
      .from("site_content")
      .select("id")
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Supabase fetch error:", fetchError);
      throw fetchError;
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from("site_content")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Supabase update error:", updateError);
        throw updateError;
      }
    } else {
      const { error: insertError } = await supabase
        .from("site_content")
        .insert([{ content }]);

      if (insertError) {
        console.error("Supabase insert error:", insertError);
        throw insertError;
      }
    }

    revalidatePath("/");
    revalidatePath("/api/content");
    return NextResponse.json({ success: true }, { headers: NO_STORE });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to save content.";
    console.error("Error updating content:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
