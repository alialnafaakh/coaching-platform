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

function redactDailyText(value: unknown): string {
  return String(value ?? "")
    .replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, "[redacted-jwt]")
    .replace(/token=[^&\s]+/gi, "token=[redacted]")
    .replace(/\bBearer\s+\S+/gi, "Bearer [redacted]")
    .slice(0, 300);
}

type SafeDailyErrorFields = {
  name: string | null;
  message: string | null;
  errorMsg: string | null;
  type: string | null;
  code: string | null;
  fatal: boolean | null;
  action: string | null;
};

/**
 * TEMP diagnostic helper: extract only safe Daily error metadata for DevTools.
 * Never includes tokens, URLs with query params, or API keys.
 */
function safeDailyErrorFields(err: unknown): SafeDailyErrorFields {
  const obj =
    err && typeof err === "object" ? (err as Record<string, unknown>) : null;
  const nested =
    obj?.error && typeof obj.error === "object"
      ? (obj.error as Record<string, unknown>)
      : null;

  const name =
    (typeof obj?.name === "string" && obj.name) ||
    (err instanceof Error ? err.name : null) ||
    null;

  const message = redactDailyText(
    obj?.message ?? (err instanceof Error ? err.message : err)
  );

  const errorMsg = redactDailyText(
    obj?.errorMsg ?? nested?.errorMsg ?? nested?.message ?? null
  );

  const type =
    (typeof nested?.type === "string" && nested.type) ||
    (typeof obj?.type === "string" && obj.type) ||
    null;

  const codeRaw = nested?.code ?? obj?.code ?? nested?.error ?? obj?.error;
  const code =
    typeof codeRaw === "string" || typeof codeRaw === "number"
      ? String(codeRaw).slice(0, 120)
      : null;

  const action = typeof obj?.action === "string" ? obj.action : null;

  let fatal: boolean | null = null;
  if (typeof obj?.fatal === "boolean") fatal = obj.fatal;
  else if (action === "error") fatal = true;
  else if (action === "nonfatal-error") fatal = false;
  else if (type && ["ejected", "nbf-room", "nbf-token", "exp-room", "exp-token", "no-room", "meeting-full", "end-of-life", "not-allowed", "connection-error"].includes(type)) {
    fatal = true;
  }

  return {
    name,
    message: message || null,
    errorMsg: errorMsg || null,
    type,
    code,
    fatal,
    action,
  };
}

function roomHostOnly(roomUrl: string): string {
  try {
    return new URL(roomUrl).host;
  } catch {
    return "invalid_url";
  }
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

  useDailyEvent("joined-meeting", () => {
    console.info("[DailyDiag] event joined-meeting", { role });
    setStatus("joined");
  });
  useDailyEvent("left-meeting", () => {
    console.info("[DailyDiag] event left-meeting", { role });
    setStatus("left");
  });
  useDailyEvent("error", (ev) => {
    console.error("[DailyDiag] event error", {
      ...safeDailyErrorFields(ev),
      role,
    });
    setStatus("error");
    setError(ev?.errorMsg || t("call_error"));
  });
  useDailyEvent("nonfatal-error", (ev) => {
    console.warn("[DailyDiag] event nonfatal-error", {
      ...safeDailyErrorFields(ev),
      role,
    });
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
    const onCallError = (ev: unknown) => {
      console.error("[DailyDiag] call.on(error) before/during join", {
        ...safeDailyErrorFields(ev),
        meetingState: call?.meetingState?.() ?? null,
        role,
        roomHost: roomHostOnly(roomUrl),
      });
    };
    const onCallNonFatal = (ev: unknown) => {
      console.warn("[DailyDiag] call.on(nonfatal-error) before/during join", {
        ...safeDailyErrorFields(ev),
        meetingState: call?.meetingState?.() ?? null,
        role,
        roomHost: roomHostOnly(roomUrl),
      });
    };

    try {
      // TEMP diagnostic: detect orphaned Daily instances from prior mounts.
      const existing = DailyIframe.getCallInstance?.() ?? null;
      if (existing) {
        console.warn("[DailyDiag] existing call instance before create", {
          meetingState: existing.meetingState?.(),
          role,
        });
      }

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
      // Attach listeners before join so DevTools sees the rejection even if
      // DailyProvider/useDailyEvent is not mounted yet for this frame.
      call.on("error", onCallError);
      call.on("nonfatal-error", onCallNonFatal);

      setCallObject(call);
      await call.join({ url: roomUrl, token, userName });
      console.info("[DailyDiag] join resolved", {
        meetingState: call.meetingState?.(),
        role,
        roomHost: roomHostOnly(roomUrl),
      });
    } catch (err) {
      console.error("[DailyDiag] Daily join failed", {
        ...safeDailyErrorFields(err),
        meetingState: call?.meetingState?.() ?? null,
        role,
        roomHost: roomHostOnly(roomUrl),
        hadExistingInstance: Boolean(DailyIframe.getCallInstance?.()),
        // Help distinguish Error vs plain event-shaped throws.
        thrownValueType: err === null ? "null" : typeof err,
        thrownIsError: err instanceof Error,
        thrownOwnKeys:
          err && typeof err === "object"
            ? Object.keys(err as object).slice(0, 20)
            : [],
      });
      setBootError(t("call_error"));
      try {
        call?.off("error", onCallError);
        call?.off("nonfatal-error", onCallNonFatal);
        await call?.destroy();
      } catch {
        // ignore
      }
      setCallObject(null);
    } finally {
      setStarting(false);
    }
  }, [roomUrl, token, userName, t, role]);

  useEffect(() => {
    start();
    return () => {
      // BUG (diagnostic note): this closes over callObject from effect setup time,
      // which is null on first mount — so cleanup often does not destroy the live call.
      console.warn("[DailyDiag] effect cleanup", {
        hadCallObjectInClosure: Boolean(callObject),
        meetingState: callObject?.meetingState?.(),
        globalInstanceState: DailyIframe.getCallInstance?.()?.meetingState?.(),
        role,
      });
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
