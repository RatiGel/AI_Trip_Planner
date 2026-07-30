import { setRequestLocale } from "next-intl/server";
import { requireListingAccess, isDenied } from "@/lib/permissions";
import { UserModel } from "@/lib/models/user";
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

  const access = await requireListingAccess(id);
  if (isDenied(access)) {
    return redirect({ href: "/business/listings", locale });
  }
  const { place, actor, asSuperadmin } = access;
  const p = place as any;
  const editingSomeoneElse = asSuperadmin && String(place.ownerId ?? "") !== actor.id;

  let ownerLabel = "";
  if (editingSomeoneElse && place.ownerId) {
    const owner = await UserModel.findById(String(place.ownerId))
      .select("name email")
      .lean() as { name?: string; email?: string } | null;
    ownerLabel = owner ? `${owner.name ?? "Unknown"} (${owner.email ?? "no email"})` : "unassigned";
  }

  return (
    <div className="space-y-6">
      {editingSomeoneElse && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
          <span className="font-medium">Editing as superadmin</span>
          {ownerLabel && <span className="text-muted-foreground"> — owner: {ownerLabel}</span>}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit listing</h1>
        <p className="text-sm text-muted-foreground">{p.name}</p>
      </div>
      <ListingForm
        listingId={id}
        status={p.status ?? "draft"}
        defaultValues={{
          name: p.name ?? "",
          nameKa: p.nameKa ?? "",
          citySlug: p.citySlug ?? "",
          address: p.geo?.address ?? "",
          lng: p.geo?.lng ?? 0,
          lat: p.geo?.lat ?? 0,
          description: p.description ?? "",
          descriptionKa: p.descriptionKa ?? "",
          categories: (p.categories ?? []) as CategorySlug[],
          priceLevel: p.priceLevel ?? 2,
          phone: p.phone ?? "",
          email: p.email ?? "",
          website: p.website ?? "",
          socials: p.socials ?? {},
          openingHours: p.openingHours ?? [],
          reservable: p.reservable ?? false,
          images: p.images ?? [],
          services: p.services ?? [],
          reservationPriceGEL: p.reservationPriceGEL ?? undefined,
        }}
      />
    </div>
  );
}
