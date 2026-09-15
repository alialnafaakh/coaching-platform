"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import type { AdminConsultationReviewRow } from "@/types";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminConsultationReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const fetchReviews = () => {
    setLoading(true);
    fetch("/api/reviews")
      .then((r) => r.json())
      .then((d) => setReviews(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const moderate = async (id: string, moderation_status: "approved" | "rejected") => {
    setActing(id);
    setMsg("");
    try {
      const res = await fetch(`/api/reviews/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moderation_status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to update review.");
      setMsg(moderation_status === "approved" ? "Review approved." : "Review rejected.");
      fetchReviews();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Unable to update review.");
    } finally {
      setActing(null);
    }
  };

  return (
    <div>
      <h1
        className="text-3xl text-[#1a1a2e] mb-2"
        style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
      >
        Consultation reviews
      </h1>
      <p className="text-sm text-[#6b7280] mb-8">
        Moderate verified post-consultation reviews. Only approved reviews appear on the public site.
      </p>

      {msg && (
        <div className="mb-4 p-3 rounded-xl text-sm bg-[#f0fafa] text-[#0d7377] border border-[#0d7377]/15">
          {msg}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-[#e5e0d8]" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-[#9ca3af]">No consultation reviews yet.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((row) => (
            <div
              key={row.id}
              className="bg-white rounded-2xl p-5 border border-[#e5e0d8] flex flex-col lg:flex-row lg:items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <p className="font-medium text-[#1a1a2e]">{row.client_name}</p>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs border capitalize ${STATUS_STYLES[row.moderation_status] ?? ""}`}
                  >
                    {row.moderation_status}
                  </span>
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
                  <p className="text-sm text-[#374151] whitespace-pre-wrap">{row.comment}</p>
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

              {row.moderation_status === "pending" && (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    type="button"
                    disabled={acting === row.id}
                    onClick={() => moderate(row.id, "approved")}
                    className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={acting === row.id}
                    onClick={() => moderate(row.id, "rejected")}
                    className="px-4 py-2 rounded-lg text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
