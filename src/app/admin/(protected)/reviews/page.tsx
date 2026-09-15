"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import type { AdminConsultationReviewRow } from "@/types";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
};

type StatusTab = "pending" | "approved" | "rejected" | "all";
type LangFilter = "all" | "ar" | "en" | "unclassified";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminConsultationReviewRow[]>([]);
  const [featuredCountAr, setFeaturedCountAr] = useState(0);
  const [featuredCountEn, setFeaturedCountEn] = useState(0);
  const [featuredMax, setFeaturedMax] = useState(6);
  const [featuredSupported, setFeaturedSupported] = useState(true);
  const [languageSupported, setLanguageSupported] = useState(true);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("pending");
  const [langFilter, setLangFilter] = useState<LangFilter>("all");
  const [editing, setEditing] = useState<AdminConsultationReviewRow | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState("");
  const [editLanguage, setEditLanguage] = useState<"ar" | "en">("en");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchReviews = () => {
    setLoading(true);
    fetch("/api/reviews", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setReviews(Array.isArray(d.reviews) ? d.reviews : Array.isArray(d) ? d : []);
        setFeaturedCountAr(typeof d.featured_count_ar === "number" ? d.featured_count_ar : 0);
        setFeaturedCountEn(typeof d.featured_count_en === "number" ? d.featured_count_en : 0);
        setFeaturedMax(typeof d.featured_max === "number" ? d.featured_max : 6);
        setFeaturedSupported(d.featured_supported !== false);
        setLanguageSupported(d.language_supported !== false);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const statusCounts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0 };
    for (const r of reviews) {
      if (r.moderation_status in c) c[r.moderation_status as keyof typeof c] += 1;
    }
    return c;
  }, [reviews]);

  const langCounts = useMemo(() => {
    let ar = 0;
    let en = 0;
    let unclassified = 0;
    for (const r of reviews) {
      if (r.language === "ar") ar += 1;
      else if (r.language === "en") en += 1;
      else unclassified += 1;
    }
    return { ar, en, unclassified };
  }, [reviews]);

  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      if (statusTab !== "all" && r.moderation_status !== statusTab) return false;
      if (langFilter === "ar" && r.language !== "ar") return false;
      if (langFilter === "en" && r.language !== "en") return false;
      if (langFilter === "unclassified" && (r.language === "ar" || r.language === "en")) {
        return false;
      }
      return true;
    });
  }, [reviews, statusTab, langFilter]);

  const runAction = async (
    id: string,
    body: Record<string, unknown>,
    successMsg: string
  ) => {
    setActing(id);
    setMsg("");
    try {
      const res = await fetch(`/api/reviews/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to update review.");
      setMsg(successMsg);
      setEditing(null);
      fetchReviews();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Unable to update review.");
    } finally {
      setActing(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setActing(deleteId);
    setMsg("");
    try {
      const res = await fetch(`/api/reviews/${encodeURIComponent(deleteId)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Unable to delete review.");
      setMsg("Review deleted.");
      setDeleteId(null);
      fetchReviews();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Unable to delete review.");
    } finally {
      setActing(null);
    }
  };

  const openEdit = (row: AdminConsultationReviewRow) => {
    setEditing(row);
    setEditRating(row.rating);
    setEditComment(row.comment || "");
    setEditLanguage(row.language === "ar" ? "ar" : "en");
  };

  const featuredCountFor = (row: AdminConsultationReviewRow) =>
    row.language === "ar" ? featuredCountAr : featuredCountEn;

  const statusTabs: { id: StatusTab; label: string; count?: number }[] = [
    { id: "pending", label: "Pending", count: statusCounts.pending },
    { id: "approved", label: "Approved", count: statusCounts.approved },
    { id: "rejected", label: "Rejected", count: statusCounts.rejected },
    { id: "all", label: "All", count: reviews.length },
  ];

  const langTabs: { id: LangFilter; label: string; count?: number }[] = [
    { id: "all", label: "All languages", count: reviews.length },
    { id: "ar", label: "Arabic", count: langCounts.ar },
    { id: "en", label: "English", count: langCounts.en },
    { id: "unclassified", label: "Needs language", count: langCounts.unclassified },
  ];

  return (
    <div className="min-w-0 max-w-full">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-3xl text-[#1a1a2e] mb-2"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
          >
            Consultation reviews
          </h1>
          <p className="text-sm text-[#6b7280]">
            Moderate verified reviews by language. Arabic and English featured slots are separate.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="text-sm font-medium text-[#0d7377] bg-[#0d7377]/8 border border-[#0d7377]/20 rounded-xl px-4 py-2 whitespace-nowrap">
            Arabic Featured: {featuredCountAr} / {featuredMax}
          </div>
          <div className="text-sm font-medium text-[#0d7377] bg-[#0d7377]/8 border border-[#0d7377]/20 rounded-xl px-4 py-2 whitespace-nowrap">
            English Featured: {featuredCountEn} / {featuredMax}
          </div>
        </div>
      </div>

      {!languageSupported && (
        <div className="mb-4 p-3 rounded-xl text-sm bg-amber-50 text-amber-800 border border-amber-200">
          Run <code className="text-xs">supabase-migration-review-featured-language.sql</code> in
          Supabase so reviews can be stored and filtered by language. Legacy rows stay unclassified
          until you set Arabic or English in admin — we never guess from customer names.
        </div>
      )}

      {!featuredSupported && (
        <div className="mb-4 p-3 rounded-xl text-sm bg-amber-50 text-amber-800 border border-amber-200">
          Featured reviews also need{" "}
          <code className="text-xs">supabase-migration-review-featured-language.sql</code>.
        </div>
      )}

      {msg && (
        <div className="mb-4 p-3 rounded-xl text-sm bg-[#f0fafa] text-[#0d7377] border border-[#0d7377]/15">
          {msg}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        {statusTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setStatusTab(t.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              statusTab === t.id
                ? "bg-[#0d7377] text-white border-[#0d7377]"
                : "bg-white text-[#6b7280] border-[#e5e0d8] hover:border-[#0d7377]/40"
            }`}
          >
            {t.label}
            {typeof t.count === "number" ? ` (${t.count})` : ""}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {langTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setLangFilter(t.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              langFilter === t.id
                ? "bg-[#1a1a2e] text-white border-[#1a1a2e]"
                : "bg-white text-[#6b7280] border-[#e5e0d8] hover:border-[#1a1a2e]/40"
            }`}
          >
            {t.label}
            {typeof t.count === "number" ? ` (${t.count})` : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-[#e5e0d8]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[#9ca3af]">No reviews in this filter.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((row) => {
            const langLabel =
              row.language === "ar" ? "Arabic" : row.language === "en" ? "English" : "Unclassified";
            const atFeaturedCap =
              !!row.language &&
              !row.is_featured &&
              featuredCountFor(row) >= featuredMax;

            return (
              <div
                key={row.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e5e0d8] flex flex-col gap-4 min-w-0"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <p className="font-medium text-[#1a1a2e]">{row.client_name}</p>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs border capitalize ${
                          STATUS_STYLES[row.moderation_status] ?? ""
                        }`}
                      >
                        {row.moderation_status}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide border ${
                          row.language
                            ? "bg-[#f0ede6] text-[#1a1a2e] border-[#e5e0d8]"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}
                      >
                        {langLabel}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide bg-[#0d7377]/10 text-[#0d7377] border border-[#0d7377]/20">
                        Verified consultation
                      </span>
                      {row.is_featured && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide bg-[#d4a843]/15 text-[#8a6a1a] border border-[#d4a843]/40">
                          Featured
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#6b7280] mb-2">
                      Consultation:{" "}
                      {row.consultation_date
                        ? format(new Date(`${row.consultation_date}T00:00:00`), "MMM d, yyyy")
                        : "—"}
                      {row.consultation_start_time ? ` · ${row.consultation_start_time}` : ""}
                    </p>
                    <div className="flex gap-0.5 mb-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n} style={{ color: n <= row.rating ? "#d4a843" : "#e5e0d8" }}>
                          ★
                        </span>
                      ))}
                    </div>
                    {row.comment ? (
                      <p className="text-sm text-[#374151] whitespace-pre-wrap break-words">
                        {row.comment}
                      </p>
                    ) : (
                      <p className="text-sm text-[#9ca3af] italic">No written comment.</p>
                    )}
                    <p className="text-xs text-[#9ca3af] mt-2">
                      Submitted {format(new Date(row.created_at), "MMM d, yyyy HH:mm")}
                      {row.reviewed_at
                        ? ` · Moderated ${format(new Date(row.reviewed_at), "MMM d, yyyy HH:mm")}`
                        : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 flex-shrink-0">
                    {row.moderation_status === "pending" && (
                      <>
                        <button
                          type="button"
                          disabled={acting === row.id}
                          onClick={() =>
                            runAction(row.id, { moderation_status: "approved" }, "Review approved.")
                          }
                          className="px-3 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={acting === row.id}
                          onClick={() =>
                            runAction(row.id, { moderation_status: "rejected" }, "Review rejected.")
                          }
                          className="px-3 py-2 rounded-lg text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {row.moderation_status === "approved" && (
                      <>
                        <button
                          type="button"
                          disabled={
                            acting === row.id ||
                            !row.language ||
                            atFeaturedCap ||
                            !featuredSupported
                          }
                          title={
                            !row.language
                              ? "Set language before featuring"
                              : atFeaturedCap
                                ? `Maximum ${featuredMax} featured for this language`
                                : undefined
                          }
                          onClick={() =>
                            runAction(
                              row.id,
                              { is_featured: !row.is_featured },
                              row.is_featured ? "Removed from featured." : "Marked as featured."
                            )
                          }
                          className="px-3 py-2 rounded-lg text-xs font-medium border border-[#d4a843]/50 text-[#8a6a1a] hover:bg-[#d4a843]/10 disabled:opacity-50"
                        >
                          {row.is_featured ? "Unfeature" : "Feature"}
                        </button>
                        <button
                          type="button"
                          disabled={acting === row.id}
                          onClick={() =>
                            runAction(row.id, { moderation_status: "rejected" }, "Review rejected.")
                          }
                          className="px-3 py-2 rounded-lg text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {row.moderation_status === "rejected" && (
                      <button
                        type="button"
                        disabled={acting === row.id}
                        onClick={() =>
                          runAction(row.id, { moderation_status: "approved" }, "Review approved.")
                        }
                        className="px-3 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
                      >
                        Approve
                      </button>
                    )}

                    {/* Quick language classify */}
                    {languageSupported && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={acting === row.id || row.language === "ar"}
                          onClick={() =>
                            runAction(row.id, { language: "ar" }, "Language set to Arabic.")
                          }
                          className="px-2.5 py-2 rounded-lg text-xs font-medium border border-[#e5e0d8] disabled:opacity-40 hover:bg-[#faf9f6]"
                        >
                          AR
                        </button>
                        <button
                          type="button"
                          disabled={acting === row.id || row.language === "en"}
                          onClick={() =>
                            runAction(row.id, { language: "en" }, "Language set to English.")
                          }
                          className="px-2.5 py-2 rounded-lg text-xs font-medium border border-[#e5e0d8] disabled:opacity-40 hover:bg-[#faf9f6]"
                        >
                          EN
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={acting === row.id}
                      onClick={() => openEdit(row)}
                      className="px-3 py-2 rounded-lg text-xs font-medium text-[#1a1a2e] border border-[#e5e0d8] hover:bg-[#faf9f6] disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={acting === row.id}
                      onClick={() => setDeleteId(row.id)}
                      className="px-3 py-2 rounded-lg text-xs font-medium text-red-700 border border-red-200 hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-[#1a1a2e] mb-1">Edit review</h2>
            <p className="text-xs text-[#6b7280] mb-4">
              Rating, comment, and language only. Appointment relationship is preserved. Moving a
              featured review into a language that already has {featuredMax} featured will
              automatically unfeature it.
            </p>
            <label className="block text-xs font-medium text-[#6b7280] mb-2">Language</label>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setEditLanguage("ar")}
                className={`px-3 py-1.5 rounded-lg text-xs border ${
                  editLanguage === "ar"
                    ? "bg-[#1a1a2e] text-white border-[#1a1a2e]"
                    : "border-[#e5e0d8]"
                }`}
              >
                Arabic
              </button>
              <button
                type="button"
                onClick={() => setEditLanguage("en")}
                className={`px-3 py-1.5 rounded-lg text-xs border ${
                  editLanguage === "en"
                    ? "bg-[#1a1a2e] text-white border-[#1a1a2e]"
                    : "border-[#e5e0d8]"
                }`}
              >
                English
              </button>
            </div>
            <label className="block text-xs font-medium text-[#6b7280] mb-2">Rating</label>
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setEditRating(n)}
                  className="text-2xl"
                  aria-label={`${n} stars`}
                >
                  <span style={{ color: n <= editRating ? "#d4a843" : "#e5e0d8" }}>★</span>
                </button>
              ))}
            </div>
            <label className="block text-xs font-medium text-[#6b7280] mb-1.5">Comment</label>
            <textarea
              rows={5}
              value={editComment}
              onChange={(e) => setEditComment(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#e5e0d8] text-sm mb-4 resize-none"
            />
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-lg text-xs border border-[#e5e0d8]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={acting === editing.id}
                onClick={() =>
                  runAction(
                    editing.id,
                    {
                      rating: editRating,
                      comment: editComment,
                      language: editLanguage,
                    },
                    "Review updated."
                  )
                }
                className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#1a1a2e] mb-2">Delete this review?</h2>
            <p className="text-sm text-[#6b7280] mb-5">
              This permanently deletes the review record only. The appointment and consultation
              history are not changed.
            </p>
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 rounded-lg text-xs border border-[#e5e0d8]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={acting === deleteId}
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                Delete review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
