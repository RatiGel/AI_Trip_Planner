import mongoose, { Schema, model, models } from "mongoose";

export type NotificationType = "deal_purchase";

export interface INotification {
  _id: mongoose.Types.ObjectId;
  ownerId: string; // business owner who receives it
  type: NotificationType;
  dealId: string;
  dealTitle: string;
  voucherCode: string;
  buyerName: string;
  buyerEmail: string;
  amountGEL: number;
  paymentOrderId: string; // unique → idempotency with the voucher
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    ownerId: { type: String, required: true, index: true },
    type: { type: String, enum: ["deal_purchase"], default: "deal_purchase" },
    dealId: { type: String, required: true },
    dealTitle: { type: String, required: true },
    voucherCode: { type: String, required: true },
    buyerName: { type: String, default: "" },
    buyerEmail: { type: String, default: "" },
    amountGEL: { type: Number, required: true, min: 0 },
    paymentOrderId: { type: String, required: true, unique: true, index: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

NotificationSchema.virtual("id").get(function () {
  return String(this._id);
});

// Drop any stale cached model (dev hot-reload) so schema/index changes take effect.
if (models.Notification) delete models.Notification;
export const NotificationModel = model<INotification>("Notification", NotificationSchema);
