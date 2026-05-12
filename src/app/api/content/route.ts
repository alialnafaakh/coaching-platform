import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const supabase = getSupabaseAdmin();
  
  const { data, error } = await supabase
    .from("site_content")
    .select("content")
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return NextResponse.json({ content: {} });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ content: data.content });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { content } = await request.json();
    const supabase = getSupabaseAdmin();

    // Try to get the first row ID
    const { data: existing } = await supabase
      .from("site_content")
      .select("id")
      .limit(1)
      .single();

    if (existing) {
      // Update
      const { error } = await supabase
        .from("site_content")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      
      if (error) throw error;
    } else {
      // Insert
      const { error } = await supabase
        .from("site_content")
        .insert([{ content }]);
        
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
