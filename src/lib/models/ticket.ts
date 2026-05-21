import { Schema, model, models } from "mongoose";
import type { TicketOption } from "@/types";

type TicketDoc = Omit<TicketOption, "id"> & { _id: unknown };

const TicketSchema = new Schema<TicketDoc>(
  {
    type: { type: String, enum: ["bus", "rail", "transit-pass"], required: true },
    from: String,
    to: String,
    departure: String,
    arrival: String,
    durationMin: Number,
    priceGEL: { type: Number, required: true },
    operator: { type: String, required: true },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

TicketSchema.virtual("id").get(function () {
  return String(this._id);
});

export const TicketModel = models.Ticket ?? model("Ticket", TicketSchema);
