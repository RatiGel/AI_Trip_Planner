import { Schema, model, models } from "mongoose";
import type { Place } from "@/types";

type PlaceDoc = Omit<Place, "id"> & { _id: unknown };

const GeoSchema = new Schema({ lng: Number, lat: Number, address: String }, { _id: false });

const OpeningHoursSchema = new Schema(
  { day: Number, open: String, close: String, closed: Boolean },
  { _id: false }
);

const SocialsSchema = new Schema(
  { facebook: String, instagram: String, x: String, tiktok: String, youtube: String },
  { _id: false }
);

const ServiceSchema = new Schema({
  name: { type: String, required: true },
  nameKa: String,
  description: String,
  priceGEL: { type: Number, required: true, min: 0 },
});

const PlaceSchema = new Schema<PlaceDoc>(
  {
    slug: { type: String, required: true, unique: true },
    citySlug: { type: String, required: true, index: true },
    name: { type: String, required: true },
    nameKa: String,
    nameRu: String,
    description: String,
    descriptionKa: String,
    descriptionRu: String,
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
    email: String,
    website: String,
    socials: SocialsSchema,
    averageVisitDurationMin: Number,
    popularityScore: { type: Number, min: 0, max: 100 },
    ownerId: { type: String, index: true },
    /**
     * Listing lifecycle:
     *  draft    — owner saved, not submitted
     *  pending  — submitted, awaiting admin review
     *  approved — admin approved; owner must pay listing fee to publish
     *  active   — paid + approved; live on site
     *  rejected — admin rejected (see rejectionReason)
     */
    status: {
      type: String,
      enum: ["draft", "pending", "approved", "active", "rejected"],
      default: "active",
      index: true,
    },
    featured: { type: Boolean, default: false },
    /** True once the 50 GEL listing publication fee is paid. */
    paid: { type: Boolean, default: false },
    /** Generic paid services/products the business sells on this listing. */
    services: { type: [ServiceSchema], default: [] },
    /** Booking fee/deposit charged per reservation, in GEL. 0/undefined = free. */
    reservationPriceGEL: { type: Number, min: 0 },
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
