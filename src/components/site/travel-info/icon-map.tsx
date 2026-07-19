import {
  Wallet,
  Languages,
  Clock,
  Phone,
  Plug,
  Droplet,
  BookUser,
  Sun,
  Flower2,
  Leaf,
  Snowflake,
  Car,
  Utensils,
  Map,
  Bus,
  Banknote,
  Landmark,
  Calendar,
  Compass,
  MapPin,
  Sparkles,
  Info,
  type LucideIcon,
} from "lucide-react";

// Maps the string icon names stored in message files to lucide components.
export const ICONS: Record<string, LucideIcon> = {
  wallet: Wallet,
  languages: Languages,
  clock: Clock,
  phone: Phone,
  plug: Plug,
  droplet: Droplet,
  passport: BookUser,
  sun: Sun,
  flower: Flower2,
  leaf: Leaf,
  snowflake: Snowflake,
  car: Car,
  utensils: Utensils,
  map: Map,
  bus: Bus,
  banknote: Banknote,
  landmark: Landmark,
  calendar: Calendar,
  compass: Compass,
  "map-pin": MapPin,
  sparkles: Sparkles,
  info: Info,
};

export function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = ICONS[name] ?? Landmark;
  return <Cmp className={className} />;
}
