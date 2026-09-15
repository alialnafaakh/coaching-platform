"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useLanguage } from "@/context/LanguageContext";

type ReviewState = {
  eligible: boolean;
  message?: string;
  client_name: string;
  consultation_date: string;
  consultation_start_time: string;
  existing_review: {
    moderation_status: string;
    rating: number;
    comment: string | null;
    created_at: string;
  } | null;
};

function ReviewFormInner() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const { isRtl, t, lang } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [state, setState] = useState<ReviewState | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const load = useCallback(async () => {
    if (!id || !token) {
      setError(t("booking_missing_access"));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/reviews/appointment/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("error_generic"));
      }
      setState(data);
      if (data.existing_review?.rating) {
        setRating(data.existing_review.rating);
        setComment(data.existing_review.comment || "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_generic"));
    } finally {
      setLoading(false);
    }
  }, [id, token, t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !token || !state?.eligible || state.existing_review) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/reviews/appointment/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, rating, comment: comment.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("error_generic"));
      }
      setSuccess(true);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_generic"));
    } finally {
      setSubmitting(false);
    }
  };

  const locale = lang === "ar" ? "ar-EG" : "en-US";
  const formattedDate = state?.consultation_date
    ? new Intl.DateTimeFormat(locale, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(`${state.consultation_date}T00:00:00`))
    : "";

  const alreadySubmitted = Boolean(state?.existing_review);
  const canSubmit = state?.eligible && !alreadySubmitted && !success;

  return (
    <>
      <Navbar />
      <main className={`min-h-screen bg-[#faf9f6] pt-24 pb-16 px-6 ${isRtl ? "text-right" : "text-left"}`}>
        <div className="max-w-lg mx-auto bg-white rounded-3xl border border-[#e5e0d8] p-6 md:p-8 shadow-sm">
          <h1
            className={`text-3xl text-[#1a1a2e] mb-2 ${isRtl ? "font-arabic-display" : ""}`}
            style={{ fontFamily: isRtl ? undefined : "Cormorant Garamond, Georgia, serif" }}
          >
            {t("review_page_title")}
          </h1>
          <p className={`text-sm text-[#6b7280] mb-6 ${isRtl ? "font-arabic" : ""}`}>{t("review_intro")}</p>

          {loading ? (
            <p className={`text-[#6b7280] ${isRtl ? "font-arabic" : ""}`}>{t("loading_booking")}</p>
          ) : error && !state ? (
            <p className={`text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl ${isRtl ? "font-arabic" : ""}`}>
              {error}
            </p>
          ) : state ? (
            <>
              <div className="rounded-2xl border border-[#0d7377]/15 bg-[#0d7377]/6 p-4 mb-6">
                <p className={`text-sm font-medium text-[#1a1a2e] ${isRtl ? "font-arabic" : ""}`}>
                  {state.client_name}
                </p>
                {formattedDate && (
                  <p className={`text-sm text-[#6b7280] mt-1 ${isRtl ? "font-arabic" : ""}`}>
                    {formattedDate}
                    {state.consultation_start_time
                      ? ` · ${state.consultation_start_time.slice(0, 5)}`
                      : null}
                  </p>
                )}
              </div>

              {!state.eligible ? (
                <p className={`text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-4 ${isRtl ? "font-arabic" : ""}`}>
                  {state.message || t("review_not_eligible")}
                </p>
              ) : success || alreadySubmitted ? (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                  <p className={`text-sm text-emerald-800 ${isRtl ? "font-arabic" : ""}`}>
                    {alreadySubmitted && state.existing_review?.moderation_status === "pending"
                      ? t("review_received_pending")
                      : alreadySubmitted
                        ? t("review_already_submitted")
                        : t("review_received_pending")}
                  </p>
                  {alreadySubmitted && state.existing_review && (
                    <div className={`mt-3 flex gap-1 ${isRtl ? "flex-row-reverse justify-end" : ""}`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span
                          key={n}
                          style={{
                            color: n <= state.existing_review!.rating ? "#d4a843" : "#e5e0d8",
                          }}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className={`block text-sm font-medium text-[#1a1a2e] mb-2 ${isRtl ? "font-arabic" : ""}`}>
                      {t("review_rating_label")}
                    </label>
                    <div className={`flex gap-2 ${isRtl ? "flex-row-reverse justify-end" : ""}`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setRating(n)}
                          className="text-2xl transition-transform hover:scale-110"
                          style={{ color: n <= rating ? "#d4a843" : "#e5e0d8" }}
                          aria-label={`${n}`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium text-[#1a1a2e] mb-2 ${isRtl ? "font-arabic" : ""}`}>
                      {t("review_comment_label")}
                    </label>
                    <textarea
                      rows={4}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder={t("review_comment_placeholder")}
                      className={`w-full px-4 py-3 rounded-xl border border-[#e5e0d8] text-sm focus:outline-none focus:border-[#0d7377] resize-none ${isRtl ? "font-arabic text-right" : ""}`}
                    />
                  </div>
                  {error && (
                    <p className={`text-sm text-red-600 ${isRtl ? "font-arabic" : ""}`}>{error}</p>
                  )}
                  <button
                    type="submit"
                    disabled={submitting || !canSubmit}
                    className={`w-full py-3.5 rounded-xl text-white text-sm font-medium disabled:opacity-60 ${isRtl ? "font-arabic" : ""}`}
                    style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
                  >
                    {submitting ? t("review_submitting") : t("review_submit")}
                  </button>
                </form>
              )}
            </>
          ) : null}

          <Link
            href="/"
            className={`inline-block mt-6 text-sm text-[#0d7377] hover:underline ${isRtl ? "font-arabic" : ""}`}
          >
            {t("back_home")}
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#faf9f6]" />}>
      <ReviewFormInner />
    </Suspense>
  );
}
