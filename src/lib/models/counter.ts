import { Schema, model, models } from "mongoose";

/**
 * Atomic sequence generator. One doc per named sequence; `$inc` under
 * `findOneAndUpdate` is atomic in MongoDB, so concurrent callers can never
 * receive the same number.
 */
export interface ICounter {
  _id: string; // sequence name, e.g. "voucherOrderNo"
  seq: number;
}

const CounterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 },
});

if (models.Counter) delete models.Counter;
export const CounterModel = model<ICounter>("Counter", CounterSchema);

/** Reserve and return the next number in the named sequence. */
export async function nextSequence(name: string): Promise<number> {
  const doc = await CounterModel.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  ).lean<{ seq: number }>();
  return doc!.seq;
}
