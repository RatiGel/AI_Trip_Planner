import { setRequestLocale } from "next-intl/server";
import { ImagePlus } from "lucide-react";
import { redirect, Link } from "@/i18n/navigation";
import { requireBusiness, isDenied, isSuperadmin } from "@/lib/permissions";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";

export default async function BusinessMediaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requireBusiness();
  if (isDenied(actor)) {
    return redirect({ href: "/", locale });
  }

  await connectDB();
  const query = isSuperadmin(actor) ? {} : { ownerId: actor.id };
  const places = await PlaceModel.find(query)
    .select("name slug images ownerId")
    .sort({ createdAt: -1 })
    .lean();

  const listings = places.map((p) => {
    const doc = p as unknown as { _id: unknown; name: string; slug: string; images?: string[] };
    return {
      id: String(doc._id),
      name: doc.name,
      slug: doc.slug,
      images: doc.images ?? [],
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Media</h1>
        <p className="text-sm text-muted-foreground">Photos for your listings</p>
      </div>

      {listings.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border text-muted-foreground">
          <ImagePlus className="size-10" />
          <p className="text-sm">You don&apos;t have any listings yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                  {listing.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={listing.images[0]}
                      alt={listing.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <ImagePlus className="size-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{listing.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {listing.images.length} photo{listing.images.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <Link
                href={`/business/listings/${listing.id}/edit` as Parameters<typeof Link>[0]["href"]}
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Manage photos →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
