import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";
import { ListingForm } from "@/components/business/listing-form";
import { redirect } from "@/i18n/navigation";
import type { CategorySlug } from "@/types";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const userId = (session!.user as { id?: string }).id!;

  await connectDB();
  const place = await PlaceModel.findById(id).lean() as any;

  if (!place || place.ownerId !== userId) {
    redirect({ href: "/business/listings", locale });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit listing</h1>
        <p className="text-sm text-muted-foreground">{place.name}</p>
      </div>
      <ListingForm
        listingId={id}
        defaultValues={{
          name: place.name ?? "",
          nameKa: place.nameKa ?? "",
          citySlug: place.citySlug ?? "",
          address: place.geo?.address ?? "",
          lng: place.geo?.lng ?? 0,
          lat: place.geo?.lat ?? 0,
          description: place.description ?? "",
          descriptionKa: place.descriptionKa ?? "",
          categories: (place.categories ?? []) as CategorySlug[],
          priceLevel: place.priceLevel ?? 2,
          phone: place.phone ?? "",
          website: place.website ?? "",
          reservable: place.reservable ?? false,
        }}
      />
    </div>
  );
}
