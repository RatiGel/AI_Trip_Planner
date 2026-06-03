import mongoose, { Schema, model, models } from "mongoose";

export interface IReport {
  _id: mongoose.Types.ObjectId;
  reporterId: string;
  reporterEmail?: string;
  targetType: "review" | "listing";
  targetId: string;
  reason: string;
  status: "pending" | "resolved" | "dismissed";
  createdAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reporterId: { type: String, required: true },
    reporterEmail: { type: String },
    targetType: { type: String, enum: ["review", "listing"], required: true },
    targetId: { type: String, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "resolved", "dismissed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const ReportModel =
  models.Report ?? model<IReport>("Report", ReportSchema);
