import {
  Coffee,
  Landmark,
  MapPin,
  Music,
  ShoppingBag,
  Trees,
  Utensils,
  Wine,
  type LucideIcon,
} from "lucide-react";
import type { CategorySlug } from "@/types";

const ICONS: Record<CategorySlug, LucideIcon> = {
  museum: Landmark,
  sight: MapPin,
  cafe: Coffee,
  club: Music,
  restaurant: Utensils,
  park: Trees,
  shop: ShoppingBag,
  wine: Wine,
};

export function CategoryIcon({
  slug,
  className,
}: {
  slug: CategorySlug;
  className?: string;
}) {
  const Icon = ICONS[slug];
  return <Icon className={className} />;
}
