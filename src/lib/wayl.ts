import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";

// Contract: https://api.thewayl.com/openapi.v1.json and https://wayl.io/docs
const WAYL_API_BASE = "https://api.thewayl.com/api/v1";

export class WaylError extends Error {
  constructor(message: string, public status = 502, public code?: string) {
    super(message);
    this.name = "WaylError";
  }
}

export type WaylEnvironment = "test" | "live";

export function getWaylEnvironment(): WaylEnvironment {
  const environment = process.env.WAYL_ENV;
  if (environment !== "test" && environment !== "live") {
    throw new WaylError("Payments are not configured.", 503, environment ? "WAYL_ENV_INVALID" : "WAYL_ENV_MISSING");
  }
  return environment;
}

export function getWaylCheckoutConfig() {
  const environment = getWaylEnvironment();
  const token = process.env.WAYL_API_TOKEN?.trim();
  const webhookSecret = process.env.WAYL_WEBHOOK_SECRET?.trim();
  const rawRate = process.env.WAYL_USD_TO_IQD_RATE?.trim();
  const rate = rawRate && /^\d+(?:\.\d+)?$/.test(rawRate) ? Number(rawRate) : NaN;
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new WaylError("Payment currency conversion is not configured.", 503, "WAYL_RATE_INVALID");
  }
  if (!token || !webhookSecret || webhookSecret.length < 10 || webhookSecret.length > 255) {
    throw new WaylError("Payments are not configured.", 503, "WAYL_CREDENTIALS_UNAVAILABLE");
  }
  let site: URL;
  try {
    site = new URL(process.env.WAYL_CALLBACK_ORIGIN?.trim() || "");
  } catch {
    throw new WaylError("Payment callback URL is not configured.", 503, "WAYL_CALLBACK_INVALID");
  }
  if (site.protocol !== "https:" || site.username || site.password ||
      site.pathname !== "/" || site.search || site.hash ||
      ["localhost", "127.0.0.1", "[::1]"].includes(site.hostname)) {
    throw new WaylError("Payment callback URL is not configured.", 503, "WAYL_CALLBACK_INVALID");
  }
  return { token, webhookSecret, rate, siteOrigin: site.origin, environment };
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

export function quoteWaylPayment(priceUsd: unknown, rate: number, environment: WaylEnvironment = getWaylEnvironment()) {
  const cents = usdCents(priceUsd);
  const totalIqd = Math.round(cents * rate / 100);
  if (!Number.isFinite(rate) || rate <= 0 || !Number.isSafeInteger(totalIqd) || totalIqd < 1000) {
    throw new WaylError("Payment currency conversion is not configured.", 503, "WAYL_QUOTE_INVALID");
  }
  // Preserve the charge quote in the existing reference column so webhook
  // validation does not depend on subsequent exchange-rate configuration changes.
  const referenceId = "wayl_" + environment + "_" + randomUUID() + "_" + cents + "_" + totalIqd;
  return { referenceId, totalIqd };
}

export function referenceAmount(reference: string, priceUsd: unknown): number {
  const match = /^wayl_(test|live)_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}_(\d+)_(\d+)$/.exec(reference);
  if (!match || match[1] !== getWaylEnvironment() || Number(match[2]) !== usdCents(priceUsd)) {
    throw new WaylError("Payment reference does not match booking pricing.", 409);
  }
  const amount = Number(match[3]);
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
}): Promise<{ url: string; expiresAt: string }> {
  const config = getWaylCheckoutConfig();
  const minutes = Math.floor((Date.parse(input.expiresAt) - Date.now()) / 60000);
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 15) {
    throw new WaylError("This payment hold is ending. Please reserve another time.", 409);
  }
  const returnUrl = new URL("/booking-confirmed", config.siteOrigin);
  returnUrl.searchParams.set("id", input.appointmentId);
  returnUrl.searchParams.set("token", input.joinToken);
  returnUrl.searchParams.set("payment", "returned");
  // Conservatively record link validity from before the upstream request.
  const expiresAt = new Date(Math.min(Date.parse(input.expiresAt), Date.now() + minutes * 60000)).toISOString();
  let diagnostic = "WAYL_CREATE_REQUEST_FAILED";
  try {
    console.warn("WAYL_CREATE_REQUEST_STARTED");
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
        env: config.environment,
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
    if (response.status !== 201) {
      diagnostic = "WAYL_CREATE_HTTP_REJECTED";
      throw new Error("Unexpected response");
    }
    diagnostic = "WAYL_CREATE_JSON_INVALID";
    const payload = await response.json();
    // Fixed codes only: never log provider objects, field values or URLs.
    diagnostic = "WAYL_CREATE_RESPONSE_SHAPE_INVALID";
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Unexpected response");
    const data = payload.data;
    diagnostic = "WAYL_CREATE_DATA_OBJECT_INVALID";
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Unexpected response");
    diagnostic = "WAYL_CREATE_REFERENCE_MISMATCH";
    if (data.referenceId !== input.referenceId) throw new Error("Unexpected response");
    diagnostic = "WAYL_CREATE_CURRENCY_MISMATCH";
    if (data.currency !== "IQD") throw new Error("Unexpected response");
    diagnostic = "WAYL_CREATE_AMOUNT_MISMATCH";
    if (Number(data.total) !== input.totalIqd) throw new Error("Unexpected response");
    diagnostic = "WAYL_CREATE_ENVIRONMENT_MISMATCH";
    if (data.env !== undefined && data.env !== config.environment) throw new Error("Unexpected response");
    diagnostic = "WAYL_CREATE_URL_FIELD_INVALID";
    if (typeof data.url !== "string" || !data.url) throw new Error("Unexpected response");
    diagnostic = "WAYL_CREATE_URL_MALFORMED";
    const checkoutUrl = new URL(data.url);
    diagnostic = "WAYL_CREATE_URL_ORIGIN_INVALID";
    if (checkoutUrl.protocol !== "https:" || checkoutUrl.hostname !== "checkout.thewayl.com" ||
        checkoutUrl.username || checkoutUrl.password || checkoutUrl.port || checkoutUrl.hash) throw new Error("Unexpected response");
    diagnostic = "WAYL_CREATE_URL_PATH_INVALID";
    if (!validWaylCheckoutUrl(data.url)) throw new Error("Unexpected response");
    console.warn("WAYL_CREATE_RESPONSE_VALID");
    return { url: data.url, expiresAt };
  } catch {
    console.warn(diagnostic);
    // Never forward upstream messages, response bodies, tokens or callback URLs.
    throw new WaylError("Unable to prepare checkout. Please contact support before retrying.");
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
  // when supplied; IQD and the environment are pinned in our stored reference and request.
  if (payload.currency !== undefined && payload.currency !== "IQD") return false;
  if (payload.env !== undefined && payload.env !== getWaylEnvironment()) return false;
  if (payload.status !== undefined && payload.paymentStatus !== undefined &&
      !["Complete", "Delivered", "Paid"].includes(String(payload.status))) return false;
  return true;
}
