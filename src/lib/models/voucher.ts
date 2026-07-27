import mongoose, { Schema, model, models } from "mongoose";

export type VoucherStatus = "active" | "redeemed";

export interface IVoucher {
  _id: mongoose.Types.ObjectId;
  code: string; // human-readable, e.g. DEAL-A3F9-K2M1
  userId: string; // buyer
  dealId: string; // mock deal id snapshot (deal-1)
  dealTitle: string; // snapshot
  amountGEL: number; // snapshot, in GEL
  paymentOrderId: string; // links to the Payment row (unique → idempotency)
  status: VoucherStatus;
  createdAt: Date;
  updatedAt: Date;
}

const VoucherSchema = new Schema<IVoucher>(
  {
    code: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    dealId: { type: String, required: true },
    dealTitle: { type: String, required: true },
    amountGEL: { type: Number, required: true, min: 0 },
    paymentOrderId: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ["active", "redeemed"], default: "active" },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

VoucherSchema.virtual("id").get(function () {
  return String(this._id);
});

// Drop any stale cached model (dev hot-reload) so schema/index changes take effect.
if (models.Voucher) delete models.Voucher;
export const VoucherModel = model<IVoucher>("Voucher", VoucherSchema);
