import mongoose, { Schema, model, models } from "mongoose";

export interface IItinerary {
  _id: mongoose.Types.ObjectId;
  title: string;
  userId?: string;
  days: { date: string; items: { placeId: string; time: string; notes?: string }[] }[];
  createdAt: Date;
}

const ItineraryItemSchema = new Schema(
  { placeId: String, time: String, notes: String },
  { _id: false }
);

const ItineraryDaySchema = new Schema(
  { date: String, items: [ItineraryItemSchema] },
  { _id: false }
);

const ItinerarySchema = new Schema<IItinerary>(
  {
    title: { type: String, required: true },
    userId: String,
    days: [ItineraryDaySchema],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

ItinerarySchema.virtual("id").get(function () {
  return String(this._id);
});

export const ItineraryModel =
  models.Itinerary ?? model<IItinerary>("Itinerary", ItinerarySchema);
