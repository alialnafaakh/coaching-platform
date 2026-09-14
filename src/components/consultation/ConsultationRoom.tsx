"use client";

import {
  DailyAudio,
  DailyProvider,
  DailyVideo,
  useDaily,
  useDailyEvent,
  useLocalSessionId,
  useParticipantIds,
} from "@daily-co/daily-react";
import DailyIframe, { type DailyCall } from "@daily-co/daily-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

type RoomProps = {
  roomUrl: string;
  token: string;
  userName: string;
  role: "customer" | "coach";
  onLeave: () => void;
  onEndConsultation?: () => Promise<void>;
};

function CallControls({
  role,
  onLeave,
  onEndConsultation,
}: {
  role: "customer" | "coach";
  onLeave: () => void;
  onEndConsultation?: () => Promise<void>;
}) {
  const daily = useDaily();
  const { isRtl, t } = useLanguage();
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [ending, setEnding] = useState(false);

  const toggleCam = async () => {
    if (!daily) return;
    const next = !camOn;
    await daily.setLocalVideo(next);
    setCamOn(next);
  };

  const toggleMic = async () => {
    if (!daily) return;
    const next = !micOn;
    await daily.setLocalAudio(next);
    setMicOn(next);
  };

  const leave = async () => {
    try {
      await daily?.leave();
    } catch {
      // ignore
    }
    onLeave();
  };

  const end = async () => {
    if (!onEndConsultation) return;
    if (!confirm(t("end_consultation_confirm"))) return;
    setEnding(true);
    try {
      await onEndConsultation();
      await daily?.leave();
      onLeave();
    } catch {
      setEnding(false);
    }
  };

  const btn =
    "px-4 py-2.5 rounded-full text-sm font-medium border transition-colors disabled:opacity-50";

  return (
    <div className={`flex flex-wrap items-center justify-center gap-3 ${isRtl ? "flex-row-reverse" : ""}`}>
      <button
        type="button"
        onClick={toggleMic}
        className={`${btn} ${micOn ? "bg-white text-[#1a1a2e] border-[#e5e0d8]" : "bg-red-600 text-white border-red-600"} ${isRtl ? "font-arabic" : ""}`}
      >
        {micOn ? t("mic_on") : t("mic_off")}
      </button>
      <button
        type="button"
        onClick={toggleCam}
        className={`${btn} ${camOn ? "bg-white text-[#1a1a2e] border-[#e5e0d8]" : "bg-red-600 text-white border-red-600"} ${isRtl ? "font-arabic" : ""}`}
      >
        {camOn ? t("camera_on") : t("camera_off")}
      </button>
      <button
        type="button"
        onClick={leave}
        className={`${btn} bg-[#1a1a2e] text-white border-[#1a1a2e] ${isRtl ? "font-arabic" : ""}`}
      >
        {t("leave_call")}
      </button>
      {role === "coach" && onEndConsultation && (
        <button
          type="button"
          onClick={end}
          disabled={ending}
          className={`${btn} bg-red-700 text-white border-red-700 ${isRtl ? "font-arabic" : ""}`}
        >
          {ending ? t("ending_consultation") : t("end_consultation")}
        </button>
      )}
    </div>
  );
}

function CallStage() {
  const { isRtl, t } = useLanguage();
  const localId = useLocalSessionId();
  const remoteIds = useParticipantIds({ filter: "remote" });
  const remoteId = remoteIds[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#111827] border border-white/10">
        {localId ? (
          <DailyVideo sessionId={localId} type="video" automirror className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm">
            {t("connecting")}
          </div>
        )}
        <span className={`absolute bottom-3 ${isRtl ? "right-3" : "left-3"} text-xs bg-black/50 text-white px-2 py-1 rounded-full ${isRtl ? "font-arabic" : ""}`}>
          {t("you_label")}
        </span>
      </div>

      <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#111827] border border-white/10">
        {remoteId ? (
          <DailyVideo sessionId={remoteId} type="video" className="w-full h-full object-cover" />
        ) : (
          <div className={`absolute inset-0 flex items-center justify-center text-white/60 text-sm px-4 text-center ${isRtl ? "font-arabic" : ""}`}>
            {t("waiting_for_other")}
          </div>
        )}
        <span className={`absolute bottom-3 ${isRtl ? "right-3" : "left-3"} text-xs bg-black/50 text-white px-2 py-1 rounded-full ${isRtl ? "font-arabic" : ""}`}>
          {t("other_participant")}
        </span>
      </div>
    </div>
  );
}

function ActiveCall({
  role,
  onLeave,
  onEndConsultation,
}: {
  role: "customer" | "coach";
  onLeave: () => void;
  onEndConsultation?: () => Promise<void>;
}) {
  const { isRtl, t } = useLanguage();
  const daily = useDaily();
  const [status, setStatus] = useState("connecting");
  const [error, setError] = useState("");

  useDailyEvent("joined-meeting", () => setStatus("joined"));
  useDailyEvent("left-meeting", () => setStatus("left"));
  useDailyEvent("error", (ev) => {
    setStatus("error");
    setError(ev?.errorMsg || t("call_error"));
  });
  useDailyEvent("network-connection", (ev) => {
    if (ev?.event === "interrupted") setStatus("reconnecting");
    if (ev?.event === "connected") setStatus("joined");
  });

  useEffect(() => {
    if (!daily) return;
    const current = daily.meetingState();
    if (current === "joined-meeting") setStatus("joined");
  }, [daily]);

  return (
    <div className="space-y-5">
      <div className={`text-center text-sm text-white/70 ${isRtl ? "font-arabic" : ""}`}>
        {status === "connecting" && t("connecting")}
        {status === "joined" && t("connected")}
        {status === "reconnecting" && t("reconnecting")}
        {status === "error" && (error || t("call_error"))}
        {status === "left" && t("left_call")}
      </div>
      <CallStage />
      <DailyAudio />
      <CallControls role={role} onLeave={onLeave} onEndConsultation={onEndConsultation} />
    </div>
  );
}

export default function ConsultationRoom(props: RoomProps) {
  const { roomUrl, token, userName, role, onLeave, onEndConsultation } = props;
  const { isRtl, t } = useLanguage();
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [bootError, setBootError] = useState("");
  const [starting, setStarting] = useState(true);

  const start = useCallback(async () => {
    setStarting(true);
    setBootError("");
    let call: DailyCall | null = null;
    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          stream.getTracks().forEach((track) => track.stop());
        } catch {
          // Allow join even if permissions denied; Daily can still connect with devices off.
          setBootError(t("media_permission_hint"));
        }
      }

      call = DailyIframe.createCallObject({
        videoSource: true,
        audioSource: true,
      });
      setCallObject(call);
      await call.join({ url: roomUrl, token, userName });
    } catch (err) {
      console.error("Daily join failed");
      setBootError(t("call_error"));
      try {
        await call?.destroy();
      } catch {
        // ignore
      }
      setCallObject(null);
    } finally {
      setStarting(false);
    }
  }, [roomUrl, token, userName, t]);

  useEffect(() => {
    start();
    return () => {
      try {
        callObject?.leave();
        callObject?.destroy();
      } catch {
        // ignore
      }
    };
    // Intentionally only on mount / room credentials change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomUrl, token]);

  const providerCall = useMemo(() => callObject, [callObject]);

  if (!providerCall) {
    return (
      <div className={`text-center text-white/80 py-16 ${isRtl ? "font-arabic" : ""}`}>
        <p>{starting ? t("connecting") : bootError || t("call_error")}</p>
        {!starting && (
          <button
            type="button"
            onClick={onLeave}
            className="mt-6 px-5 py-2.5 rounded-full bg-white text-[#1a1a2e] text-sm font-medium"
          >
            {t("back_home")}
          </button>
        )}
        {starting && bootError && (
          <p className="mt-3 text-xs text-amber-200 max-w-sm mx-auto">{bootError}</p>
        )}
      </div>
    );
  }

  return (
    <DailyProvider callObject={providerCall}>
      {bootError && (
        <p className={`mb-4 text-center text-xs text-amber-200 ${isRtl ? "font-arabic" : ""}`}>
          {bootError}
        </p>
      )}
      <ActiveCall role={role} onLeave={onLeave} onEndConsultation={onEndConsultation} />
    </DailyProvider>
  );
}
