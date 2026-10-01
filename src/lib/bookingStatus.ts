import type { PublicAppointment } from "@/types";
import type { StringTranslationKey } from "@/context/LanguageContext";

export function bookingStatusCopy(
  appointment: PublicAppointment | null,
  t: (key: StringTranslationKey) => string
) {
  if (!appointment) {
    return {
      badge: t("payment_required"),
      headline: t("booking_pending_headline"),
      tone: "pending" as const,
    };
  }

  if (appointment.payment_status === "paid" && appointment.status === "confirmed") {
    return {
      badge: t("confirmed_label"),
      headline: t("booked_headline"),
      tone: "confirmed" as const,
    };
  }

  if (appointment.payment_status === "paid" && appointment.status === "in_progress") {
    return {
      badge: t("in_progress_label"),
      headline: t("in_progress_label"),
      tone: "confirmed" as const,
    };
  }

  if (appointment.payment_status === "paid" && appointment.status === "completed") {
    return {
      badge: t("completed_label"),
      headline: t("completed_label"),
      tone: "confirmed" as const,
    };
  }

  if (appointment.status === "cancelled") {
    return {
      badge: t("cancelled_label"),
      headline: t("expired_hold"),
      tone: "cancelled" as const,
    };
  }

  return {
    badge: appointment.payment_status === "unpaid" ? t("payment_required") : t("pending_payment_label"),
    headline: t("booking_pending_headline"),
    tone: "pending" as const,
  };
}

