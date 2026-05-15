import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { CityCard } from "@/components/site/city-card";
import { mockCities } from "@/lib/mock/cities";

export default async function CitiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CitiesContent />;
}

function CitiesContent() {
  const t = useTranslations("cities");
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {mockCities.map((c) => (
          <CityCard key={c.id} city={c} />
        ))}
      </div>
    </div>
  );
}
