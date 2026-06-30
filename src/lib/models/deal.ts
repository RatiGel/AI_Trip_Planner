import mongoose, { Schema, model, models } from "mongoose";

export type DealStatus = "pending" | "approved" | "rejected";

export interface IDeal {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  priceOriginal: number;
  priceGEL: number;
  discountPct: number;
  category: "attraction" | "food" | "transport" | "experience";
  validUntil?: string;
  image?: string;
  badge?: string;
  /** Business owner who submitted this deal; null for owner-created deals. */
  ownerId?: string;
  /** Optional link to one of the owner's listings. */
  placeId?: string;
  /** Approval state. Owner-created start "approved"; business-submitted "pending". */
  status: DealStatus;
  rejectionReason?: string;
  /** Owner-controlled visibility on the public deals page. */
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DealSchema = new Schema<IDeal>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    priceOriginal: { type: Number, required: true, min: 0 },
    priceGEL: { type: Number, required: true, min: 0 },
    discountPct: { type: Number, default: 0, min: 0, max: 100 },
    category: {
      type: String,
      enum: ["attraction", "food", "transport", "experience"],
      required: true,
    },
    validUntil: { type: String },
    image: { type: String },
    badge: { type: String },
    ownerId: { type: String },
    placeId: { type: String },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
    rejectionReason: { type: String },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const DealModel = models.Deal ?? model<IDeal>("Deal", DealSchema);
