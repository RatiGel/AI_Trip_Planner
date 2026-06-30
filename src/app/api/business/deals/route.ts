import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { DealModel } from "@/lib/models/deal";

async function requireBusiness() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !["business", "admin"].includes(role ?? "")) {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireBusiness();
  if (!session) return Response.json({ error: "Forbidden" }, { status: 403 });

  const userId = (session.user as { id?: string }).id!;
  await connectDB();
  const deals = await DealModel.find({ ownerId: userId }).sort({ createdAt: -1 }).lean();
  return Response.json(
    deals.map((d) => ({
      id: String(d._id),
      title: d.title,
      category: d.category,
      priceGEL: d.priceGEL,
      status: d.status,
      rejectionReason: d.rejectionReason ?? "",
      createdAt: (d.createdAt as Date).toISOString(),
    }))
  );
}

export async function POST(req: Request) {
  const session = await requireBusiness();
  if (!session) return Response.json({ error: "Forbidden" }, { status: 403 });

  const userId = (session.user as { id?: string }).id!;
  const body = await req.json();

  // Owner-submitted deals always start pending — never trust a client status.
  const priceOriginal = Number(body.priceOriginal);
  const priceGEL = Number(body.priceGEL);
  if (
    !body.title ||
    !body.description ||
    !Number.isFinite(priceGEL) ||
    priceGEL <= 0 ||
    !Number.isFinite(priceOriginal) ||
    priceOriginal <= 0
  ) {
    return Response.json({ error: "Invalid deal" }, { status: 400 });
  }
  const discountPct =
    priceOriginal > 0 ? Math.max(0, Math.round((1 - priceGEL / priceOriginal) * 100)) : 0;

  await connectDB();
  const deal = await DealModel.create({
    title: String(body.title).slice(0, 120),
    description: String(body.description).slice(0, 600),
    priceOriginal,
    priceGEL,
    discountPct,
    category: ["attraction", "food", "transport", "experience"].includes(body.category)
      ? body.category
      : "experience",
    validUntil: body.validUntil || undefined,
    image: body.image || undefined,
    ownerId: userId,
    status: "pending",
    active: true,
  });

  return Response.json({ id: String(deal._id), status: deal.status }, { status: 201 });
}
