import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";

// Contract: https://api.thewayl.com/openapi.v1.json and https://wayl.io/docs
const WAYL_API_BASE = "https://api.thewayl.com/api/v1";

export class WaylError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
    this.name = "WaylError";
  }
}

export function requireWaylTestMode(): void {
  if (process.env.WAYL_ENV !== "test") {
    throw new WaylError("Test payments are not configured.", 503);
  }
}

export function getWaylCheckoutConfig() {
  requireWaylTestMode();
  const token = process.env.WAYL_API_TOKEN?.trim();
  const webhookSecret = process.env.WAYL_WEBHOOK_SECRET?.trim();
  const rawRate = process.env.WAYL_USD_TO_IQD_RATE?.trim();
  const rate = rawRate && /^\d+(?:\.\d+)?$/.test(rawRate) ? Number(rawRate) : NaN;
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new WaylError("Payment currency conversion is not configured.", 503);
  }
  if (!token || !webhookSecret || webhookSecret.length < 10 || webhookSecret.length > 255) {
    throw new WaylError("Test payments are not configured.", 503);
  }
  let site: URL;
  try {
    site = new URL(process.env.WAYL_CALLBACK_ORIGIN?.trim() || "");
  } catch {
    throw new WaylError("Payment callback URL is not configured.", 503);
  }
  if (site.protocol !== "https:" || site.username || site.password ||
      site.pathname !== "/" || site.search || site.hash ||
      ["localhost", "127.0.0.1", "[::1]"].includes(site.hostname)) {
    throw new WaylError("Payment callback URL is not configured.", 503);
  }
  return { token, webhookSecret, rate, siteOrigin: site.origin };
}

function usdCents(value: unknown): number {
  const price = typeof value === "number" ? value :
    typeof value === "string" && /^\d+(?:\.\d{1,2})?$/.test(value) ? Number(value) : NaN;
  const cents = Math.round(price * 100);
  if (!Number.isFinite(price) || price <= 0 || !Number.isSafeInteger(cents) ||
      Math.abs(price * 100 - cents) > 0.000001) {
    throw new WaylError("Booking pricing is unavailable.", 409);
  }
  return cents;
}

export function quoteWaylPayment(priceUsd: unknown, rate: number) {
  const cents = usdCents(priceUsd);
  const totalIqd = Math.round(cents * rate / 100);
  if (!Number.isFinite(rate) || rate <= 0 || !Number.isSafeInteger(totalIqd) || totalIqd < 1000) {
    throw new WaylError("Payment currency conversion is not configured.", 503);
  }
  // Preserve the charge quote in the existing reference column so webhook
  // validation does not depend on subsequent exchange-rate configuration changes.
  const referenceId = "wayl_test_" + randomUUID() + "_" + cents + "_" + totalIqd;
  return { referenceId, totalIqd };
}

export function referenceAmount(reference: string, priceUsd: unknown): number {
  const match = /^wayl_test_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}_(\d+)_(\d+)$/.exec(reference);
  if (!match || Number(match[1]) !== usdCents(priceUsd)) {
    throw new WaylError("Payment reference does not match booking pricing.", 409);
  }
  const amount = Number(match[2]);
  if (!Number.isSafeInteger(amount) || amount < 1000) {
    throw new WaylError("Payment reference is invalid.", 409);
  }
  return amount;
}

export function validWaylCheckoutUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "checkout.thewayl.com" &&
      !url.username && !url.password && !url.port && !url.hash &&
      (url.pathname.startsWith("/pay/") ||
       (url.pathname === "/payment/action" && Boolean(url.searchParams.get("id"))));
  } catch {
    return false;
  }
}

export async function createPaymentLink(input: {
  referenceId: string;
  totalIqd: number;
  appointmentId: string;
  joinToken: string;
  expiresAt: string;
}): Promise<string> {
  const config = getWaylCheckoutConfig();
  const minutes = Math.floor((Date.parse(input.expiresAt) - Date.now()) / 60000);
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 15) {
    throw new WaylError("This payment hold is ending. Please reserve another time.", 409);
  }
  const returnUrl = new URL("/booking-confirmed", config.siteOrigin);
  returnUrl.searchParams.set("id", input.appointmentId);
  returnUrl.searchParams.set("token", input.joinToken);
  returnUrl.searchParams.set("payment", "returned");
  try {
    const response = await fetch(WAYL_API_BASE + "/links", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-WAYL-AUTHENTICATION": config.token,
      },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        env: "test",
        referenceId: input.referenceId,
        total: input.totalIqd,
        currency: "IQD",
        customParameter: "",
        lineItem: [{ label: "Maryem coaching session", amount: input.totalIqd, type: "increase" }],
        webhookUrl: config.siteOrigin + "/api/payments/webhook",
        webhookSecret: config.webhookSecret,
        redirectionUrl: returnUrl.toString(),
        linkExpiresIn: minutes + "m",
      }),
    });
    if (response.status !== 201) throw new Error("Unexpected response");
    const payload = await response.json();
    const data = payload?.data;
    if (data?.referenceId !== input.referenceId || data?.currency !== "IQD" ||
        Number(data?.total) !== input.totalIqd || !validWaylCheckoutUrl(data?.url)) {
      throw new Error("Unexpected response");
    }
    return data.url;
  } catch {
    // Never forward upstream messages, response bodies, tokens or callback URLs.
    throw new WaylError("Unable to prepare test checkout. Please contact support before retrying.");
  }
}

export function verifyWaylSignature(rawBody: Uint8Array, signature: string | null): boolean {
  const secret = process.env.WAYL_WEBHOOK_SECRET?.trim();
  if (!secret || !signature || !/^[0-9a-fA-F]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  return timingSafeEqual(Buffer.from(signature, "hex"), expected);
}

export function isWaylPaid(payload: Record<string, unknown>): boolean {
  // Never infer payment from an event name. Webhook paymentStatus takes precedence.
  const status = payload.paymentStatus ?? payload.status;
  return status === "Paid" || status === "Complete" || status === "Delivered";
}

export function validateWaylPayment(payload: Record<string, unknown>, expectedIqd: number): boolean {
  const total = payload.total;
  if ((typeof total !== "number" && typeof total !== "string") ||
      (typeof total === "string" && !/^\d+(?:\.0+)?$/.test(total)) ||
      Number(total) !== expectedIqd) return false;
  // The documented webhook includes total but not currency/env. Validate those
  // when supplied; IQD/test are pinned in our stored reference and request.
  if (payload.currency !== undefined && payload.currency !== "IQD") return false;
  if (payload.env !== undefined && payload.env !== "test") return false;
  if (payload.status !== undefined && payload.paymentStatus !== undefined &&
      !["Complete", "Delivered", "Paid"].includes(String(payload.status))) return false;
  return true;
}
