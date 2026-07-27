import { randomInt } from "crypto";
import { VoucherModel, type IVoucher } from "@/lib/models/voucher";

// No 0/O, 1/I/L — unambiguous when read aloud or typed.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function segment(len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/** Human-readable voucher code, e.g. DEAL-A3F9-K2M1. */
export function generateVoucherCode(): string {
  return `DEAL-${segment(4)}-${segment(4)}`;
}

interface VoucherInput {
  userId: string;
  dealId: string;
  dealTitle: string;
  amountGEL: number;
  paymentOrderId: string;
}

/**
 * Create a voucher, retrying on a duplicate-code collision (rare). Assumes the
 * caller has already checked there is no voucher for this paymentOrderId; the
 * unique paymentOrderId index is the final idempotency backstop.
 */
export async function createUniqueVoucher(input: VoucherInput): Promise<IVoucher> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const doc = await VoucherModel.create({ ...input, code: generateVoucherCode() });
      return doc.toObject() as IVoucher;
    } catch (e) {
      // Duplicate key: 11000. If it's the code, retry; if it's paymentOrderId, rethrow.
      const err = e as { code?: number; keyPattern?: Record<string, unknown> };
      if (err.code === 11000 && err.keyPattern && "code" in err.keyPattern) continue;
      throw e;
    }
  }
  throw new Error("Could not generate a unique voucher code after 5 attempts");
}
