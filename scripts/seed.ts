import "dotenv/config";
import mongoose from "mongoose";
import { mockCities } from "../src/lib/mock/cities";
import { mockPlaces } from "../src/lib/mock/places";
import { mockBusTickets, mockRailTickets, mockTransitPasses } from "../src/lib/mock/tickets";

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error("MONGODB_URI is not set");

// ── Schemas (inline so we don't import the Next.js models which use next/cache) ──

const GeoSchema = new mongoose.Schema({ lng: Number, lat: Number, address: String }, { _id: false });

const CitySchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: String,
    nameKa: String,
    country: String,
    description: String,
    descriptionKa: String,
    heroImage: String,
    geo: GeoSchema,
    placesCount: { type: Number, default: 0 },
  },
  { toJSON: { virtuals: true } }
);
CitySchema.virtual("id").get(function () { return this._id.toString(); });

const OpeningHoursSchema = new mongoose.Schema(
  { day: Number, open: String, close: String, closed: Boolean },
  { _id: false }
);
const PlaceSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    citySlug: { type: String, required: true },
    name: String,
    nameKa: String,
    description: String,
    descriptionKa: String,
    categories: [String],
    images: [String],
    geo: GeoSchema,
    openingHours: [OpeningHoursSchema],
    priceLevel: Number,
    rating: Number,
    reviewCount: { type: Number, default: 0 },
    tags: [String],
    reservable: { type: Boolean, default: false },
    phone: String,
    website: String,
  },
  { toJSON: { virtuals: true } }
);
PlaceSchema.virtual("id").get(function () { return this._id.toString(); });

const TicketSchema = new mongoose.Schema(
  {
    type: String,
    from: String,
    to: String,
    departure: String,
    arrival: String,
    durationMin: Number,
    priceGEL: Number,
    operator: String,
  },
  { toJSON: { virtuals: true } }
);
TicketSchema.virtual("id").get(function () { return this._id.toString(); });

const City = mongoose.models.City ?? mongoose.model("City", CitySchema);
const Place = mongoose.models.Place ?? mongoose.model("Place", PlaceSchema);
const Ticket = mongoose.models.Ticket ?? mongoose.model("Ticket", TicketSchema);

async function seed() {
  console.log("Connecting to MongoDB…");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected.");

  // ── Cities ──
  await City.deleteMany({});
  await City.insertMany(
    mockCities.map(({ id: _id, ...c }) => c)
  );
  console.log(`Seeded ${mockCities.length} cities`);

  // ── Places ──
  await Place.deleteMany({});
  await Place.insertMany(
    mockPlaces.map(({ id: _id, ...p }) => p)
  );
  console.log(`Seeded ${mockPlaces.length} places`);

  // ── Tickets ──
  await Ticket.deleteMany({});
  const allTickets = [...mockBusTickets, ...mockRailTickets, ...mockTransitPasses];
  await Ticket.insertMany(
    allTickets.map(({ id: _id, ...t }) => t)
  );
  console.log(`Seeded ${allTickets.length} tickets`);

  await mongoose.disconnect();
  console.log("Done!");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
