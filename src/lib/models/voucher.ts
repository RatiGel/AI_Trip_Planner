import mongoose, { Schema, model, models } from "mongoose";

export type VoucherStatus = "active" | "redeemed";

export interface IVoucher {
  _id: mongoose.Types.ObjectId;
  code: string; // human-readable, e.g. DEAL-A3F9-K2M1
  userId: string; // buyer
  dealId: string; // mock deal id snapshot (deal-1)
  dealTitle: string; // snapshot
  amountGEL: number; // snapshot, in GEL
  paymentOrderId: string; // links to the Payment row
  /**
   * Position of this pass's holder in Payment.recipients. One payment can issue
   * several passes, so idempotency is keyed on (paymentOrderId, recipientIndex)
   * rather than paymentOrderId alone. 0 for single-pass and legacy orders.
   */
  recipientIndex: number;
  /**
   * Holder named on the pass — who presents it at the gate. Differs from the
   * buyer when the pass was gifted. Absent on vouchers issued before gifting
   * existed, where the buyer is the holder.
   */
  recipientFirstName?: string;
  recipientLastName?: string;
  /** Holder's age, recorded only for under-18s. */
  recipientAge?: number;
  /**
   * Short customer-facing order number printed on the pass, e.g. 100237. Unique
   * and sequential (see nextSequence). Separate from paymentOrderId, which is
   * the long Flitt transaction key and stays internal.
   */
  orderNo?: number;
  status: VoucherStatus;
  // Snapshots taken at purchase time so a later edit to the deal or the user
  // profile never rewrites an already-issued pass. Optional because vouchers
  // issued before these fields existed don't have them — readers fall back to
  // the current mock deal (see resolvePassDetails).
  buyerName?: string;
  buyerEmail?: string;
  businessName?: string;
  businessAddress?: string;
  /** Last day the pass can be redeemed: purchase date + 2 weeks. */
  validUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Vouchers are valid for two weeks from the purchase date. */
export const VOUCHER_VALIDITY_DAYS = 14;

export function voucherValidUntil(purchasedAt: Date): Date {
  const d = new Date(purchasedAt);
  d.setDate(d.getDate() + VOUCHER_VALIDITY_DAYS);
  return d;
}

const VoucherSchema = new Schema<IVoucher>(
  {
    code: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    dealId: { type: String, required: true },
    dealTitle: { type: String, required: true },
    amountGEL: { type: Number, required: true, min: 0 },
    paymentOrderId: { type: String, required: true, index: true },
    recipientIndex: { type: Number, required: true, default: 0 },
    // sparse: vouchers issued before this field existed have no orderNo, and a
    // plain unique index would treat all those missing values as one duplicate.
    orderNo: { type: Number, unique: true, sparse: true, index: true },
    status: { type: String, enum: ["active", "redeemed"], default: "active" },
    buyerName: { type: String },
    buyerEmail: { type: String },
    recipientFirstName: { type: String },
    recipientLastName: { type: String },
    recipientAge: { type: Number, min: 1, max: 17 },
    businessName: { type: String },
    businessAddress: { type: String },
    validUntil: { type: Date },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Idempotency backstop for webhook redelivery: one pass per (order, recipient).
// Replaces the old unique index on paymentOrderId alone, which allowed only a
// single voucher per payment.
VoucherSchema.index({ paymentOrderId: 1, recipientIndex: 1 }, { unique: true });

VoucherSchema.virtual("id").get(function () {
  return String(this._id);
});

// Drop any stale cached model (dev hot-reload) so schema/index changes take effect.
if (models.Voucher) delete models.Voucher;
export const VoucherModel = model<IVoucher>("Voucher", VoucherSchema);
