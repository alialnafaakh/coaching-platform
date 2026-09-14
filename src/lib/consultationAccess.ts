import type { Appointment, AppointmentStatus, TimeSlot } from "@/types";

/** Project booking times are wall-clock Istanbul / TRT (UTC+3, no DST). */
export const CONSULTATION_TZ_OFFSET = "+03:00";
export const JOIN_EARLY_MINUTES = 10;
export const JOIN_LATE_BUFFER_MINUTES = 15;
export const DEFAULT_SESSION_MINUTES = 40;

export type JoinWindow = {
  scheduledStartIso: string;
  scheduledEndIso: string;
  joinOpensAtIso: string;
  joinClosesAtIso: string;
  sessionDurationMinutes: number;
};

export type AccessDenialCode =
  | "not_found"
  | "unauthorized"
  | "pending_payment"
  | "cancelled"
  | "completed"
  | "too_early"
  | "too_late"
  | "invalid_status";

const JOINABLE: AppointmentStatus[] = ["confirmed", "in_progress"];

function padTime(time: string): string {
  const [h = "00", m = "00"] = time.slice(0, 5).split(":");
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}:00`;
}

function asPositiveInt(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

/** Interpret a slot date + local Istanbul time as an absolute instant. */
export function istanbulDateTime(date: string, time: string): Date {
  return new Date(`${date}T${padTime(time)}${CONSULTATION_TZ_OFFSET}`);
}

/**
 * Prefer the appointment's booked snapshot duration.
 * Fall back to slot length, then default — never current global settings.
 */
export function resolveSessionDurationMinutes(
  appt: Pick<Appointment, "session_duration_minutes">,
  slot?: Pick<TimeSlot, "start_time" | "end_time"> | null
): number {
  const snapped = asPositiveInt(appt.session_duration_minutes);
  if (snapped) return snapped;

  if (slot?.start_time && slot?.end_time) {
    const start = istanbulDateTime("1970-01-01", slot.start_time).getTime();
    const end = istanbulDateTime("1970-01-01", slot.end_time).getTime();
    const mins = Math.round((end - start) / 60000);
    if (mins > 0) return mins;
  }

  return DEFAULT_SESSION_MINUTES;
}

export function buildJoinWindow(
  appt: Pick<Appointment, "session_duration_minutes">,
  slot: Pick<TimeSlot, "date" | "start_time" | "end_time">
): JoinWindow {
  const sessionDurationMinutes = resolveSessionDurationMinutes(appt, slot);
  const scheduledStart = istanbulDateTime(slot.date, slot.start_time);
  const scheduledEnd = new Date(
    scheduledStart.getTime() + sessionDurationMinutes * 60 * 1000
  );
  const joinOpensAt = new Date(
    scheduledStart.getTime() - JOIN_EARLY_MINUTES * 60 * 1000
  );
  const joinClosesAt = new Date(
    scheduledEnd.getTime() + JOIN_LATE_BUFFER_MINUTES * 60 * 1000
  );

  return {
    scheduledStartIso: scheduledStart.toISOString(),
    scheduledEndIso: scheduledEnd.toISOString(),
    joinOpensAtIso: joinOpensAt.toISOString(),
    joinClosesAtIso: joinClosesAt.toISOString(),
    sessionDurationMinutes,
  };
}

export function evaluateJoinAccess(input: {
  status: AppointmentStatus;
  now?: Date;
  window: JoinWindow;
}): { ok: true } | { ok: false; code: AccessDenialCode; message: string; availableAt?: string } {
  const now = input.now ?? new Date();
  const { status, window } = input;

  if (status === "pending_payment") {
    return {
      ok: false,
      code: "pending_payment",
      message: "This booking is waiting for payment and cannot join the consultation yet.",
    };
  }
  if (status === "cancelled") {
    return { ok: false, code: "cancelled", message: "This consultation was cancelled." };
  }
  if (status === "completed") {
    return { ok: false, code: "completed", message: "This consultation has already ended." };
  }
  if (!JOINABLE.includes(status)) {
    return {
      ok: false,
      code: "invalid_status",
      message: "This consultation is not available to join.",
    };
  }

  const opens = new Date(window.joinOpensAtIso).getTime();
  const closes = new Date(window.joinClosesAtIso).getTime();
  const t = now.getTime();

  if (t < opens) {
    return {
      ok: false,
      code: "too_early",
      message: "The consultation room is not open yet.",
      availableAt: window.joinOpensAtIso,
    };
  }
  if (t > closes) {
    return {
      ok: false,
      code: "too_late",
      message: "The join window for this consultation has ended.",
    };
  }

  return { ok: true };
}

export function canOpenConsultation(status: AppointmentStatus): boolean {
  return JOINABLE.includes(status);
}

/** Stable Daily room name per appointment (prevents duplicate rooms on concurrent joins). */
export function dailyRoomNameForAppointment(appointmentId: string): string {
  return `m-${appointmentId.replace(/-/g, "")}`;
}
