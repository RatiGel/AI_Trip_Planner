import Image from "next/image";
import { MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CategoryTabs } from "@/components/site/category-tabs";
import { getCityBySlug, mockCities } from "@/lib/mock/cities";
import { getPlacesByCity } from "@/lib/mock/places";

export function generateStaticParams() {
  return mockCities.map((c) => ({ slug: c.slug }));
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const city = getCityBySlug(slug);
  if (!city) notFound();
  return <CityContent slug={slug} />;
}

function CityContent({ slug }: { slug: string }) {
  const t = useTranslations("city");
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const city = getCityBySlug(slug)!;
  const places = getPlacesByCity(slug);
  const name = locale === "ka" ? city.nameKa : city.name;
  const description = locale === "ka" ? city.descriptionKa : city.description;

  return (
    <>
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
