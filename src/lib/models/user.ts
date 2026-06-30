import mongoose, { Schema, model, models } from "mongoose";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  avatar?: string;
  role: "tourist" | "business" | "admin";
  suspended: boolean;
  warnings: number;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: false },
    avatar: { type: String },
    role: {
      type: String,
      enum: ["tourist", "business", "admin"],
      default: "tourist",
    },
    suspended: { type: Boolean, default: false },
    warnings: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const UserModel = models.User ?? model<IUser>("User", UserSchema);
