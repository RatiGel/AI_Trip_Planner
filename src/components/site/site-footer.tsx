import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function SiteFooter() {
  const t = useTranslations();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="container mx-auto grid gap-8 px-4 py-10 md:grid-cols-4">
        <div className="space-y-2">
          <p className="font-semibold">{t("site.name")}</p>
          <p className="text-sm text-muted-foreground">{t("footer.tagline")}</p>
        </div>
        <div>
          <p className="mb-3 text-sm font-medium">{t("nav.cities")}</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/cities">Tbilisi</Link></li>
            <li><Link className="hover:text-foreground" href="/cities">Batumi</Link></li>
            <li><Link className="hover:text-foreground" href="/cities">Kazbegi</Link></li>
            <li><Link className="hover:text-foreground" href="/cities">Kutaisi</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-medium">{t("nav.tickets")}</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/tickets">{t("tickets.bus")}</Link></li>
            <li><Link className="hover:text-foreground" href="/tickets">{t("tickets.rail")}</Link></li>
            <li><Link className="hover:text-foreground" href="/tickets">{t("tickets.transitPass")}</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-medium">{t("nav.admin")}</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/admin">{t("admin.dashboard")}</Link></li>
            <li><Link className="hover:text-foreground" href="/login">{t("nav.login")}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60">
        <p className="container mx-auto px-4 py-4 text-xs text-muted-foreground">
          {t("footer.rights", { year })}
        </p>
      </div>
    </footer>
  );
}
