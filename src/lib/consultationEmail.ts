import "server-only";
import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { referenceAmount } from "@/lib/wayl";
import { CONSULTATION_TZ_OFFSET, resolveSessionDurationMinutes } from "@/lib/consultationAccess";

type EmailLang = "en" | "ar";

type AppointmentEmailRow = {
  id: string;
  status: string;
  payment_status: string;
  client_name: string;
  client_email: string;
  join_token: string;
  notes: string | null;
  payment_reference: string | null;
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
  let parsed: URL;
  try { parsed = new URL(url); }
  catch { throw new Error("Production site URL is invalid."); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password ||
      parsed.origin !== url || /localhost|127\.0\.0\.1|\[::1\]/i.test(parsed.hostname)) {
    throw new Error("Production site URL must be a public HTTPS origin.");
  }
  return parsed.origin;
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

function getConsultantNotificationEmail(): string {
  const recipient = process.env.CONSULTANT_NOTIFICATION_EMAIL?.trim();
  if (!recipient || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(recipient)) {
    throw new Error("CONSULTANT_EMAIL_NOT_CONFIGURED");
  }
  return recipient;
}

function buildConsultantEmailContent(appt: AppointmentEmailRow): { subject: string; html: string; text: string } {
  if (!appt.time_slots || !appt.payment_reference) throw new Error("EMAIL_DETAILS_UNAVAILABLE");
  const slot = appt.time_slots;
  // This is the amount already validated by the webhook, not a new rate conversion.
  const actualIqd = referenceAmount(appt.payment_reference, appt.final_price_usd);
  const duration = resolveSessionDurationMinutes(appt, slot);
  const consultationUrl = `${getPublicSiteUrl()}/admin/appointments/${encodeURIComponent(appt.id)}/consultation`;
  const details = [
    ["Customer", appt.client_name], ["Email", appt.client_email],
    ["Date", slot.date], ["Start time", slot.start_time.slice(0, 5)],
    ...(slot.end_time ? [["End time", slot.end_time.slice(0, 5)]] : []),
    ["Duration", `${duration} minutes`], ["Timezone", `Istanbul / TRT (UTC${CONSULTATION_TZ_OFFSET})`],
    ["Final session price", `${formatPrice(appt.final_price_usd)} USD`],
    ["Amount paid", `${actualIqd.toLocaleString("en-US")} IQD`],
    ["Payment status", "Paid"], ["Appointment status", "Confirmed"],
    ...(appt.notes?.trim() ? [["Customer notes", appt.notes.trim()]] : []),
  ];
  const rows = details.map(([label, value]) => `<p style="margin:0 0 12px;line-height:1.6;overflow-wrap:anywhere;"><span style="color:#6b7280;">${escapeHtml(label)}</span><br><strong style="white-space:pre-wrap;unicode-bidi:plaintext;">${escapeHtml(value)}</strong></p>`).join("");
  const subject = `New Confirmed Consultation — ${appt.client_name.replace(/[\r\n]/g, " ")} — ${slot.date}`;
  const html = `<!DOCTYPE html><html lang="en" dir="ltr"><body style="margin:0;background:#f7f5f0;color:#1a1a2e;font-family:Segoe UI,Arial,sans-serif;">
    <div style="max-width:560px;margin:24px auto;padding:0 12px;"><div style="background:#fff;border:1px solid #e5e0d8;border-top:3px solid #c9952b;border-radius:16px;padding:24px;">
    <p style="margin:0 0 12px;color:#0d7377;font-weight:600;">Maryem · New paid consultation</p>
    <h1 style="font-family:Georgia,serif;font-size:26px;line-height:1.3;margin:0 0 16px;">Consultation confirmed</h1>
    <p style="line-height:1.6;color:#4b5563;">A customer has completed payment. Your appointment details are below.</p>
    <div style="background:#faf9f6;border:1px solid #e5e0d8;border-radius:12px;padding:16px;margin:20px 0;">${rows}</div>
    <p style="text-align:center;margin:0 0 16px;"><a href="${escapeHtml(consultationUrl)}" style="display:inline-block;background:#0d7377;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;">Join consultation</a></p>
    <p style="font-size:12px;line-height:1.6;color:#6b7280;margin:0;">Consultant access requires your admin sign-in. Keep these customer details private.</p>
    </div></div></body></html>`;
  const text = `Maryem — New confirmed consultation\n\n${details.map(([label, value]) => `${label}: ${value}`).join("\n")}\n\nJoin consultation (admin sign-in required):\n${consultationUrl}`;
  return { subject, html, text };
}

async function loadAppointmentForEmail(
  db: SupabaseClient,
  appointmentId: string
): Promise<AppointmentEmailRow | null> {
  const { data, error } = await db
    .from("appointments")
    .select(
      "id, status, payment_status, client_name, client_email, join_token, notes, payment_reference, session_duration_minutes, final_price_usd, consultation_email_sent_at, consultation_email_last_error, time_slots(date, start_time, end_time)"
    )
    .eq("id", appointmentId)
    .maybeSingle();

  if (error) throw new Error("EMAIL_APPOINTMENT_UNAVAILABLE");
  if (!data) return null;
  return data as unknown as AppointmentEmailRow;
}

type EmailJob = {
  id: string; appointment_id: string; lease_token: string; purpose: string;
};

export async function processConsultationEmailJob(
  db: SupabaseClient, jobId: string
): Promise<SendConsultationEmailResult> {
  const { data: claimed, error: claimError } = await db.rpc("claim_consultation_email", { p_job_id: jobId });
  if (claimError) return { ok: false, error: "Unable to prepare invitation." };
  if (!claimed) return { ok: true, skipped: true };
  const job = claimed as EmailJob;
  async function finish(providerId: string | null, skipped = false) {
    const { data, error } = await db.rpc("finish_consultation_email", {
      p_job_id: job.id, p_lease_token: job.lease_token, p_provider_id: providerId,
      p_error_code: providerId ? null : "EMAIL_DELIVERY_UNAVAILABLE", p_skipped: skipped,
    });
    return !error && data === true;
  }
  try {
    const appt = await loadAppointmentForEmail(db, job.appointment_id);
    if (!appt || appt.payment_status !== "paid" || !["confirmed", "in_progress"].includes(appt.status)) {
      if (!await finish(null, true)) throw new Error("EMAIL_FINISH_FAILED");
      return { ok: true, skipped: true };
    }
    if (!appt.client_email || (job.purpose !== "consultant_notification" && !appt.join_token) || !appt.time_slots?.date || !appt.time_slots.start_time) {
      throw new Error("EMAIL_DETAILS_UNAVAILABLE");
    }
    const isConsultant = job.purpose === "consultant_notification";
    if (!isConsultant && job.purpose !== "invitation" && !job.purpose.startsWith("resend-")) {
      throw new Error("EMAIL_PURPOSE_INVALID");
    }
    const content = isConsultant ? buildConsultantEmailContent(appt) : buildEmailContent({
      lang: resolveEmailLang(appt.client_name), clientName: appt.client_name,
      date: appt.time_slots.date, startTime: appt.time_slots.start_time,
      durationMinutes: resolveSessionDurationMinutes(appt, appt.time_slots),
      priceLabel: formatPrice(appt.final_price_usd),
      joinUrl: buildConsultationJoinUrl(appt.id, appt.join_token),
    });
    const recipient = isConsultant ? getConsultantNotificationEmail() : appt.client_email;
    const resend = new Resend(getResendApiKey());
    const { data, error } = await resend.emails.send({
      from: getEmailFrom(), to: recipient, replyTo: getEmailReplyTo(),
      subject: content.subject, html: content.html, text: content.text,
    }, { idempotencyKey: "consultation/" + job.id });
    if (error || !data?.id) throw new Error("EMAIL_PROVIDER_UNAVAILABLE");
    if (!await finish(data.id)) {
      // Retain the lease/job: retry uses the SAME provider key after interruption.
      console.error("EMAIL_ACCEPTANCE_PERSIST_FAILED");
      return { ok: false, error: "Invitation delivery is pending verification." };
    }
    return { ok: true };
  } catch {
    console.error("EMAIL_DELIVERY_UNAVAILABLE");
    await finish(null);
    return { ok: false, error: "Invitation delivery is queued for retry." };
  }
}

export async function sendConsultationInvitationEmail(
  db: SupabaseClient, appointmentId: string, options: { force?: boolean } = {}
): Promise<SendConsultationEmailResult> {
  const appt = await loadAppointmentForEmail(db, appointmentId);
  if (!appt || appt.payment_status !== "paid" || !["confirmed", "in_progress"].includes(appt.status)) {
    return { ok: false, error: "Consultation email requires a paid, confirmed booking.", skipped: true };
  }
  const { data: jobId, error } = await db.rpc("queue_consultation_email", {
    p_appointment_id: appointmentId, p_force: Boolean(options.force),
  });
  if (error) return { ok: false, error: "Unable to queue invitation." };
  if (!jobId) return { ok: true, skipped: true };
  return processConsultationEmailJob(db, jobId);
}

export async function notifyConsultationConfirmed(db: SupabaseClient, appointmentId: string): Promise<void> {
  try { await sendConsultationInvitationEmail(db, appointmentId); }
  catch { console.error("EMAIL_NOTIFY_UNAVAILABLE"); }
  // Only process a job created by the verified payment transaction; never backfill.
  try {
    const { data, error } = await db.from("consultation_email_jobs").select("id")
      .eq("appointment_id", appointmentId).eq("purpose", "consultant_notification").maybeSingle();
    if (error) throw new Error("EMAIL_QUEUE_UNAVAILABLE");
    if (data) await processConsultationEmailJob(db, data.id);
  } catch { console.error("CONSULTANT_EMAIL_NOTIFY_UNAVAILABLE"); }
}

export async function retryConsultationEmails(db: SupabaseClient): Promise<{ processed: number; failed: number }> {
  const { data, error } = await db.from("consultation_email_jobs").select("id")
    .in("status", ["pending", "processing"]).lte("next_attempt_at", new Date().toISOString())
    .order("next_attempt_at").limit(10);
  if (error) throw new Error("EMAIL_QUEUE_UNAVAILABLE");
  let failed = 0;
  for (const job of data || []) if (!(await processConsultationEmailJob(db, job.id)).ok) failed++;
  return { processed: (data || []).length, failed };
}
