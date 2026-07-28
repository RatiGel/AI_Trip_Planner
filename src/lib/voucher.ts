import { randomInt } from "crypto";
import { VoucherModel, voucherValidUntil, type IVoucher } from "@/lib/models/voucher";
import { nextSequence } from "@/lib/models/counter";

/** Customer-facing order numbers start here, so the first one reads as 100001. */
const ORDER_NO_BASE = 100000;

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
  recipientIndex: number;
  buyerName?: string;
  buyerEmail?: string;
  recipientFirstName?: string;
  recipientLastName?: string;
  recipientAge?: number;
  businessName?: string;
  businessAddress?: string;
}

/**
 * Create a voucher, retrying on a duplicate-code collision (rare). Assumes the
 * caller has already checked there is no voucher for this
 * (paymentOrderId, recipientIndex); the unique compound index on that pair is
 * the final idempotency backstop.
 *
 * validUntil is stamped here (purchase date + 2 weeks) rather than passed in,
 * so every pass gets the same validity rule from a single place. The short
 * customer-facing orderNo is reserved once, before the retry loop, so a code
 * collision re-rolls only the code and never skips an order number.
 */
export async function createUniqueVoucher(input: VoucherInput): Promise<IVoucher> {
  const purchasedAt = new Date();
  const orderNo = ORDER_NO_BASE + (await nextSequence("voucherOrderNo"));
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const doc = await VoucherModel.create({
        ...input,
        code: generateVoucherCode(),
        orderNo,
        validUntil: voucherValidUntil(purchasedAt),
      });
      return doc.toObject() as IVoucher;
    } catch (e) {
      // Duplicate key: 11000. Retry only a code collision; a duplicate
      // (paymentOrderId, recipientIndex) means the pass already exists — rethrow.
      const err = e as { code?: number; keyPattern?: Record<string, unknown> };
      if (err.code === 11000 && err.keyPattern && "code" in err.keyPattern) continue;
      throw e;
    }
  }
  throw new Error("Could not generate a unique voucher code after 5 attempts");
}

/**
 * Assign order numbers to vouchers issued before orderNo existed, so every pass
 * displays one. Idempotent: the filter skips vouchers that already have a
 * number, and the write is conditional on it still being absent, so concurrent
 * page loads can't hand the same voucher two numbers.
 */
export async function backfillOrderNumbers(
  vouchers: { _id: unknown; orderNo?: number }[]
): Promise<Map<string, number>> {
  const assigned = new Map<string, number>();
  for (const v of vouchers) {
    if (v.orderNo != null) continue;
    const orderNo = ORDER_NO_BASE + (await nextSequence("voucherOrderNo"));
    const res = await VoucherModel.updateOne(
      { _id: v._id as string, orderNo: { $exists: false } },
      { $set: { orderNo } }
    );
    if (res.modifiedCount === 1) {
      assigned.set(String(v._id), orderNo);
    } else {
      // Another request won the race — read back the number it assigned.
      const fresh = await VoucherModel.findById(v._id)
        .select("orderNo")
        .lean<{ orderNo?: number } | null>();
      if (fresh?.orderNo != null) assigned.set(String(v._id), fresh.orderNo);
    }
  }
  return assigned;
}
