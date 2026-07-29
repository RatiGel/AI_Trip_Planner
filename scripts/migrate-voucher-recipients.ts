/**
 * Migration for giftable Explorer PASS vouchers.
 *
 * A voucher used to be one-per-payment, enforced by a unique index on
 * Voucher.paymentOrderId. A payment can now issue one pass per named
 * recipient, so idempotency moved to a compound unique index on
 * (paymentOrderId, recipientIndex). Mongoose creates the new index on its own
 * but never drops the old one, and the old one rejects the second pass of every
 * multi-recipient order — so it has to go explicitly.
 *
 * Run once per environment, before or right after deploying that change:
 *   npx tsx --env-file=.env.local scripts/migrate-voucher-recipients.ts
 *
 * Idempotent: re-running is a no-op. Touches indexes and the recipientIndex
 * field only; no voucher is created, deleted, or otherwise rewritten.
 */
import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error("MONGODB_URI not set");

const STALE_INDEX = "paymentOrderId_1";

async function main() {
  await mongoose.connect(MONGODB_URI);
  const vouchers = mongoose.connection.db!.collection("vouchers");

  const before = await vouchers.countDocuments();
  console.log(`vouchers in collection: ${before}`);

  // 1. Backfill recipientIndex first. Doing it before the index swap means the
  //    compound index never sees documents with a missing key.
  const backfill = await vouchers.updateMany(
    { recipientIndex: { $exists: false } },
    { $set: { recipientIndex: 0 } }
  );
  console.log(
    backfill.modifiedCount > 0
      ? `✓ set recipientIndex: 0 on ${backfill.modifiedCount} legacy voucher(s)`
      : "· recipientIndex already present on every voucher"
  );

  // 2. Drop the stale index — but only if it is the UNIQUE one. The schema also
  //    declares a plain non-unique index on paymentOrderId (for lookups by
  //    order), which Mongoose builds lazily under the very same name. Dropping
  //    by name alone would delete that legitimate index on every run.
  const stale = (await vouchers.indexes()).find((i) => i.name === STALE_INDEX);
  if (stale?.unique === true) {
    await vouchers.dropIndex(STALE_INDEX);
    console.log(`✓ dropped stale UNIQUE index ${STALE_INDEX}`);
  } else if (stale) {
    console.log(`· ${STALE_INDEX} exists but is non-unique (the schema's lookup index) — kept`);
  } else {
    console.log(`· ${STALE_INDEX} absent`);
  }

  // 3. Ensure the replacement exists. Normally Mongoose has already built it
  //    from the schema; create it here so the migration also works when run
  //    against a database the app has not connected to yet.
  await vouchers.createIndex(
    { paymentOrderId: 1, recipientIndex: 1 },
    { unique: true, name: "paymentOrderId_1_recipientIndex_1" }
  );
  console.log("✓ ensured unique index on (paymentOrderId, recipientIndex)");

  const after = await vouchers.countDocuments();
  if (after !== before) {
    throw new Error(`voucher count changed: ${before} -> ${after}; expected no data changes`);
  }
  console.log(`\nvoucher count unchanged (${after}). Final indexes:`);
  for (const i of await vouchers.indexes()) {
    console.log(`  - ${i.name} ${JSON.stringify(i.key)}${i.unique ? " UNIQUE" : ""}`);
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
