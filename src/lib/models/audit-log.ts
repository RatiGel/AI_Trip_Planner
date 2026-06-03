import mongoose, { Schema, model, models } from "mongoose";

export interface IAuditLog {
  _id: mongoose.Types.ObjectId;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    adminId: { type: String, required: true },
    adminEmail: { type: String, required: true },
    action: { type: String, required: true },
    targetType: { type: String },
    targetId: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const AuditLogModel =
  models.AuditLog ?? model<IAuditLog>("AuditLog", AuditLogSchema);
