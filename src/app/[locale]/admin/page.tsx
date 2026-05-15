import { Building2, CalendarCheck, MapPin, Receipt } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { mockCities } from "@/lib/mock/cities";
import { mockPlaces } from "@/lib/mock/places";

const STATS = [
  { key: "cities" as const, getValue: () => mockCities.length, Icon: Building2 },
  { key: "places" as const, getValue: () => mockPlaces.length, Icon: MapPin },
  { key: "reservations" as const, getValue: () => 14, Icon: CalendarCheck },
  { key: "ticketOrders" as const, getValue: () => 27, Icon: Receipt },
];

export default function AdminHome() {
  const t = useTranslations("admin");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{t("dashboard")}</h1>
        <p className="text-muted-foreground">Overview at a glance</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map(({ key, getValue, Icon }) => (
          <Link
            key={key}
            href={key === "ticketOrders" ? "/admin/orders" : `/admin/${key}`}
            className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{t(key)}</p>
              <Icon className="size-4 text-primary" />
            </div>
            <p className="mt-2 text-3xl font-bold">{getValue()}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
