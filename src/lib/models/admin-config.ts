import { Schema, model, models } from "mongoose";

export interface IAdminConfig {
  key: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    accent: string;
    wine: string;
    gold: string;
  };
  typography: {
    fontFamily: string;
    baseFontSizePx: number;
    headingScale: number;
  };
  updatedAt: Date;
}

const AdminConfigSchema = new Schema<IAdminConfig>(
  {
    key: { type: String, required: true, unique: true },
    colors: {
      primary: { type: String, default: "#3b82f6" },
      secondary: { type: String, default: "#6366f1" },
      background: { type: String, default: "#ffffff" },
      accent: { type: String, default: "#f1f5f9" },
      wine: { type: String, default: "#B5271D" },
      gold: { type: String, default: "#E8A020" },
    },
    typography: {
      fontFamily: { type: String, default: "Inter" },
      baseFontSizePx: { type: Number, default: 16 },
      headingScale: { type: Number, default: 1.25 },
    },
  },
  { timestamps: true }
);

export const AdminConfigModel =
  models.AdminConfig ?? model<IAdminConfig>("AdminConfig", AdminConfigSchema);
