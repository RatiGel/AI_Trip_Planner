/**
 * Migration for the stale SiteConfig schema defaults.
 *
 * The SiteConfig schema used to write header.logoText: "TbilisiTrip" and
 * footer.copyrightText: "© 2025 TbilisiTrip" as Mongoose defaults on document
 * creation. Nobody chose those values and they don't match what the site
 * actually renders, so wiring the CMS into the live site made them visible —
 * the footer showed the wrong brand and a frozen year. The schema no longer
 * writes these defaults, but any document created before that fix still
 * carries them verbatim in the database.
 *
 * `configuredStr` in src/lib/site-config-resolve.ts works around this at read
 * time by treating these two exact strings as "not configured". This script
 * is the one-time data fix that lets that shim be deleted: it clears the
 * stale values at the source so the resolver no longer needs to know about
 * them.
 *
 * Dry run (default) — reports what it found, changes nothing:
 *   npx tsx --env-file=.env.local scripts/fix-stale-site-config-defaults.ts
 *
 * Apply — clears the two fields for real:
 *   npx tsx --env-file=.env.local scripts/fix-stale-site-config-defaults.ts --apply
 *
 * Idempotent: re-running after a successful apply is a no-op. Touches only
 * header.logoText and footer.copyrightText on the SiteConfig document with
 * key "main" — navLinks, columns, socialLinks, and pages are left untouched.
 */
import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error("MONGODB_URI not set");

const STALE_LOGO_TEXT = "TbilisiTrip";
const STALE_COPYRIGHT_TEXT = "© 2025 TbilisiTrip";

const APPLY = process.argv.includes("--apply");

async function main() {
  await mongoose.connect(MONGODB_URI);
  const configs = mongoose.connection.db!.collection("siteconfigs");

  const doc = await configs.findOne({ key: "main" });
  if (!doc) {
    console.log('No SiteConfig document with key "main" found — nothing to do.');
    await mongoose.disconnect();
    process.exit(0);
  }

  const currentLogoText = doc.header?.logoText;
  const currentCopyrightText = doc.footer?.copyrightText;

  console.log(`SiteConfig "main" current values:`);
  console.log(`  header.logoText:       ${JSON.stringify(currentLogoText)}`);
  console.log(`  footer.copyrightText:  ${JSON.stringify(currentCopyrightText)}`);

  const staleLogo = currentLogoText === STALE_LOGO_TEXT;
  const staleCopyright = currentCopyrightText === STALE_COPYRIGHT_TEXT;

  if (!staleLogo && !staleCopyright) {
    console.log("\n· neither field carries the stale schema default — nothing to do.");
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log("\nFields that will be cleared to \"\":");
  if (staleLogo) console.log(`  - header.logoText (currently the stale default ${JSON.stringify(STALE_LOGO_TEXT)})`);
  if (staleCopyright) console.log(`  - footer.copyrightText (currently the stale default ${JSON.stringify(STALE_COPYRIGHT_TEXT)})`);

  if (!APPLY) {
    console.log("\nDry run only — no changes made. Re-run with --apply to write.");
    await mongoose.disconnect();
    process.exit(0);
  }

  const set: Record<string, string> = {};
  if (staleLogo) set["header.logoText"] = "";
  if (staleCopyright) set["footer.copyrightText"] = "";

  const result = await configs.updateOne({ key: "main" }, { $set: set });
  console.log(`\n✓ matched ${result.matchedCount}, modified ${result.modifiedCount} document(s).`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
