import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { prepareCmsImage } from "@/lib/imageUpload";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }

  const file = formData.get("file");
  const prepared = await prepareCmsImage(file instanceof File ? file : null);

  if (!prepared.ok) {
    const status =
      prepared.error === "file_too_large"
        ? 413
        : prepared.error === "no_file"
          ? 400
          : 400;
    return NextResponse.json({ error: prepared.error }, { status });
  }

  const { buffer, contentType, objectPath } = prepared.image;

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage.from("images").upload(objectPath, buffer, {
      contentType,
      upsert: false,
    });

    if (error) {
      console.error("CMS image upload failed", { category: "storage_upload" });
      return NextResponse.json({ error: "upload_failed" }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("images").getPublicUrl(objectPath);

    return NextResponse.json({ url: publicUrl });
  } catch {
    console.error("CMS image upload failed", { category: "unexpected" });
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}
