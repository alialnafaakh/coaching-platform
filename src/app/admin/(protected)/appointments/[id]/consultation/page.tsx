"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
    session_duration_minutes: number;
    join_opens_at: string;
  };
};

type JoinPayload = {
  room_url: string;
  token: string;
  user_name: string;
};

export default function AdminConsultationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isRtl, t, lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [access, setAccess] = useState<AccessPayload | null>(null);
  const [join, setJoin] = useState<JoinPayload | null>(null);

  const loadAccess = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/consultations/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || t("consultation_unavailable"));
      setAccess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_generic"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    loadAccess();
  }, [loadAccess]);

  const handleJoin = async () => {
    if (!id) return;
    setJoining(true);
    setError("");
    try {
      const res = await fetch(`/api/consultations/${encodeURIComponent(id)}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || t("call_error"));
      setJoin({
        room_url: data.room_url,
        token: data.token,
        user_name: data.user_name,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("call_error"));
      await loadAccess();
    } finally {
      setJoining(false);
    }
  };

  const handleEnd = async () => {
    if (!id) return;
    const res = await fetch(`/api/consultations/${encodeURIComponent(id)}/end`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || t("error_generic"));
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
      <div className="min-h-[70vh] w-full min-w-0 rounded-2xl md:rounded-3xl bg-[#0f172a] text-white p-3 sm:p-4 md:p-6 -mx-1 sm:mx-0">
        <h1 className={`text-lg sm:text-xl mb-4 break-words ${isRtl ? "font-arabic text-right" : ""}`}>
          {t("consultation_room_title")} — {appt?.client_name || ""}
        </h1>
        <ConsultationRoom
          roomUrl={join.room_url}
          token={join.token}
          userName={join.user_name}
          role="coach"
          onEndConsultation={handleEnd}
          onLeave={() => {
            setJoin(null);
            router.push("/admin/appointments");
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <Link href="/admin/appointments" className="text-sm text-[#0d7377] hover:underline">
        ← Appointments
      </Link>
      <h1
        className="text-3xl text-[#1a1a2e] mt-3 mb-2"
        style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
      >
        {t("consultation_room_title")}
      </h1>
      <p className="text-sm text-[#6b7280] mb-6">{t("istanbul_time")}</p>

      {loading ? (
        <div className="h-32 bg-white rounded-2xl animate-pulse border border-[#e5e0d8]" />
      ) : error ? (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
      ) : appt ? (
        <div className="bg-white rounded-2xl border border-[#e5e0d8] p-6 space-y-4">
          <div>
            <p className="font-medium text-[#1a1a2e]">{appt.client_name}</p>
            <p className="text-sm text-[#6b7280] mt-1">
              {formattedDate} · {appt.start_time.slice(0, 5)} · {appt.session_duration_minutes}{" "}
              {t("minutes_unit")}
            </p>
            <p className="text-xs text-[#9ca3af] mt-1 capitalize">{appt.status.replaceAll("_", " ")}</p>
          </div>

          {access?.can_join ? (
            <button
              type="button"
              onClick={handleJoin}
              disabled={joining}
              className="w-full py-3 rounded-xl text-white text-sm font-medium disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
            >
              {joining ? t("connecting") : t("enter_consultation")}
            </button>
          ) : (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
              {access?.denial?.code === "too_early" && opensAt
                ? `${t("consultation_opens_at")} ${opensAt}`
                : access?.denial?.code === "too_late"
                  ? t("consultation_window_closed")
                  : access?.denial?.message || t("consultation_unavailable")}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
