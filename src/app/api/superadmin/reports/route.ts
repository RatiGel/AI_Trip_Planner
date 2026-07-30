import { connectDB } from "@/lib/db";
import { UserModel } from "@/lib/models/user";
import { PlaceModel } from "@/lib/models/place";
import { requireSuperadmin, isDenied } from "@/lib/permissions";

export async function GET() {
  const actor = await requireSuperadmin();
  if (isDenied(actor)) return actor;

  await connectDB();

  const [totalUsers, totalListings, activeListings, pendingListings] = await Promise.all([
    UserModel.countDocuments(),
    PlaceModel.countDocuments(),
    PlaceModel.countDocuments({ status: "active" }),
    PlaceModel.countDocuments({ status: "pending" }),
  ]);

  const usersByRole = await UserModel.aggregate([
    { $group: { _id: "$role", count: { $sum: 1 } } },
  ]);

  const listingsByCity = await PlaceModel.aggregate([
    { $group: { _id: "$citySlug", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 8 },
  ]);

  const listingsByCategory = await PlaceModel.aggregate([
    { $unwind: "$categories" },
    { $group: { _id: "$categories", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 8 },
  ]);

  return Response.json({
    totalUsers,
    totalListings,
    activeListings,
    pendingListings,
    usersByRole: usersByRole.map((r) => ({ role: r._id ?? "unknown", count: r.count })),
    listingsByCity: listingsByCity.map((r) => ({ city: r._id ?? "unknown", count: r.count })),
    listingsByCategory: listingsByCategory.map((r) => ({ category: r._id ?? "unknown", count: r.count })),
  });
}
