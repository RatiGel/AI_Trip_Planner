import Image from "next/image";
import mongoose from "mongoose";
import { notFound } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { ReserveForm } from "@/components/site/reserve-form";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";
import { serializePlace } from "@/lib/serialize";
import type { Place } from "@/types";

export default async function ReservePage({
  params,
}: {
  params: Promise<{ locale: string; placeId: string }>;
}) {
  const { locale, placeId } = await params;
  setRequestLocale(locale);
  // placeId may be a slug, a Mongo _id, or legacy/mock id — resolve robustly.
  if (!placeId) notFound();
  await connectDB();
  const doc = mongoose.isValidObjectId(placeId)
    ? await PlaceModel.findById(placeId).lean()
    : await PlaceModel.findOne({ slug: placeId }).lean();
  if (!doc) notFound();
  const place = serializePlace(doc);
  return <ReserveContent place={place} />;
}

function ReserveContent({ place }: { place: Place }) {
  const t = useTranslations("reserve");
  const locale = useLocale();
  const name = locale === "ka" ? place.nameKa : place.name;

  return (
    <div className="container mx-auto grid gap-8 px-4 py-12 md:grid-cols-[1fr_360px]">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{name}</p>
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <ReserveForm place={place} />
        </div>
      </div>
      <aside className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="relative aspect-[4/3] w-full bg-muted">
          {place.images[0] && (
            <Image src={place.images[0]} alt={name} fill className="object-cover" />
          )}
        </div>
        <div className="p-4 text-sm">
          <p className="font-medium">{name}</p>
          <p className="text-muted-foreground">{place.geo.address}</p>
        </div>
      </aside>
    </div>
  );
}
