import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error("MONGODB_URI not set");

async function main() {
  await mongoose.connect(MONGODB_URI);

  const email = "ratige12@gmail.com";
  const result = await mongoose.connection.db!
    .collection("users")
    .updateOne({ email }, { $set: { role: "admin" } });

  if (result.matchedCount === 0) {
    console.log(`No user found with email: ${email}`);
  } else {
    console.log(`✓ Set role=admin for ${email}`);
  }

  await mongoose.disconnect();
}

main().catch(console.error);
