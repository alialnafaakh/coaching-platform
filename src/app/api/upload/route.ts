import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    
    // Create a unique file name
    const ext = file.name.split('.').pop() || "jpg";
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1000)}.${ext}`;
    
    // Read the file as an array buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { data, error } = await supabase.storage
      .from("images")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) throw error;

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from("images")
      .getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
