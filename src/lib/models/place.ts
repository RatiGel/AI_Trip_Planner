import { Schema, model, models } from "mongoose";
import type { Place } from "@/types";

type PlaceDoc = Omit<Place, "id"> & { _id: unknown };

const GeoSchema = new Schema({ lng: Number, lat: Number, address: String }, { _id: false });

const OpeningHoursSchema = new Schema(
  { day: Number, open: String, close: String, closed: Boolean },
  { _id: false }
);

const PlaceSchema = new Schema<PlaceDoc>(
  {
    slug: { type: String, required: true, unique: true },
    citySlug: { type: String, required: true, index: true },
    name: { type: String, required: true },
    nameKa: String,
    description: String,
    descriptionKa: String,
    categories: [String],
    images: [String],
    geo: GeoSchema,
    openingHours: [OpeningHoursSchema],
    priceLevel: { type: Number, min: 1, max: 4 },
    rating: { type: Number, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    tags: [String],
    reservable: { type: Boolean, default: false },
    phone: String,
    website: String,
    averageVisitDurationMin: Number,
    popularityScore: { type: Number, min: 0, max: 100 },
    ownerId: { type: String, index: true },
    status: {
      type: String,
      enum: ["pending", "active", "rejected"],
      default: "active",
      index: true,
    },
    featured: { type: Boolean, default: false },
    rejectionReason: { type: String },
    viewCount: { type: Number, default: 0 },
    extPlaceId: { type: String, index: true, sparse: true },
    extRating: { type: Number, min: 0, max: 5 },
    extReviewCount: { type: Number, min: 0 },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

PlaceSchema.virtual("id").get(function (this: any) {
  return String(this._id);
});

export const PlaceModel = models.Place ?? model("Place", PlaceSchema);
