import { createHash, timingSafeEqual } from "crypto";

/**
 * Flitt payment gateway client.
 * Hosted checkout (redirect) + SHA1 signature generation/verification.
 * Docs: github.com/Parsa-29/flitt-payments-skill
 */

const FLITT_CHECKOUT_URL = "https://pay.flitt.com/api/checkout/url";

export const MERCHANT_ID = Number(process.env.FLITT_MERCHANT_ID);
const PAYMENT_KEY = process.env.FLITT_PAYMENT_KEY ?? "";

type FlittParams = Record<string, string | number | undefined | null>;

/**
 * SHA1 signature per Flitt spec:
 *   secret first, then param values sorted alphabetically by key,
 *   skipping "", null/undefined and the `signature` key. 0 is kept.
 *   Join with "|", SHA1, lowercase hex.
 */
export function flittSignature(params: FlittParams, secret = PAYMENT_KEY): string {
  const data = [secret];
  for (const key of Object.keys(params).sort()) {
    if (key === "signature") continue;
    const value = params[key];
    if (value === "" || value === null || value === undefined) continue;
    data.push(String(value));
  }
  return createHash("sha1").update(data.join("|"), "utf-8").digest("hex");
}

/**
 * Verify an inbound webhook callback signature.
 * Excludes `signature` and `response_signature_string` before hashing.
 */
export function verifyCallback(payload: Record<string, unknown>, secret = PAYMENT_KEY): boolean {
  const incoming = typeof payload.signature === "string" ? payload.signature : "";
  if (!incoming) return false;

  const params: FlittParams = {};
  for (const [k, v] of Object.entries(payload)) {
    if (k === "signature" || k === "response_signature_string") continue;
    if (v === null || v === undefined || typeof v === "object") continue;
    params[k] = v as string | number;
  }
  const expected = flittSignature(params, secret);

  const a = Buffer.from(expected, "utf-8");
  const b = Buffer.from(incoming, "utf-8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export interface CreateCheckoutArgs {
  orderId: string;
  amount: number; // minor units (tetri). 50 GEL = 5000
  desc: string;
  callbackUrl: string;
  responseUrl: string;
  currency?: string;
}

export interface CreateCheckoutResult {
  checkoutUrl: string;
  paymentId?: string;
}

/**
 * Create a hosted checkout session. Returns the URL to redirect the customer to.
 */
export async function createCheckout(args: CreateCheckoutArgs): Promise<CreateCheckoutResult> {
  const request: FlittParams = {
    order_id: args.orderId,
    merchant_id: MERCHANT_ID,
    order_desc: args.desc,
    amount: args.amount,
    currency: args.currency ?? "GEL",
    server_callback_url: args.callbackUrl,
    response_url: args.responseUrl,
  };
  request.signature = flittSignature(request);

  const res = await fetch(FLITT_CHECKOUT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ request }),
  });

  if (!res.ok) {
    throw new Error(`Flitt checkout HTTP ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as {
    response?: { response_status?: string; checkout_url?: string; payment_id?: string; error_message?: string };
  };
  const r = json.response;
  if (!r || r.response_status !== "success" || !r.checkout_url) {
    throw new Error(`Flitt checkout failed: ${r?.error_message ?? JSON.stringify(json)}`);
  }
  return { checkoutUrl: r.checkout_url, paymentId: r.payment_id };
}
