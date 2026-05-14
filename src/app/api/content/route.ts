import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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
  console.log("PUT request received for site content");
  if (!session) {
    console.error("Unauthorized PUT attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { content } = await request.json();
    const supabase = getSupabaseAdmin();

    const { data: existing, error: fetchError } = await supabase
      .from("site_content")
      .select("id")
      .limit(1)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
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
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating content:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
