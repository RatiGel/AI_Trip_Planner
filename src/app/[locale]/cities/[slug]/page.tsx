import type { Metadata } from "next";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CategoryTabs } from "@/components/site/category-tabs";
import { connectDB } from "@/lib/db";
import { CityModel } from "@/lib/models/city";
import { PlaceModel } from "@/lib/models/place";
import { PUBLISHED } from "@/lib/places/published";
import { buildMetadata, SITE_URL } from "@/lib/seo";
import { JsonLd } from "@/components/site/json-ld";
import { pickLocalized, hasTranslation } from "@/lib/i18n-content";
import type { City, Place } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  await connectDB();
  const city = (await CityModel.findOne({ slug }).lean()) as unknown as City | null;
  if (!city) return {};
  const name = pickLocalized(city, "name", locale);
  const description = pickLocalized(city, "description", locale);
  const meta = buildMetadata({
    locale,
    path: `/cities/${slug}`,
    title: `Things to Do in ${name} — Attractions & Travel Guide`,
    description,
  });
  // Untranslated locales render English copy — keep them out of the index so
  // they don't compete with the /en original as duplicates.
  if (!hasTranslation(city, locale)) {
    meta.robots = { index: false, follow: true };
  }
  return meta;
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  await connectDB();
  const city = (await CityModel.findOne({ slug }).lean()) as unknown as City | null;
  if (!city) notFound();
  const places = (await PlaceModel.find({ citySlug: slug, ...PUBLISHED }).lean()) as unknown as Place[];
  return <CityContent city={city} places={places} />;
}

function CityContent({ city, places }: { city: City; places: Place[] }) {
  const t = useTranslations("city");
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const name = pickLocalized(city, "name", locale);
  const description = pickLocalized(city, "description", locale);
  const citySchema = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name,
    description,
    url: `${SITE_URL}/${locale}/cities/${city.slug}`,
    geo: {
      "@type": "GeoCoordinates",
      latitude: city.geo.lat,
      longitude: city.geo.lng,
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: city.geo.address,
      addressCountry: city.country,
    },
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "ExploreTbilisi",
        item: `${SITE_URL}/${locale}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name,
        item: `${SITE_URL}/${locale}/cities/${city.slug}`,
      },
    ],
  };

  return (
    <>
      <JsonLd data={citySchema} />
      <JsonLd data={breadcrumbSchema} />
      <section className="relative h-[40vh] min-h-72 w-full overflow-hidden">
        <Image src={city.heroImage} alt={name} fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="container mx-auto absolute inset-x-0 bottom-0 px-4 pb-8 text-white">
          <p className="text-sm uppercase tracking-wide text-white/70">{city.country}</p>
          <h1 className="mt-1 text-4xl font-bold tracking-tight md:text-5xl">{name}</h1>
        </div>
      </section>

      <section className="container mx-auto grid gap-10 px-4 py-10 md:grid-cols-3">
        <div className="md:col-span-2">
          <h2 className="text-xl font-semibold">{t("overview")}</h2>
          <p className="mt-2 text-muted-foreground">{description}</p>
        </div>
        <aside className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="size-4 text-primary" />
            <span>{city.geo.address}</span>
          </div>
          <Button asChild className="w-full">
            <Link href="/map">{tNav("map")}</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/chat">{tNav("chat")}</Link>
          </Button>
        </aside>
      </section>

      <section className="container mx-auto px-4 pb-16">
        <h2 className="mb-4 text-xl font-semibold">{t("all")}</h2>
        <CategoryTabs places={places} />
      </section>
    </>
  );
}
