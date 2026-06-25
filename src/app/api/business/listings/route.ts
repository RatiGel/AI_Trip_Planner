import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";

async function requireBusiness() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !["business", "admin", "superadmin"].includes(role ?? "")) {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireBusiness();
  if (!session) return Response.json({ error: "Forbidden" }, { status: 403 });

  const userId = (session.user as { id?: string }).id!;
  await connectDB();

  const places = await PlaceModel.find({ ownerId: userId })
    .select("name slug status featured viewCount rating reviewCount categories citySlug createdAt")
    .sort({ createdAt: -1 })
    .lean();

  return Response.json(
    places.map((p: any) => ({
      id: p._id.toString(),
      name: p.name,
      slug: p.slug,
      status: p.status ?? "active",
      featured: p.featured ?? false,
      viewCount: p.viewCount ?? 0,
      rating: p.rating ?? 0,
      reviewCount: p.reviewCount ?? 0,
      categories: p.categories ?? [],
      citySlug: p.citySlug,
    }))
  );
}

export async function POST(req: Request) {
  const session = await requireBusiness();
  if (!session) return Response.json({ error: "Forbidden" }, { status: 403 });

  const userId = (session.user as { id?: string }).id!;
  const body = await req.json();
  const {
    name, nameKa, citySlug, address, lng, lat, description, descriptionKa,
    categories, priceLevel, phone, email, website, socials, openingHours,
    reservable, draft,
  } = body;

  if (!name || !citySlug) {
    return Response.json({ error: "name and citySlug required" }, { status: 400 });
  }

  await connectDB();

  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;

  // "draft" → saved but not submitted. Otherwise → pending admin review.
  const status = draft ? "draft" : "pending";

  const place = await PlaceModel.create({
    slug,
    name,
    nameKa: nameKa || "",
    citySlug,
    geo: { address: address || "", lng: lng || 0, lat: lat || 0 },
    description: description || "",
    descriptionKa: descriptionKa || "",
    categories: categories || [],
    priceLevel: priceLevel || 2,
    phone: phone || "",
    email: email || "",
    website: website || "",
    socials: socials || {},
    openingHours: Array.isArray(openingHours) ? openingHours : [],
    reservable: !!reservable,
    ownerId: userId,
    status,
    paid: false,
    images: [],
    viewCount: 0,
  });

  return Response.json({ id: place._id.toString(), slug: place.slug, status }, { status: 201 });
}
