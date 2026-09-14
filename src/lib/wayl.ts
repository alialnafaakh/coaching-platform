import { createHmac, randomUUID, timingSafeEqual } from "crypto";

export const WAYL_API_BASE = "https://api.thewayl.com/api/v1";
export const SESSION_PRICE_USD = 50;
export const ORIGINAL_PRICE_USD = 100;

export class WaylError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "WaylError";
  }
}

export type WaylLinkResponse = {
  referenceId?: string;
  code?: string;
  checkoutUrl?: string;
  url?: string;
  [key: string]: unknown;
};

export function getWaylAmountIqd(): number {
  const n = Number(process.env.WAYL_AMOUNT_IQD || 65000);
  return Number.isFinite(n) && n >= 1000 ? Math.round(n) : 65000;
}

export function getWaylEnv(): "test" | "live" {
  return process.env.WAYL_ENV === "live" ? "live" : "test";
}

export function newPaymentReference(): string {
  return randomUUID();
}

function authHeaders(): Record<string, string> {
  const key = process.env.WAYL_API_KEY;
  if (!key) {
    throw new WaylError("WAYL_API_KEY is not configured");
  }
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-WAYL-AUTHENTICATION": key,
  };
}

export async function createPaymentLink(input: {
  referenceId: string;
  totalIqd: number;
  description: string;
  redirectionUrl: string;
  webhookUrl: string;
  customParameter: string;
}): Promise<{ checkoutUrl: string; referenceId: string; raw: WaylLinkResponse }> {
  const webhookSecret = process.env.WAYL_WEBHOOK_SECRET;
  const body: Record<string, unknown> = {
    env: getWaylEnv(),
    total: input.totalIqd,
    currency: "IQD",
    referenceId: input.referenceId,
    redirectionUrl: input.redirectionUrl,
    customParameter: input.customParameter,
    lineItems: [
      {
        name: input.description,
        amount: input.totalIqd,
        quantity: 1,
      },
    ],
  };

  if (input.webhookUrl && webhookSecret) {
    body.webhookUrl = input.webhookUrl;
    body.webhookSecret = webhookSecret;
  }

  const res = await fetch(`${WAYL_API_BASE}/links`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok || payload?.success === false) {
    const message =
      payload?.message || payload?.error || "Failed to create Wayl payment link";
    throw new WaylError(String(message), res.status, payload);
  }

  const data = (payload?.data ?? payload) as WaylLinkResponse;
  const code = typeof data.code === "string" ? data.code : null;
  const checkoutUrl =
    (typeof data.checkoutUrl === "string" && data.checkoutUrl) ||
    (typeof data.url === "string" && data.url) ||
    (code ? `https://checkout.thewayl.com/pay/${code}` : null);

  if (!checkoutUrl) {
    throw new WaylError("Wayl did not return a checkout URL", res.status, payload);
  }

  return {
    checkoutUrl,
    referenceId: data.referenceId || input.referenceId,
    raw: data,
  };
}

export function findWaylSignature(headers: Headers): string | null {
  const names = [
    "x-wayl-signature-256",
    "x-wayl-signature",
    "wayl-signature",
    "x-signature-256",
    "x-signature",
  ];
  for (const name of names) {
    const value = headers.get(name);
    if (value) return value;
  }
  return null;
}

export function verifyWaylSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.WAYL_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const normalised = signature
    .trim()
    .replace(/^(sha256=|SHA256=|v1=|hmac-sha256=)/, "");

  let provided: Buffer;
  try {
    provided = Buffer.from(normalised, "hex");
  } catch {
    return false;
  }

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

export function isWaylPaid(payload: {
  paymentStatus?: string;
  status?: string;
}): boolean {
  const status = payload.paymentStatus || payload.status;
  return status === "Paid" || status === "Complete" || status === "Completed";
}
