import { Schema, model, models } from "mongoose";

export interface IPricingPlan {
  _id: string;
  name: string;
  slug: string;
  priceMonthlyUsd: number;
  priceYearlyUsd: number;
  currency: string;
  features: string[];
  highlighted: boolean;
  active: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const PricingPlanSchema = new Schema<IPricingPlan>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    priceMonthlyUsd: { type: Number, required: true, min: 0 },
    priceYearlyUsd: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD" },
    features: [String],
    highlighted: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const PricingPlanModel =
  models.PricingPlan ?? model<IPricingPlan>("PricingPlan", PricingPlanSchema);
