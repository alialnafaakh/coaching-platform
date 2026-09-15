import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  deleteReview,
  moderateReview,
  parseCommentForAdminEdit,
  parseRating,
  parseReviewLanguage,
  setReviewFeatured,
  updateReviewContent,
} from "@/lib/reviews";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Admin: approve/reject, edit rating/comment, or feature/unfeature.
 * Body actions (mutually guided by fields present):
 *   { moderation_status: "approved" | "rejected" }
 *   { rating?, comment?, language? }  — edit public fields only
 *   { is_featured: boolean }
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  // Feature / unfeature
  if (typeof body.is_featured === "boolean") {
    const result = await setReviewFeatured(db, id, body.is_featured);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, review: result.review });
  }

  // Moderate
  if (body.moderation_status !== undefined) {
    const status = body.moderation_status;
    if (status !== "approved" && status !== "rejected") {
      return NextResponse.json(
        { error: "moderation_status must be approved or rejected." },
        { status: 400 }
      );
    }
    const updated = await moderateReview(db, id, status);
    if (!updated) {
      return NextResponse.json({ error: "Review not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, review: updated });
  }

  // Edit rating / comment / language only
  if (
    body.rating !== undefined ||
    body.comment !== undefined ||
    body.language !== undefined
  ) {
    const fields: {
      rating?: number;
      comment?: string | null;
      language?: "ar" | "en";
    } = {};

    if (body.rating !== undefined) {
      const rating = parseRating(body.rating);
      if (rating == null) {
        return NextResponse.json({ error: "rating must be an integer 1–5." }, { status: 400 });
      }
      fields.rating = rating;
    }

    if (body.comment !== undefined) {
      const comment = parseCommentForAdminEdit(body.comment);
      if (comment === undefined) {
        return NextResponse.json(
          { error: "comment is invalid or exceeds the maximum length." },
          { status: 400 }
        );
      }
      fields.comment = comment;
    }

    if (body.language !== undefined) {
      const language = parseReviewLanguage(body.language);
      if (!language) {
        return NextResponse.json(
          { error: "language must be ar or en." },
          { status: 400 }
        );
      }
      fields.language = language;
    }

    const result = await updateReviewContent(db, id, fields);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, review: result.review });
  }

  return NextResponse.json(
    { error: "Provide moderation_status, is_featured, and/or rating/comment/language." },
    { status: 400 }
  );
}

/** Admin: delete a consultation_review only (never the appointment). */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const ok = await deleteReview(db, id);
  if (!ok) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
