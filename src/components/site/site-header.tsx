"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, ChevronDown, LayoutDashboard, LogOut, Menu, Shield, Sparkles, Ticket, User, X } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const t = useTranslations("header");
  const tNav = useTranslations("nav");

  const NAV: { label: string; href: string; icon?: React.ReactNode; children: { label: string; href: string }[] }[] = [
    { label: t("travelInfo"), href: "/travel-info", children: [] },
    {
      label: t("discover"),
      href: "/discover",
      children: [
        { label: t("discoverSightseeing"), href: "/discover?category=sight" },
        { label: t("discoverMuseums"), href: "/discover?category=museum" },
        { label: t("discoverNeighborhoods"), href: "/discover" },
        { label: t("discoverParks"), href: "/discover?category=nature" },
      ],
    },
    {
      label: t("experiences"),
      href: "/experiences",
      children: [
        { label: t("experiencesTours"), href: "/experiences?type=tour" },
        { label: t("experiencesDayTrips"), href: "/experiences?type=daytrip" },
        { label: t("experiencesWellness"), href: "/experiences?type=wellness" },
        { label: t("experiencesOutdoor"), href: "/experiences?type=outdoor" },
      ],
    },
    {
      label: t("foodDrinks"),
      href: "/food",
      children: [
        { label: t("foodRestaurants"), href: "/food?type=restaurant" },
        { label: t("foodCafes"), href: "/food?type=cafe" },
        { label: t("foodWine"), href: "/food?type=wine" },
        { label: t("foodNightlife"), href: "/food?type=nightlife" },
      ],
    },
    {
      label: t("events"),
      href: "/events",
      children: [
        { label: t("eventsUpcoming"), href: "/events" },
        { label: t("eventsFestivals"), href: "/events?type=festival" },
        { label: t("eventsArts"), href: "/events?type=arts" },
        { label: t("eventsMusic"), href: "/events?type=music" },
      ],
    },
    { label: t("deals"), href: "/deals", children: [] },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isHome = pathname === "/";

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-all duration-400"
      style={{
        background: scrolled
          ? "var(--site-header-bg)"
          : isHome
          ? "linear-gradient(to bottom, rgba(0,0,0,0.65), transparent)"
          : "var(--site-header-bg)",
        backdropFilter: scrolled || !isHome ? "blur(20px)" : "none",
        borderBottom: scrolled || !isHome ? "1px solid var(--site-border-06)" : "none",
      }}
    >
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6 md:px-12 xl:grid xl:grid-cols-[1fr_auto_1fr]">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1">
          <span className="font-display text-[22px] tracking-[-0.5px]" style={{ color: "var(--site-text)" }}>
            Tbilisi<span style={{ color: "#E8A020" }}>.</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 xl:flex">
          {NAV.map((item) => (
            <div
              key={item.label}
              className="relative"
              onMouseEnter={() => item.children.length > 0 && setOpenMenu(item.label)}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <Link
                href={item.href}
                className="flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-2 text-[14px] font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{ color: "var(--site-text-80)" }}
              >
                {item.icon && item.icon}
                {item.label}
                {item.children.length > 0 && (
                  <ChevronDown
                    className="size-3.5 transition-transform duration-200"
                    style={{ transform: openMenu === item.label ? "rotate(180deg)" : "rotate(0)" }}
                  />
                )}
              </Link>

              {/* Dropdown */}
              <AnimatePresence>
                {openMenu === item.label && item.children.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.18 }}
                    className="absolute left-0 top-full mt-1 w-52 overflow-hidden rounded-2xl py-2 shadow-2xl"
                    style={{ background: "var(--site-bg-elevated)", border: "1px solid var(--site-border-08)" }}
                  >
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-4 py-2.5 text-[13px] transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                        style={{ color: "var(--site-text-65)" }}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center justify-end gap-2 lg:justify-self-end xl:ml-6 xl:pl-6 xl:border-l" style={{ borderColor: "var(--site-border-20)" }}>
          {session?.user && (
            <Link
              href="/tickets"
              className="hidden items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition-all hover:-translate-y-0.5 sm:flex"
              style={{ border: "1px solid var(--site-border-20)", color: "var(--site-text-80)" }}
            >
              <Ticket className="size-3.5" />
              {t("tickets")}
            </Link>
          )}

          {session?.user ? (
            <div className="hidden items-center xl:flex">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-[13px] font-medium outline-none transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring"
                  style={{ border: "1px solid var(--site-border-20)", color: "var(--site-text-80)" }}
                >
                  <span
                    className="flex size-7 items-center justify-center rounded-full text-[12px] font-semibold uppercase"
                    style={{ background: "#E8A020", color: "#1a1a1a" }}
                  >
                    {session.user.name?.[0] ?? <User className="size-3.5" />}
                  </span>
                  {session.user.name?.split(" ")[0] ?? "Account"}
                  <ChevronDown className="size-3.5 opacity-60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col">
                    <span className="text-sm font-medium">{session.user.name}</span>
                    {session.user.email && (
                      <span className="truncate text-xs font-normal text-muted-foreground">
                        {session.user.email}
                      </span>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem render={<Link href="/trips" />}>
                    <Sparkles className="size-4" /> My Trips
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href="/reservations" />}>
                    <CalendarDays className="size-4" /> Reservations
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href="/profile" />}>
                    <User className="size-4" /> Profile
                  </DropdownMenuItem>

                  {(["business", "admin", "superadmin"] as string[]).includes(
                    (session.user as { role?: string }).role ?? ""
                  ) && <DropdownMenuSeparator />}

                  {(session.user as { role?: string }).role === "business" && (
                    <DropdownMenuItem render={<Link href="/business" />}>
                      <LayoutDashboard className="size-4" /> {tNav("myBusiness")}
                    </DropdownMenuItem>
                  )}
                  {(["admin", "superadmin"] as string[]).includes(
                    (session.user as { role?: string }).role ?? ""
                  ) && (
                    <DropdownMenuItem render={<Link href="/admin" />}>
                      <Shield className="size-4" /> {tNav("admin")}
                    </DropdownMenuItem>
                  )}
                  {(session.user as { role?: string }).role === "superadmin" && (
                    <DropdownMenuItem render={<Link href="/superadmin" />}>
                      <Shield className="size-4" /> {tNav("superadmin")}
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    <LogOut className="size-4" /> {tNav("logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-md px-3 py-1.5 text-[13px] transition-colors xl:block"
              style={{ color: "var(--site-text-50)" }}
            >
              {tNav("login")}
            </Link>
          )}

          <ThemeToggle />
          <LanguageSwitcher />

          {/* Mobile hamburger */}
          <button
            className="flex size-9 items-center justify-center rounded-full transition-colors xl:hidden"
            style={{ background: "var(--site-surface-08)", color: "var(--site-text-80)" }}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t xl:hidden"
            style={{ background: "var(--site-header-bg)", backdropFilter: "blur(20px)", borderColor: "var(--site-border-06)" }}
          >
            <nav className="flex flex-col gap-0.5 px-4 py-4">
              {NAV.map((item) => (
                <div key={item.label}>
                  <Link
                    href={item.href}
                    className="block rounded-xl px-4 py-3 text-[15px] font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ color: "var(--site-text-80)" }}
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                </div>
              ))}
              <div className="my-2 h-px" style={{ background: "var(--site-border-06)" }} />
              {session?.user ? (
                <button
                  onClick={() => { signOut({ callbackUrl: "/" }); setMobileOpen(false); }}
                  className="rounded-xl px-4 py-3 text-left text-[15px] hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ color: "var(--site-text-50)" }}
                >
                  {tNav("logout")}
                </button>
              ) : (
                <Link href="/login" className="block rounded-xl px-4 py-3 text-[15px] hover:bg-black/5 dark:hover:bg-white/5" style={{ color: "var(--site-text-50)" }} onClick={() => setMobileOpen(false)}>
                  {tNav("login")}
                </Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
