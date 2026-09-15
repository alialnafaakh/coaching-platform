"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useLanguage } from "@/context/LanguageContext";

const ConsultationRoom = dynamic(
  () => import("@/components/consultation/ConsultationRoom"),
  { ssr: false }
);

type AccessPayload = {
  can_join: boolean;
  denial: { code: string; message: string; available_at?: string } | null;
  appointment: {
    id: string;
    status: string;
    client_name: string;
    date: string;
    start_time: string;
    end_time: string;
    session_duration_minutes: number;
    scheduled_start: string;
    join_opens_at: string;
    join_closes_at: string;
  };
};

type JoinPayload = {
  room_url: string;
  token: string;
  user_name: string;
  role: "customer" | "coach";
};

function CustomerConsultationInner() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const { isRtl, t, lang } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [access, setAccess] = useState<AccessPayload | null>(null);
  const [join, setJoin] = useState<JoinPayload | null>(null);

  const loadAccess = useCallback(async () => {
    if (!id || !token) {
      setError(t("booking_missing_access"));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/consultations/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("consultation_unavailable"));
      }
      setAccess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_generic"));
    } finally {
      setLoading(false);
    }
  }, [id, token, t]);

  useEffect(() => {
    loadAccess();
  }, [loadAccess]);

  const handleJoin = async () => {
    if (!id || !token) return;
    setJoining(true);
    setError("");
    try {
      const res = await fetch(`/api/consultations/${encodeURIComponent(id)}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("call_error"));
      }
      setJoin({
        room_url: data.room_url,
        token: data.token,
        user_name: data.user_name,
        role: "customer",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("call_error"));
      await loadAccess();
    } finally {
      setJoining(false);
    }
  };

  const locale = lang === "ar" ? "ar-EG" : "en-US";
  const appt = access?.appointment;
  const formattedDate = appt?.date
    ? new Intl.DateTimeFormat(locale, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(`${appt.date}T00:00:00`))
    : "";
  const opensAt = access?.denial?.available_at
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Istanbul",
      }).format(new Date(access.denial.available_at))
    : "";

  if (join) {
    return (
      <main className="min-h-screen bg-[#0f172a] text-white px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <h1 className={`text-xl mb-6 ${isRtl ? "font-arabic text-right" : ""}`}>
            {t("consultation_room_title")}
          </h1>
          <ConsultationRoom
            roomUrl={join.room_url}
            token={join.token}
            userName={join.user_name}
            role="customer"
            onLeave={() => {
              setJoin(null);
              loadAccess();
            }}
          />
        </div>
      </main>
    );
  }

  return (
    <>
      <Navbar />
      <main className={`min-h-screen bg-[#faf9f6] pt-24 pb-16 px-6 ${isRtl ? "text-right" : "text-left"}`}>
        <div className="max-w-lg mx-auto bg-white rounded-3xl border border-[#e5e0d8] p-6 md:p-8 shadow-sm">
          <h1
            className={`text-3xl text-[#1a1a2e] mb-2 ${isRtl ? "font-arabic-display" : ""}`}
            style={{ fontFamily: isRtl ? undefined : "Cormorant Garamond, Georgia, serif" }}
          >
            {t("consultation_room_title")}
          </h1>
          <p className={`text-sm text-[#6b7280] mb-6 ${isRtl ? "font-arabic" : ""}`}>
            {t("istanbul_time")}
          </p>

          {loading ? (
            <p className={`text-[#6b7280] ${isRtl ? "font-arabic" : ""}`}>{t("loading_booking")}</p>
          ) : error ? (
            <p className={`text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl ${isRtl ? "font-arabic" : ""}`}>
              {error}
            </p>
          ) : appt ? (
            <>
              <div className="rounded-2xl border border-[#0d7377]/15 bg-[#0d7377]/6 p-4 mb-6">
                <p className={`text-sm font-medium text-[#1a1a2e] ${isRtl ? "font-arabic" : ""}`}>
                  {appt.client_name}
                </p>
                <p className={`text-sm text-[#6b7280] mt-1 ${isRtl ? "font-arabic" : ""}`}>
                  {formattedDate} · {appt.start_time.slice(0, 5)}
                </p>
                <p className={`text-sm text-[#0d7377] mt-1 ${isRtl ? "font-arabic" : ""}`}>
                  {appt.session_duration_minutes} {t("minutes_unit")}
                </p>
              </div>

              {access?.can_join ? (
                <>
                  <p className={`text-sm text-[#6b7280] mb-4 ${isRtl ? "font-arabic" : ""}`}>
                    {t("consultation_ready")}
                  </p>
                  <button
                    type="button"
                    onClick={handleJoin}
                    disabled={joining}
                    className={`w-full py-3.5 rounded-xl text-white text-sm font-medium disabled:opacity-60 ${isRtl ? "font-arabic" : ""}`}
                    style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
                  >
                    {joining ? t("connecting") : t("enter_consultation")}
                  </button>
                </>
              ) : appt.status === "completed" && id && token ? (
                <div className="rounded-xl bg-[#0d7377]/6 border border-[#0d7377]/15 p-4">
                  <p className={`text-sm font-medium text-[#0d7377] mb-3 ${isRtl ? "font-arabic" : ""}`}>
                    {t("review_thank_you")}
                  </p>
                  <Link
                    href={`/review/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`}
                    className={`inline-block w-full text-center px-6 py-3 rounded-xl text-sm font-medium text-white ${isRtl ? "font-arabic" : ""}`}
                    style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
                  >
                    {t("review_leave_review")}
                  </Link>
                </div>
              ) : (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                  <p className={`text-sm font-medium text-amber-800 ${isRtl ? "font-arabic" : ""}`}>
                    {t("consultation_unavailable")}
                  </p>
                  <p className={`text-sm text-amber-700 mt-1 ${isRtl ? "font-arabic" : ""}`}>
                    {access?.denial?.code === "too_early" && opensAt
                      ? `${t("consultation_opens_at")} ${opensAt}`
                      : access?.denial?.code === "too_late"
                        ? t("consultation_window_closed")
                        : access?.denial?.message || t("consultation_unavailable")}
                  </p>
                </div>
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

export default function CustomerConsultationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#faf9f6]" />}>
      <CustomerConsultationInner />
    </Suspense>
  );
}
