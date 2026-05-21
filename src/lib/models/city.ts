import { Schema, model, models } from "mongoose";
import type { City } from "@/types";

type CityDoc = Omit<City, "id"> & { _id: unknown };

const GeoSchema = new Schema({ lng: Number, lat: Number, address: String }, { _id: false });

const CitySchema = new Schema<CityDoc>(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameKa: { type: String, required: true },
    country: { type: String, required: true },
    description: String,
    descriptionKa: String,
    heroImage: String,
    geo: GeoSchema,
    placesCount: { type: Number, default: 0 },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

CitySchema.virtual("id").get(function () {
  return String(this._id);
});

export const CityModel = models.City ?? model("City", CitySchema);
