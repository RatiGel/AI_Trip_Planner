/**
 * Migration for the deprecated legacy `role: "admin"` account tier.
 *
 * The admin panel routes were split into a superadmin-only staff panel and a
 * business-owner panel. Earlier tasks in this plan removed every route that
 * granted access to the legacy "admin" role, so any account still carrying
 * `role: "admin"` is now stranded with no panel at all. This script moves
 * those accounts to "business" so they land somewhere with a working panel.
 *
 * Dry run (default) — reports what it found, changes nothing:
 *   npx tsx --env-file=.env.local scripts/migrate-admin-role.ts
 *
 * Apply — flips the matched documents to role "business":
 *   npx tsx --env-file=.env.local scripts/migrate-admin-role.ts --apply
 *
 * Idempotent: re-running after a successful apply finds zero "admin" users
 * and exits cleanly. Touches only the `role` field on documents that currently
 * have `role: "admin"` — no other field is written, and no other role
 * (in particular "superadmin") is ever matched or modified.
 */
import { connectDB } from "../src/lib/db";
import { UserModel } from "../src/lib/models/user";

const APPLY = process.argv.includes("--apply");

async function main() {
  await connectDB();

  const affected = await UserModel.find({ role: "admin" })
    .select("name email createdAt")
    .lean();

  console.log(`Found ${affected.length} user(s) with the deprecated "admin" role:`);
  for (const u of affected) {
    console.log(`  - ${u.email} (${u.name})`);
  }

  if (affected.length === 0) {
    console.log("\nNothing to migrate.");
    process.exit(0);
  }

  if (!APPLY) {
    console.log('\nDry run only — no changes made. Re-run with --apply to flip these to role "business".');
    process.exit(0);
  }

  const result = await UserModel.updateMany({ role: "admin" }, { $set: { role: "business" } });
  console.log(`\n✓ matched ${result.matchedCount}, modified ${result.modifiedCount} user(s) to role "business".`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
