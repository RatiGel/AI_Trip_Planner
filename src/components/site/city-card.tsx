import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { City } from "@/types";

export function CityCard({ city }: { city: City }) {
  const t = useTranslations("cities");
  const locale = useLocale();
  const name = locale === "ka" ? city.nameKa : city.name;

  return (
    <Link
      href={`/cities/${city.slug}`}
      className="group relative block aspect-[4/5] overflow-hidden rounded-2xl"
    >
      <Image
        src={city.heroImage}
        alt={name}
        fill
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
        className="object-cover transition duration-500 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute inset-x-4 bottom-4 text-white">
        <p className="text-xl font-semibold">{name}</p>
        <p className="text-xs text-white/80">
          {t("placesCount", { count: city.placesCount })}
        </p>
      </div>
    </Link>
  );
}
