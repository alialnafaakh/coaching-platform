import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSessionDurationMinutes } from "@/lib/consultationAccess";

type EmailLang = "en" | "ar";

type AppointmentEmailRow = {
  id: string;
  status: string;
  client_name: string;
  client_email: string;
  join_token: string;
  session_duration_minutes: number | null;
  final_price_usd: number | null;
  consultation_email_sent_at: string | null;
  consultation_email_last_error: string | null;
  time_slots: {
    date: string;
    start_time: string;
    end_time: string;
  } | null;
};

export type SendConsultationEmailResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; error: string; skipped?: boolean };

const COACH_NAME = "Maryem";

function getResendApiKey(): string {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Email is not configured.");
  return key;
}

function getEmailFrom(): string {
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) throw new Error("Email sender is not configured.");
  return from;
}

function getEmailReplyTo(): string {
  const replyTo = process.env.EMAIL_REPLY_TO?.trim();
  if (!replyTo) throw new Error("Email reply-to is not configured.");
  return replyTo;
}

/**
 * Production public site origin for consultation links.
 * Prefers NEXT_PUBLIC_SITE_URL, then existing NEXT_PUBLIC_APP_URL.
 * Rejects empty / localhost so tokens are never emailed with a bad base URL.
 */
export function getPublicSiteUrl(): string {
  const raw = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ""
  ).trim();
  const url = raw.replace(/\/$/, "");
  if (!url) {
    throw new Error("Production site URL is not configured.");
  }
  if (/localhost|127\.0\.0\.1/i.test(url)) {
    throw new Error("Production site URL must not be localhost.");
  }
  return url;
}

export function buildConsultationJoinUrl(
  appointmentId: string,
  joinToken: string,
  siteUrl = getPublicSiteUrl()
): string {
  const base = siteUrl.replace(/\/$/, "");
  return `${base}/consultation/${encodeURIComponent(appointmentId)}?token=${encodeURIComponent(joinToken)}`;
}

function resolveEmailLang(clientName: string): EmailLang {
  // No language column yet — prefer Arabic when the customer name uses Arabic script.
  return /[\u0600-\u06FF]/.test(clientName) ? "ar" : "en";
}

function formatPrice(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(Number(value))) return null;
  const n = Number(value);
  return `$${n.toFixed(n % 1 === 0 ? 0 : 2)}`;
}

function formatDateLabel(date: string, lang: EmailLang): string {
  const d = new Date(`${date}T12:00:00+03:00`);
  return new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(d);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmailContent(input: {
  lang: EmailLang;
  clientName: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  priceLabel: string | null;
  joinUrl: string;
}): { subject: string; html: string; text: string } {
  const start = input.startTime.slice(0, 5);
  const dateLabel = formatDateLabel(input.date, input.lang);
  const safeName = escapeHtml(input.clientName);
  const safeUrl = escapeHtml(input.joinUrl);
  const dir = input.lang === "ar" ? "rtl" : "ltr";
  const align = input.lang === "ar" ? "right" : "left";

  if (input.lang === "ar") {
    const subject = `رابط استشارتك مع ${COACH_NAME}`;
    const priceLine = input.priceLabel
      ? `<p style="margin:0 0 8px;color:#374151;">السعر: <strong>${escapeHtml(input.priceLabel)}</strong></p>`
      : "";
    const priceText = input.priceLabel ? `السعر: ${input.priceLabel}\n` : "";
    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<body style="margin:0;padding:0;background:#f7f5f0;font-family:Segoe UI,Tahoma,Arial,sans-serif;color:#1a1a2e;">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border:1px solid #e5e0d8;border-radius:16px;padding:28px;direction:rtl;text-align:right;">
    <p style="margin:0 0 12px;color:#0d7377;font-size:13px;font-weight:600;">تأكيد الاستشارة</p>
    <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;">مرحباً ${safeName}</h1>
    <p style="margin:0 0 16px;line-height:1.6;color:#4b5563;">تم تأكيد موعدك مع ${COACH_NAME}. تجدين تفاصيل الجلسة ورابط الانضمام الآمن أدناه.</p>
    <div style="background:#faf9f6;border:1px solid #e5e0d8;border-radius:12px;padding:16px;margin:0 0 20px;">
      <p style="margin:0 0 8px;color:#374151;">التاريخ: <strong>${escapeHtml(dateLabel)}</strong></p>
      <p style="margin:0 0 8px;color:#374151;">الوقت: <strong>${escapeHtml(start)} (توقيت إسطنبول)</strong></p>
      <p style="margin:0 0 8px;color:#374151;">المدة: <strong>${input.durationMinutes} دقيقة</strong></p>
      ${priceLine}
    </div>
    <p style="margin:0 0 18px;text-align:center;">
      <a href="${safeUrl}" style="display:inline-block;background:#0d7377;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;">الانضمام إلى الاستشارة</a>
    </p>
    <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;">هذا الرابط خاص بك. يُرجى عدم مشاركته. يمكنك الدخول قبل الموعد بوقت قصير وفق نافذة الانضمام المتاحة.</p>
  </div>
</body>
</html>`;
    const text = `مرحباً ${input.clientName}

تم تأكيد موعدك مع ${COACH_NAME}.

التاريخ: ${dateLabel}
الوقت: ${start} (توقيت إسطنبول)
المدة: ${input.durationMinutes} دقيقة
${priceText}
الانضمام إلى الاستشارة:
${input.joinUrl}
`;
    return { subject, html, text };
  }

  const subject = `Your consultation link with ${COACH_NAME}`;
  const priceLine = input.priceLabel
    ? `<p style="margin:0 0 8px;color:#374151;">Price: <strong>${escapeHtml(input.priceLabel)}</strong></p>`
    : "";
  const priceText = input.priceLabel ? `Price: ${input.priceLabel}\n` : "";
  const html = `<!DOCTYPE html>
<html lang="en" dir="ltr">
<body style="margin:0;padding:0;background:#f7f5f0;font-family:Georgia,'Times New Roman',serif;color:#1a1a2e;">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border:1px solid #e5e0d8;border-radius:16px;padding:28px;direction:${dir};text-align:${align};">
    <p style="margin:0 0 12px;color:#0d7377;font-size:13px;font-weight:600;font-family:Segoe UI,Arial,sans-serif;">Consultation confirmed</p>
    <h1 style="margin:0 0 16px;font-size:26px;line-height:1.3;">Hello ${safeName}</h1>
    <p style="margin:0 0 16px;line-height:1.6;color:#4b5563;font-family:Segoe UI,Arial,sans-serif;">Your session with ${COACH_NAME} is confirmed. Details and your secure join link are below.</p>
    <div style="background:#faf9f6;border:1px solid #e5e0d8;border-radius:12px;padding:16px;margin:0 0 20px;font-family:Segoe UI,Arial,sans-serif;">
      <p style="margin:0 0 8px;color:#374151;">Date: <strong>${escapeHtml(dateLabel)}</strong></p>
      <p style="margin:0 0 8px;color:#374151;">Time: <strong>${escapeHtml(start)} (Istanbul time)</strong></p>
      <p style="margin:0 0 8px;color:#374151;">Duration: <strong>${input.durationMinutes} minutes</strong></p>
      ${priceLine}
    </div>
    <p style="margin:0 0 18px;text-align:center;font-family:Segoe UI,Arial,sans-serif;">
      <a href="${safeUrl}" style="display:inline-block;background:#0d7377;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;">Join consultation</a>
    </p>
    <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;font-family:Segoe UI,Arial,sans-serif;">This link is private to you. Please do not share it. You can enter shortly before the scheduled start within the available join window.</p>
  </div>
</body>
</html>`;
  const text = `Hello ${input.clientName}

Your session with ${COACH_NAME} is confirmed.

Date: ${dateLabel}
Time: ${start} (Istanbul time)
Duration: ${input.durationMinutes} minutes
${priceText}
Join consultation:
${input.joinUrl}
`;
  return { subject, html, text };
}

function safeEmailError(err: unknown): string {
  if (err instanceof Error) {
    return err.message.slice(0, 300);
  }
  return "Unable to send consultation email.";
}

async function loadAppointmentForEmail(
  db: SupabaseClient,
  appointmentId: string
): Promise<AppointmentEmailRow | null> {
  const { data, error } = await db
    .from("appointments")
    .select(
      "id, status, client_name, client_email, join_token, session_duration_minutes, final_price_usd, consultation_email_sent_at, consultation_email_last_error, time_slots(date, start_time, end_time)"
    )
    .eq("id", appointmentId)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as AppointmentEmailRow;
}

/**
 * Sends the secure consultation invitation to the appointment's stored client_email.
 * Never accepts a client-supplied recipient. Never logs join_token or the join URL.
 */
export async function sendConsultationInvitationEmail(
  db: SupabaseClient,
  appointmentId: string,
  options: { force?: boolean } = {}
): Promise<SendConsultationEmailResult> {
  const force = Boolean(options.force);
  const appt = await loadAppointmentForEmail(db, appointmentId);
  if (!appt) {
    return { ok: false, error: "Appointment not found." };
  }

  if (appt.status !== "confirmed" && appt.status !== "in_progress") {
    return {
      ok: false,
      error: "Consultation email is only sent for confirmed appointments.",
      skipped: true,
    };
  }

  if (!force && appt.consultation_email_sent_at) {
    return { ok: true, skipped: true };
  }

  if (!appt.client_email || !appt.join_token || !appt.time_slots?.date || !appt.time_slots?.start_time) {
    const error = "Appointment is missing email or schedule details.";
    await db
      .from("appointments")
      .update({ consultation_email_last_error: error })
      .eq("id", appointmentId);
    return { ok: false, error };
  }

  if (!force) {
    const claimAt = new Date().toISOString();
    const { data: claimed, error: claimError } = await db
      .from("appointments")
      .update({
        consultation_email_sent_at: claimAt,
        consultation_email_last_error: null,
      })
      .eq("id", appointmentId)
      .is("consultation_email_sent_at", null)
      .in("status", ["confirmed", "in_progress"])
      .select("id")
      .maybeSingle();

    if (claimError) {
      console.error("Consultation email claim failed", {
        appointmentId,
        message: claimError.message,
      });
      return { ok: false, error: "Unable to prepare consultation email." };
    }

    if (!claimed) {
      return { ok: true, skipped: true };
    }
  }

  try {
    const joinUrl = buildConsultationJoinUrl(appointmentId, appt.join_token);
    const lang = resolveEmailLang(appt.client_name);
    const durationMinutes = resolveSessionDurationMinutes(appt, appt.time_slots);
    const content = buildEmailContent({
      lang,
      clientName: appt.client_name,
      date: appt.time_slots.date,
      startTime: appt.time_slots.start_time,
      durationMinutes,
      priceLabel: formatPrice(appt.final_price_usd),
      joinUrl,
    });

    const resend = new Resend(getResendApiKey());
    const { error } = await resend.emails.send({
      from: getEmailFrom(),
      to: appt.client_email,
      replyTo: getEmailReplyTo(),
      subject: content.subject,
      html: content.html,
      text: content.text,
    });

    if (error) {
      throw new Error(error.message || "Resend rejected the email.");
    }

    await db
      .from("appointments")
      .update({
        consultation_email_sent_at: new Date().toISOString(),
        consultation_email_last_error: null,
      })
      .eq("id", appointmentId);

    return { ok: true };
  } catch (err) {
    const message = safeEmailError(err);
    console.error("Consultation email send failed", {
      appointmentId,
      message,
    });
    await db
      .from("appointments")
      .update({
        consultation_email_sent_at: force ? appt.consultation_email_sent_at : null,
        consultation_email_last_error: message,
      })
      .eq("id", appointmentId);
    return { ok: false, error: message };
  }
}

/** Fire-and-forget safe wrapper for confirm transitions (never throws). */
export async function notifyConsultationConfirmed(
  db: SupabaseClient,
  appointmentId: string
): Promise<void> {
  try {
    await sendConsultationInvitationEmail(db, appointmentId, { force: false });
  } catch (err) {
    console.error("Consultation email notify failed", {
      appointmentId,
      message: safeEmailError(err),
    });
  }
}
