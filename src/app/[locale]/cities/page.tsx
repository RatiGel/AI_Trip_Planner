import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { CityCard } from "@/components/site/city-card";
import { connectDB } from "@/lib/db";
import { CityModel } from "@/lib/models/city";
import type { City } from "@/types";

export default async function CitiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await connectDB();
  const cities = (await CityModel.find().lean()) as unknown as City[];
  return <CitiesContent cities={cities} />;
}

function CitiesContent({ cities }: { cities: City[] }) {
  const t = useTranslations("cities");
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {cities.map((c) => (
          <CityCard key={c.slug} city={c} />
        ))}
      </div>
    </div>
  );
}
