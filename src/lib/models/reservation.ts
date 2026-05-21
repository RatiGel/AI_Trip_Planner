import mongoose, { Schema, model, models } from "mongoose";

export interface IReservation {
  _id: mongoose.Types.ObjectId;
  placeId: string;
  userId?: string;
  datetime: string;
  partySize: number;
  notes?: string;
  status: "pending" | "confirmed" | "cancelled";
}

const ReservationSchema = new Schema<IReservation>(
  {
    placeId: { type: String, required: true },
    userId: String,
    datetime: { type: String, required: true },
    partySize: { type: Number, required: true, min: 1 },
    notes: String,
    status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "pending" },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

ReservationSchema.virtual("id").get(function () {
  return String(this._id);
});

export const ReservationModel =
  models.Reservation ?? model<IReservation>("Reservation", ReservationSchema);
