import Image from "next/image";
import { ArrowRight, MessageSquare, Route, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CityCard } from "@/components/site/city-card";
import { PlaceCard } from "@/components/site/place-card";
import { CategoryIcon } from "@/components/site/category-icon";
import { mockCities } from "@/lib/mock/cities";
import { mockPlaces } from "@/lib/mock/places";
import { mockCategories } from "@/lib/mock/categories";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LandingContent />;
}

function LandingContent() {
  const tHome = useTranslations("home");
  const tCommon = useTranslations("common");
  const tCategories = useTranslations("categories");

  const featuredPlaces = mockPlaces.slice(0, 6);

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image
            src="https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=2000&q=80"
            alt=""
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />
        </div>
        <div className="container mx-auto px-4 pt-20 pb-24 md:pt-32 md:pb-36">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="size-3.5 text-primary" />
              <span>AI-powered itineraries · Tbilisi & Georgia</span>
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-6xl">
              {tHome("heroTitle")}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground md:text-xl">
              {tHome("heroSubtitle")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/chat">
                  {tHome("ctaPlan")}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/cities">{tHome("ctaBrowse")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-8">
          {mockCategories.map((c) => (
            <Link
              key={c.slug}
              href="/cities/tbilisi"
              className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition hover:border-primary/40 hover:shadow-sm"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <CategoryIcon slug={c.slug} className="size-5" />
              </span>
              <span className="text-xs font-medium">{tCategories(c.slug)}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {tHome("featuredCities")}
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/cities">
              {tCommon("viewAll")}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {mockCities.map((c) => (
            <CityCard key={c.id} city={c} />
          ))}
        </div>
      </section>

      <section className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-10 text-2xl font-semibold tracking-tight md:text-3xl">
            {tHome("howItWorks")}
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { Icon: MessageSquare, key: "step1" as const },
              { Icon: Sparkles, key: "step2" as const },
              { Icon: Route, key: "step3" as const },
            ].map(({ Icon, key }) => (
              <div key={key} className="rounded-2xl border border-border bg-card p-6">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{tHome(`${key}Title`)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{tHome(`${key}Body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {tHome("featuredPlaces")}
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/cities">
              {tCommon("viewAll")}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredPlaces.map((p) => (
            <PlaceCard key={p.id} place={p} />
          ))}
        </div>
      </section>
    </>
  );
}
