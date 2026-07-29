"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, ChevronDown, LayoutDashboard, LogOut, MapPinned, Menu, Shield, User, X } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { AnnouncementBanner } from "./announcement-banner";
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
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const t = useTranslations("header");
  const tNav = useTranslations("nav");

  // Menu items: gold icon on hover/focus, a touch more breathing room
  const menuItemClass =
    "py-2 [&_svg]:text-muted-foreground focus:[&_svg]:text-[var(--color-gold)]";

  // Role credential shown in the account menu, matching the profile page's stamp
  const role = (session?.user as { role?: string })?.role ?? "tourist";
  const ROLE_LABEL: Record<string, string> = {
    superadmin: "Super Admin",
    admin: "Admin",
    business: "Business Owner",
  };
  const roleStamp =
    role in ROLE_LABEL
      ? {
          label: ROLE_LABEL[role],
          style:
            role === "business"
              ? {
                  background: "color-mix(in oklch, #E8A020 18%, transparent)",
                  color: "#E8A020",
                  boxShadow: "inset 0 0 0 1px color-mix(in oklch, #E8A020 30%, transparent)",
                }
              : {
                  background: "color-mix(in oklch, #B5271D 20%, transparent)",
                  color: "#f0857c",
                  boxShadow: "inset 0 0 0 1px color-mix(in oklch, #B5271D 30%, transparent)",
                },
        }
      : null;

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
    { label: t("gettingAround"), href: "/tickets", children: [] },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    // usePathname() reports "/" during SSR for every route, so a server-rendered
    // banner would flash on non-home pages before hydration corrects it. Flipping
    // this on the first client frame keeps it out of the initial HTML entirely.
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const isHome = pathname === "/";
  // On the home hero, unscrolled header floats over a bright image behind a dark
  // gradient — force light text there regardless of theme so it stays legible.
  const overHero = isHome && !scrolled;

  // Text/border colors: fixed light over the hero, theme tokens everywhere else.
  const c = overHero
    ? {
        text: "rgba(255,255,255,1)",
        text80: "rgba(255,255,255,0.9)",
        text65: "rgba(255,255,255,0.75)",
        border20: "rgba(255,255,255,0.28)",
        surface08: "rgba(255,255,255,0.12)",
      }
    : {
        text: "var(--site-text)",
        text80: "var(--site-text-80)",
        text65: "var(--site-text-65)",
        border20: "var(--site-border-20)",
        surface08: "var(--site-surface-08)",
      };

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-all duration-400"
      style={{
        background: scrolled
          ? "var(--site-header-bg)"
          : isHome
          ? "linear-gradient(to bottom, rgba(0,0,0,0.78), rgba(0,0,0,0.22) 70%, transparent)"
          : "var(--site-header-bg)",
        backdropFilter: scrolled || !isHome ? "blur(20px)" : "none",
        borderBottom: scrolled || !isHome ? "1px solid var(--site-border-06)" : "none",
      }}
    >
      {/* Launch banner — home page only, slides away on first scroll */}
      <AnimatePresence>
        {mounted && overHero && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <AnnouncementBanner />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6 md:px-12 xl:grid xl:grid-cols-[1fr_auto_1fr]">
        {/* Logo */}
        <Link href="/" className="flex flex-col items-start leading-none" aria-label="explore Tbilisi — home">
          <span
            className="font-display italic text-[19px] tracking-[0.5px] -mb-1"
            style={{ color: "#E8A020" }}
          >
            explore
          </span>
          <span className="font-display text-[30px] tracking-[-0.5px]" style={{ color: c.text }}>
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
                style={{ color: c.text80 }}
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
        <div className="flex items-center justify-end gap-2 lg:justify-self-end xl:ml-6 xl:pl-6 xl:border-l" style={{ borderColor: c.border20 }}>
          {session?.user ? (
            <div className="hidden items-center xl:flex">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-[13px] font-medium outline-none transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring"
                  style={{ border: `1px solid ${c.border20}`, color: c.text80 }}
                >
                  {session.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Google avatar host not in next.config remotePatterns
                    <img
                      src={session.user.image}
                      alt={session.user.name ?? "Account"}
                      referrerPolicy="no-referrer"
                      className="size-7 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      className="flex size-7 items-center justify-center rounded-full text-[12px] font-semibold uppercase"
                      style={{ background: "#E8A020", color: "#1a1a1a" }}
                    >
                      {session.user.name?.[0] ?? <User className="size-3.5" />}
                    </span>
                  )}
                  {session.user.name?.split(" ")[0] ?? "Account"}
                  <ChevronDown className="size-3.5 opacity-60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className="w-64 overflow-hidden p-0"
                >
                  {/* Identity header — mirrors the profile page's passport motif */}
                  <div className="relative overflow-hidden px-3.5 pb-3.5 pt-4">
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 opacity-80"
                      style={{
                        background:
                          "radial-gradient(120% 130% at 0% 0%, color-mix(in oklch, var(--color-wine) 24%, transparent), transparent 58%), radial-gradient(110% 130% at 100% 100%, color-mix(in oklch, var(--color-gold) 18%, transparent), transparent 58%)",
                      }}
                    />
                    <div className="relative flex items-center gap-3">
                      {session.user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- Google avatar host not in next.config remotePatterns
                        <img
                          src={session.user.image}
                          alt={session.user.name ?? "Account"}
                          referrerPolicy="no-referrer"
                          className="size-11 shrink-0 rounded-xl object-cover ring-1 ring-white/15"
                        />
                      ) : (
                        <span
                          className="flex size-11 shrink-0 items-center justify-center rounded-xl font-display text-lg uppercase"
                          style={{ background: "#B5271D", color: "#fff" }}
                        >
                          {session.user.name?.[0] ?? <User className="size-4" />}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-display text-base leading-tight tracking-[-0.2px]">
                          {session.user.name}
                        </p>
                        {session.user.email && (
                          <p className="truncate text-xs text-muted-foreground">
                            {session.user.email}
                          </p>
                        )}
                      </div>
                    </div>
                    {roleStamp && (
                      <span
                        className="relative mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider"
                        style={roleStamp.style}
                      >
                        <Shield className="size-3" />
                        {roleStamp.label}
                      </span>
                    )}
                  </div>

                  <div className="px-1 pb-1">
                    <DropdownMenuLabel className="px-1.5 pt-1.5 text-[0.65rem] uppercase tracking-[0.16em]">
                      Account
                    </DropdownMenuLabel>
                    <DropdownMenuItem render={<Link href="/trips" />} className={menuItemClass}>
                      <MapPinned className="size-4" /> My Trips
                    </DropdownMenuItem>
                    <DropdownMenuItem render={<Link href="/reservations" />} className={menuItemClass}>
                      <CalendarDays className="size-4" /> Reservations
                    </DropdownMenuItem>
                    <DropdownMenuItem render={<Link href="/profile" />} className={menuItemClass}>
                      <User className="size-4" /> Profile
                    </DropdownMenuItem>

                    {(["business", "admin", "superadmin"] as string[]).includes(
                      (session.user as { role?: string }).role ?? ""
                    ) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="px-1.5 text-[0.65rem] uppercase tracking-[0.16em]">
                          Manage
                        </DropdownMenuLabel>
                      </>
                    )}

                    {(session.user as { role?: string }).role === "business" && (
                      <DropdownMenuItem render={<Link href="/business" />} className={menuItemClass}>
                        <LayoutDashboard className="size-4" /> {tNav("myBusiness")}
                      </DropdownMenuItem>
                    )}
                    {(["admin", "superadmin"] as string[]).includes(
                      (session.user as { role?: string }).role ?? ""
                    ) && (
                      <DropdownMenuItem render={<Link href="/admin" />} className={menuItemClass}>
                        <Shield className="size-4" /> {tNav("admin")}
                      </DropdownMenuItem>
                    )}
                    {(session.user as { role?: string }).role === "superadmin" && (
                      <DropdownMenuItem render={<Link href="/superadmin" />} className={menuItemClass}>
                        <Shield className="size-4" /> {tNav("superadmin")}
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="py-2"
                    >
                      <LogOut className="size-4" /> {tNav("logout")}
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Link
              href="/login"
              aria-label={tNav("login")}
              title={tNav("login")}
              className="hidden size-9 items-center justify-center rounded-full transition-all hover:-translate-y-0.5 xl:flex"
              style={{ border: `1px solid ${c.border20}`, color: c.text80 }}
            >
              <User className="size-4" />
            </Link>
          )}

          <ThemeToggle overHero={overHero} />
          <LanguageSwitcher overHero={overHero} />

          {/* Mobile hamburger */}
          <button
            className="flex size-9 items-center justify-center rounded-full transition-colors xl:hidden"
            style={{ background: c.surface08, color: c.text80 }}
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
