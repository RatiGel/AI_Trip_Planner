import mongoose, { Schema, model, models } from "mongoose";

export type PaymentPurpose = "listing_fee" | "reservation" | "ticket" | "service" | "deal";
export type PaymentStatus = "pending" | "paid" | "failed";

export interface IPayment {
  _id: mongoose.Types.ObjectId;
  orderId: string; // our id, sent to Flitt as order_id
  flittPaymentId?: string;
  purpose: PaymentPurpose;
  targetId: string; // placeId | reservationId | ticketId | serviceId
  serviceId?: string; // sub-id when purpose === "service" (Place.services[]._id)
  userId?: string; // payer (optional for guest "deal" checkouts)
  businessOwnerId?: string; // place.ownerId, for manual payout accounting
  amount: number; // minor units (tetri)
  currency: string;
  status: PaymentStatus;
  rawCallback?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    flittPaymentId: String,
    purpose: {
      type: String,
      enum: ["listing_fee", "reservation", "ticket", "service", "deal"],
      required: true,
    },
    targetId: { type: String, required: true, index: true },
    serviceId: String,
    userId: { type: String, index: true },
    businessOwnerId: String,
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "GEL" },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
      index: true,
    },
    rawCallback: Schema.Types.Mixed,
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

PaymentSchema.virtual("id").get(function () {
  return String(this._id);
});

// Drop any stale cached model (dev hot-reload) so schema changes take effect.
if (models.Payment) delete models.Payment;
export const PaymentModel = model<IPayment>("Payment", PaymentSchema);
