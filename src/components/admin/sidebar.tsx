"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Building2,
  CalendarCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  Flag,
  Gift,
  Image,
  LayoutDashboard,
  LayoutTemplate,
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

type NavItem = {
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
  exact?: boolean;
};

type NavGroup = {
  key: string;
  label: string;
  items: NavItem[];
};

const GROUPS: NavGroup[] = [
  {
    key: "overview",
    label: "grpOverview",
    items: [{ href: "/admin", label: "dashboard", Icon: LayoutDashboard, exact: true }],
  },
  {
    key: "catalog",
    label: "grpCatalog",
    items: [
      { href: "/admin/places", label: "places", Icon: MapPin },
      { href: "/admin/cities", label: "cities", Icon: Building2 },
    ],
  },
  {
    key: "moderation",
    label: "grpModeration",
    items: [
      { href: "/admin/moderation", label: "moderation", Icon: ShieldCheck },
      { href: "/admin/content", label: "content", Icon: Flag },
      { href: "/admin/reservations", label: "reservations", Icon: CalendarCheck },
      { href: "/admin/orders", label: "ticketOrders", Icon: Receipt },
    ],
  },
  {
    key: "businesses",
    label: "grpBusinesses",
    items: [{ href: "/admin/businesses", label: "businesses", Icon: Building2 }],
  },
  {
    key: "marketing",
    label: "grpMarketing",
    items: [
      { href: "/admin/landing", label: "landing", Icon: LayoutTemplate },
      { href: "/admin/deals", label: "deals", Icon: Gift },
      { href: "/admin/pricing", label: "pricing", Icon: Tag },
    ],
  },
  {
    key: "platform",
    label: "grpPlatform",
    items: [
      { href: "/admin/users", label: "users", Icon: Users },
      { href: "/admin/reports", label: "reports", Icon: BarChart3 },
      { href: "/admin/security", label: "security", Icon: AlertCircle },
      { href: "/admin/theme", label: "theme", Icon: Palette },
      { href: "/admin/cms", label: "cms", Icon: FileText },
      { href: "/admin/media", label: "media", Icon: Image },
      { href: "/admin/database", label: "database", Icon: Database },
    ],
  },
];

function isItemActive(item: NavItem, pathname: string) {
  return item.exact ? /\/admin\/?$/.test(pathname) : pathname.includes(item.href);
}

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const pathname = usePathname();
  const t = useTranslations("admin");
  const { data: session } = useSession();

  useEffect(() => {
    const stored = localStorage.getItem("admin-sidebar-collapsed");
    if (stored !== null) setCollapsed(stored === "true");
  }, []);

  const toggleCollapse = () =>
    setCollapsed((c) => {
      localStorage.setItem("admin-sidebar-collapsed", String(!c));
      return !c;
    });

  const toggleGroup = (key: string) =>
    setOpen((o) => ({ ...o, [key]: !o[key] }));

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col gap-2 sticky top-20 h-[calc(100vh-6rem)] transition-all duration-200 shrink-0",
        collapsed ? "w-14" : "w-[220px]"
      )}
    >
      <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card p-2 space-y-1">
        {!collapsed && (
          <p className="px-3 pt-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("title")}
          </p>
        )}

        {GROUPS.map((group) => {
          const groupActive = group.items.some((it) => isItemActive(it, pathname));
          const isOpen = collapsed ? true : open[group.key] ?? groupActive;

          return (
            <div key={group.key} className="space-y-0.5">
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>{t(group.label)}</span>
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform",
                      isOpen ? "rotate-0" : "-rotate-90"
                    )}
                  />
                </button>
              )}

              {isOpen &&
                group.items.map(({ href, label, Icon, exact }) => {
                  const active = isItemActive({ href, label, Icon, exact }, pathname);
                  return (
                    <Link
                      key={href}
                      href={href}
                      title={collapsed ? t(label) : undefined}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
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
          {!collapsed && t("signOut")}
        </button>
      </div>

      <button
        onClick={toggleCollapse}
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
