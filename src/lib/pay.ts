import type { PaymentPurpose } from "@/lib/models/payment";

export interface PayArgs {
  purpose: PaymentPurpose;
  targetId: string;
  serviceId?: string;
  locale: string;
  amount?: number; // GEL, only used for "deal" purpose
  desc?: string;
}

/**
 * Client helper: request a Flitt checkout from our API and redirect the
 * browser to the hosted payment page. Throws on error.
 */
export async function payNow(args: PayArgs): Promise<void> {
  const res = await fetch("/api/flitt/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const json = (await res.json()) as { checkout_url?: string; error?: string };
  if (!res.ok || !json.checkout_url) {
    throw new Error(json.error ?? "Checkout failed");
  }
  window.location.href = json.checkout_url;
}
