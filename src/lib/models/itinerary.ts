import mongoose, { Schema, model, models } from "mongoose";

export interface IItinerary {
  _id: mongoose.Types.ObjectId;
  title: string;
  userId?: string;
  days: {
    _id?: mongoose.Types.ObjectId;
    date: string;
    items: { _id?: mongoose.Types.ObjectId; placeId: string; time: string; notes?: string }[];
  }[];
  createdAt: Date;
}

const ItineraryItemSchema = new Schema({
  placeId: String,
  time: String,
  notes: String,
});

const ItineraryDaySchema = new Schema({
  date: String,
  items: [ItineraryItemSchema],
});

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
