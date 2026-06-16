import mongoose, { Schema, model, models } from "mongoose";

export interface IReservation {
  _id: mongoose.Types.ObjectId;
  placeId: string;
  userId?: string;
  datetime: string;
  partySize: number;
  notes?: string;
  status: "pending" | "confirmed" | "cancelled";
  /** Price the business charges for this reservation, in GEL. 0/undefined = free. */
  priceGEL?: number;
  paymentStatus: "unpaid" | "paid";
}

const ReservationSchema = new Schema<IReservation>(
  {
    placeId: { type: String, required: true },
    userId: String,
    datetime: { type: String, required: true },
    partySize: { type: Number, required: true, min: 1 },
    notes: String,
    status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "pending" },
    priceGEL: { type: Number, min: 0 },
    paymentStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

ReservationSchema.virtual("id").get(function () {
  return String(this._id);
});

export const ReservationModel =
  models.Reservation ?? model<IReservation>("Reservation", ReservationSchema);
