"use client";

import { ChevronRight, Home } from "lucide-react";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";

const LABELS: Record<string, string> = {
  admin: "Admin",
  superadmin: "Super Admin",
  places: "Places",
  cities: "Cities",
  users: "Users",
  reservations: "Reservations",
  orders: "Orders",
  media: "Media",
  theme: "Theme",
  cms: "CMS",
  database: "Database",
  pricing: "Pricing",
  new: "New",
  edit: "Edit",
};

export function AdminBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const adminIdx = segments.indexOf("superadmin");
  if (adminIdx === -1) return null;

  const crumbs = segments.slice(adminIdx);

  return (
    <nav className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
      <Link href="/" className="hover:text-foreground transition-colors">
        <Home className="size-3.5" />
      </Link>
      {crumbs.map((seg, i) => {
        const isLast = i === crumbs.length - 1;
        const href =
          "/" +
          [...segments.slice(0, adminIdx), ...crumbs.slice(0, i + 1)].join(
            "/"
          );
        const label =
          LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1);
        return (
          <span key={`${seg}-${i}`} className="flex items-center gap-1">
            <ChevronRight className="size-3" />
            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link
                href={href}
                className="hover:text-foreground transition-colors"
              >
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
