import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) throw new Error("MONGODB_URI is not set");

declare global {
  // eslint-disable-next-line no-var
  var _mongooseConn: Promise<typeof mongoose> | undefined;
}

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;
  if (global._mongooseConn) return global._mongooseConn;
  global._mongooseConn = mongoose.connect(MONGODB_URI);
  return global._mongooseConn;
}
