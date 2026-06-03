import mongoose, { Schema, model, models } from "mongoose";

export interface IReview {
  _id: mongoose.Types.ObjectId;
  placeId: string;
  userId: string;
  userName: string;
  rating: number;
  text: string;
  reply?: string;
  flagged: boolean;
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    placeId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, required: true },
    reply: { type: String },
    flagged: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const ReviewModel =
  models.Review ?? model<IReview>("Review", ReviewSchema);
