import {
  Building2,
  CalendarCheck,
  LayoutDashboard,
  MapPin,
  Receipt,
  Tag,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

const NAV = [
  { href: "/admin", labelKey: "dashboard" as const, Icon: LayoutDashboard },
  { href: "/admin/places", labelKey: "places" as const, Icon: MapPin },
  { href: "/admin/cities", labelKey: "cities" as const, Icon: Building2 },
  { href: "/admin/reservations", labelKey: "reservations" as const, Icon: CalendarCheck },
  { href: "/admin/orders", labelKey: "ticketOrders" as const, Icon: Receipt },
];

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Shell>{children}</Shell>;
}

function Shell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("admin");
  return (
    <div className="container mx-auto grid gap-6 px-4 py-8 md:grid-cols-[220px_1fr]">
      <aside className="hidden md:block">
        <div className="sticky top-20 space-y-1 rounded-2xl border border-border bg-card p-2">
          <p className="px-3 pt-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("title")}
          </p>
          {NAV.map(({ href, labelKey, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Icon className="size-4" /> {t(labelKey)}
            </Link>
          ))}
        </div>
      </aside>
      <section>{children}</section>
    </div>
  );
}
