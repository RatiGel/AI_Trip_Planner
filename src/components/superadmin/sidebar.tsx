"use client";

import { useState } from "react";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Database,
  Flag,
  FileText,
  Image,
  LayoutDashboard,
  LogOut,
  MapPin,
  Palette,
  Receipt,
  Shield,
  ShieldCheck,
  Tag,
  Users,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut, useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; Icon: typeof Users; exact?: boolean };
type Group = { heading?: string; items: Item[] };

const GROUPS: Group[] = [
  { items: [{ href: "/superadmin", label: "dashboard", Icon: LayoutDashboard, exact: true }] },
  {
    heading: "groupPlatform",
    items: [
      { href: "/superadmin/users", label: "users", Icon: Users },
      { href: "/superadmin/businesses", label: "businesses", Icon: Building2 },
      { href: "/superadmin/reports", label: "reports", Icon: BarChart3 },
      { href: "/superadmin/security", label: "security", Icon: Shield },
    ],
  },
  {
    heading: "groupContent",
    items: [
      { href: "/superadmin/places", label: "places", Icon: MapPin },
      { href: "/superadmin/cities", label: "cities", Icon: Building2 },
      { href: "/superadmin/moderation", label: "moderation", Icon: ShieldCheck },
      { href: "/superadmin/content", label: "contentMod", Icon: Flag },
      { href: "/superadmin/media", label: "media", Icon: Image },
      { href: "/superadmin/notifications", label: "notifications", Icon: Bell },
    ],
  },
  {
    heading: "groupCommerce",
    items: [
      { href: "/superadmin/reservations", label: "reservations", Icon: CalendarCheck },
      { href: "/superadmin/orders", label: "ticketOrders", Icon: Receipt },
      { href: "/superadmin/pricing", label: "pricing", Icon: Tag },
    ],
  },
  {
    heading: "groupDesign",
    items: [
      { href: "/superadmin/theme", label: "theme", Icon: Palette },
      { href: "/superadmin/cms", label: "cms", Icon: FileText },
    ],
  },
  {
    heading: "groupSystem",
    items: [{ href: "/superadmin/database", label: "database", Icon: Database }],
  },
];

export function SuperadminSidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("admin-sidebar-collapsed") === "true";
  });
  const pathname = usePathname();
  const t = useTranslations("admin");
  const { data: session } = useSession();

  const toggle = () =>
    setCollapsed((c) => {
      localStorage.setItem("admin-sidebar-collapsed", String(!c));
      return !c;
    });

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col gap-2 sticky top-20 h-[calc(100vh-6rem)] transition-all duration-200 shrink-0",
        collapsed ? "w-14" : "w-[220px]"
      )}
    >
      <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card p-2 space-y-0.5">
        {!collapsed && (
          <p className="px-3 pt-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Super Admin
          </p>
        )}
        {GROUPS.map((group, gi) => (
          <div key={group.heading ?? `g${gi}`} className={gi > 0 ? "pt-2" : undefined}>
            {group.heading && !collapsed && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                {t(group.heading)}
              </p>
            )}
            {group.heading && collapsed && (
              <div className="mx-auto my-1.5 h-px w-6 bg-border" aria-hidden />
            )}
            {group.items.map(({ href, label, Icon, exact }) => {
              const isActive = exact
                ? /\/superadmin\/?$/.test(pathname)
                : pathname.includes(href);
              return (
                <Link
                  key={href}
                  href={href}
                  title={collapsed ? t(label) : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {!collapsed && <span className="truncate">{t(label)}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      <div
        className={cn(
          "rounded-2xl border border-border bg-card p-2",
          collapsed && "flex flex-col items-center"
        )}
      >
        {!collapsed && session?.user && (
          <div className="px-3 py-1 mb-1">
            <p className="text-sm font-medium truncate">{session.user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut className="size-4" />
          {!collapsed && "Sign out"}
        </button>
      </div>

      <button
        onClick={toggle}
        className="flex items-center justify-center rounded-xl border border-border bg-card p-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
      </button>
    </aside>
  );
}
