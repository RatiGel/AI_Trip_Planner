import Image from "next/image";
import { Clock, MapPin, Phone, Star, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlaceCard } from "@/components/site/place-card";
import { PayButton } from "@/components/site/pay-button";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";
import { serializePlace, serializeDoc } from "@/lib/serialize";
import type { Place } from "@/types";

const DAY_NAMES_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_KA = ["კვი", "ორშ", "სამ", "ოთხ", "ხუთ", "პარ", "შაბ"];

export default async function PlacePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  await connectDB();
  const placeDoc = await PlaceModel.findOne({ slug }).lean();
  if (!placeDoc) notFound();
  // Serialize for the client + normalize service subdoc _id → id.
  const place = serializePlace(placeDoc);
  const similar = serializeDoc<Place[]>(
    await PlaceModel.find({ citySlug: place.citySlug, slug: { $ne: slug } })
      .limit(3)
      .lean()
  );
  return <PlaceContent place={place} similar={similar} />;
}

function PlaceContent({ place, similar }: { place: Place; similar: Place[] }) {
  const t = useTranslations("place");
  const tCat = useTranslations("categories");
  const locale = useLocale();
  const name = locale === "ka" ? place.nameKa : place.name;
  const description = locale === "ka" ? place.descriptionKa : place.description;
  const dayNames = locale === "ka" ? DAY_NAMES_KA : DAY_NAMES_EN;

  return (
    <article className="container mx-auto grid gap-8 px-4 py-10 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="relative col-span-2 row-span-2 aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
            {place.images[0] && (
              <Image src={place.images[0]} alt={name} fill priority className="object-cover" />
            )}
          </div>
          {place.images.slice(1, 3).map((src, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
              <Image src={src} alt="" fill className="object-cover" />
            </div>
          ))}
        </div>

        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="size-4 fill-amber-400 text-amber-400" />
                  <span className="font-medium text-foreground">{place.rating.toFixed(1)}</span>
                  <span>({place.reviewCount.toLocaleString()})</span>
                </div>
                <span>·</span>
                <span>{"$".repeat(place.priceLevel)}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {place.categories.map((c) => (
                <Badge key={c} variant="secondary">{tCat(c)}</Badge>
              ))}
            </div>
          </div>
          <p className="mt-4 text-base text-muted-foreground">{description}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {place.reservable && (
            <Button asChild size="lg">
              <Link href={`/reserve/${place.id}`}>
                {t("reserve")}
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" size="lg">
            <Link href="/map">
              <MapPin className="size-4" />
              {t("viewOnMap")}
            </Link>
          </Button>
        </div>

        {place.services && place.services.length > 0 && (
          <section className="pt-6">
            <h2 className="mb-4 text-xl font-semibold">{t("services")}</h2>
            <div className="space-y-3">
              {place.services.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4"
                >
                  <div>
                    <p className="font-medium">{locale === "ka" && s.nameKa ? s.nameKa : s.name}</p>
                    {s.description && (
                      <p className="text-sm text-muted-foreground">{s.description}</p>
                    )}
                  </div>
                  <PayButton
                    purpose="service"
                    targetId={place.id}
                    serviceId={s.id}
                    label={`${s.priceGEL} ₾`}
                    size="sm"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {similar.length > 0 && (
          <section className="pt-6">
            <h2 className="mb-4 text-xl font-semibold">{t("similarNearby")}</h2>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {similar.map((p) => (
                <PlaceCard key={p.slug} place={p} />
              ))}
            </div>
          </section>
        )}
      </div>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Clock className="size-4 text-primary" /> {t("openingHours")}
          </h3>
          <ul className="text-sm space-y-1">
            {place.openingHours.map((h) => (
              <li key={h.day} className="flex justify-between">
                <span className="text-muted-foreground">{dayNames[h.day]}</span>
                <span>{h.closed ? "—" : `${h.open}–${h.close}`}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 text-primary" />
            <div>
              <p className="font-medium">{t("address")}</p>
              <p className="text-muted-foreground">{place.geo.address}</p>
            </div>
          </div>
          {place.phone && (
            <div className="flex items-start gap-2">
              <Phone className="mt-0.5 size-4 text-primary" />
              <div>
                <p className="font-medium">{t("phone")}</p>
                <p className="text-muted-foreground">{place.phone}</p>
              </div>
            </div>
          )}
          {place.website && (
            <div className="flex items-start gap-2">
              <Globe className="mt-0.5 size-4 text-primary" />
              <div>
                <p className="font-medium">{t("website")}</p>
                <a
                  className="text-primary underline-offset-4 hover:underline break-all"
                  href={place.website}
                  target="_blank"
                  rel="noreferrer"
                >
                  {place.website}
                </a>
              </div>
            </div>
          )}
        </div>
      </aside>
    </article>
  );
}
