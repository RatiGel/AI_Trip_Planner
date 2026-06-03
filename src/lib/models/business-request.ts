import mongoose, { Schema, model, models } from "mongoose";

export interface IBusinessRequest {
  _id: mongoose.Types.ObjectId;
  userId: string;
  businessName: string;
  businessType: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  createdAt: Date;
}

const BusinessRequestSchema = new Schema<IBusinessRequest>(
  {
    userId: { type: String, required: true, unique: true },
    businessName: { type: String, required: true },
    businessType: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

export const BusinessRequestModel =
  models.BusinessRequest ??
  model<IBusinessRequest>("BusinessRequest", BusinessRequestSchema);
