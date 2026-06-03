import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { BusinessRequestModel } from "@/lib/models/business-request";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id!;
  const { businessName, businessType, description } = await req.json();

  if (!businessName || !businessType || !description) {
    return Response.json({ error: "All fields required" }, { status: 400 });
  }

  await connectDB();

  const existing = await BusinessRequestModel.findOne({ userId });
  if (existing) {
    return Response.json(
      { error: "You already have a pending or approved request" },
      { status: 409 }
    );
  }

  const request = await BusinessRequestModel.create({
    userId,
    businessName,
    businessType,
    description,
  });

  return Response.json({ id: request._id.toString(), status: request.status });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id!;
  await connectDB();

  const request = await BusinessRequestModel.findOne({ userId }).lean();
  if (!request) return Response.json(null);

  return Response.json({
    id: request._id.toString(),
    status: request.status,
    rejectionReason: request.rejectionReason ?? null,
  });
}
