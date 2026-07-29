import Image from "next/image";
import { Star } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { pickLocalized } from "@/lib/i18n-content";
import type { Place } from "@/types";

interface PlaceCardProps {
  place: Place;
  className?: string;
}

export function PlaceCard({ place, className }: PlaceCardProps) {
  const t = useTranslations("categories");
  const locale = useLocale();
  const name = pickLocalized(place, "name", locale);
  const description = pickLocalized(place, "description", locale);

  return (
    <Link
      href={`/places/${place.slug}`}
      className={`group block overflow-hidden rounded-2xl border border-border bg-card transition hover:shadow-md ${className ?? ""}`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {place.images[0] ? (
          <Image
            src={place.images[0]}
            alt={name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition group-hover:scale-105"
          />
        ) : null}
        {place.priceLevel ? (
          <Badge variant="secondary" className="absolute right-3 top-3 bg-background/90 backdrop-blur">
            {"$".repeat(place.priceLevel)}
          </Badge>
        ) : null}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold leading-tight">{name}</h3>
          <div className="flex shrink-0 items-center gap-1 text-sm">
            <Star className="size-4 fill-amber-400 text-amber-400" />
            <span className="font-medium">{place.rating.toFixed(1)}</span>
          </div>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>
        <div className="flex flex-wrap gap-1 pt-1">
          {place.categories.map((c) => (
            <Badge key={c} variant="outline" className="text-[10px] uppercase tracking-wide">
              {t(c)}
            </Badge>
          ))}
        </div>
      </div>
    </Link>
  );
}
