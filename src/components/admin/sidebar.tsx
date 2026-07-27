"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Building2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  Image,
  LayoutDashboard,
  LogOut,
  MapPin,
  Palette,
  Receipt,
  ShieldCheck,
  Tag,
  Users,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut, useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "dashboard", Icon: LayoutDashboard, exact: true },
  { href: "/admin/moderation", label: "moderation", Icon: ShieldCheck, exact: false },
  { href: "/admin/places", label: "places", Icon: MapPin, exact: false },
  { href: "/admin/cities", label: "cities", Icon: Building2, exact: false },
  { href: "/admin/reservations", label: "reservations", Icon: CalendarCheck, exact: false },
  { href: "/admin/notifications", label: "notifications", Icon: Bell, exact: false },
  { href: "/admin/orders", label: "ticketOrders", Icon: Receipt, exact: false },
  { href: "/admin/users", label: "users", Icon: Users, exact: false },
  { href: "/admin/media", label: "media", Icon: Image, exact: false },
  { href: "/admin/theme", label: "theme", Icon: Palette, exact: false },
  { href: "/admin/cms", label: "cms", Icon: FileText, exact: false },
  { href: "/admin/database", label: "database", Icon: Database, exact: false },
  { href: "/admin/pricing", label: "pricing", Icon: Tag, exact: false },
] as const;

type LabelKey = (typeof NAV)[number]["label"];

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const t = useTranslations("admin");
  const { data: session } = useSession();

  useEffect(() => {
    const stored = localStorage.getItem("admin-sidebar-collapsed");
    if (stored !== null) setCollapsed(stored === "true");
  }, []);

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
            {t("title")}
          </p>
        )}
        {NAV.map(({ href, label, Icon, exact }) => {
          const isActive = exact
            ? /\/admin\/?$/.test(pathname)
            : pathname.includes(href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? t(label as LabelKey) : undefined}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
                collapsed && "justify-center px-0"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && (
                <span className="truncate">{t(label as LabelKey)}</span>
              )}
            </Link>
          );
        })}
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
            <p className="text-xs text-muted-foreground truncate">
              {session.user.email}
            </p>
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
        {collapsed ? (
          <ChevronRight className="size-4" />
        ) : (
          <ChevronLeft className="size-4" />
        )}
      </button>
    </aside>
  );
}
