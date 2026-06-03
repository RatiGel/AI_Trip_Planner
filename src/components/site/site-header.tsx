"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown, LogOut, User, Ticket, Route } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const t = useTranslations("header");
  const tNav = useTranslations("nav");

  const NAV: { label: string; href: string; icon?: React.ReactNode; children: { label: string; href: string }[] }[] = [
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
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6 md:px-12">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1">
          <span className="font-display text-[22px] tracking-[-0.5px]" style={{ color: "var(--site-text)" }}>
            Tbilisi<span style={{ color: "#E8A020" }}>.</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <div
              key={item.label}
              className="relative"
              onMouseEnter={() => item.children.length > 0 && setOpenMenu(item.label)}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <Link
                href={item.href}
                className="flex items-center gap-1.5 rounded-md px-3 py-2 text-[14px] font-medium transition-colors"
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
        <div className="flex items-center gap-2">
          <Link
            href="/planner"
            className="hidden items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition-all hover:-translate-y-0.5 sm:flex"
            style={{ border: "1px solid var(--site-border-20)", color: "var(--site-text-80)" }}
          >
            <Route className="size-3.5" />
            {tNav("planner")}
          </Link>

          <Link
            href="/tickets"
            className="hidden items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition-all hover:-translate-y-0.5 sm:flex"
            style={{ border: "1px solid var(--site-border-20)", color: "var(--site-text-80)" }}
          >
            <Ticket className="size-3.5" />
            {t("tickets")}
          </Link>


          {session?.user ? (
            <div className="hidden items-center gap-2 md:flex">
              {(session.user as { role?: string }).role === "business" && (
                <Link
                  href="/business"
                  className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition-all hover:-translate-y-0.5"
                  style={{ border: "1px solid var(--site-border-20)", color: "var(--site-text-80)" }}
                >
                  {tNav("myBusiness")}
                </Link>
              )}
              {(["admin", "superadmin"] as string[]).includes(
                (session.user as { role?: string }).role ?? ""
              ) && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition-all hover:-translate-y-0.5"
                  style={{ border: "1px solid var(--site-border-20)", color: "var(--site-text-80)" }}
                >
                  {tNav("admin")}
                </Link>
              )}
              {(session.user as { role?: string }).role === "superadmin" && (
                <Link
                  href="/superadmin"
                  className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition-all hover:-translate-y-0.5"
                  style={{ border: "1px solid var(--site-border-20)", color: "var(--site-text-80)" }}
                >
                  {tNav("superadmin")}
                </Link>
              )}
              <span className="flex items-center gap-1.5 text-[13px]" style={{ color: "var(--site-text-50)" }}>
                <User className="size-3.5" />
                {session.user.name ?? session.user.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-md px-3 py-1.5 text-[13px] transition-colors"
                style={{ color: "var(--site-text-50)" }}
              >
                <LogOut className="size-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-md px-3 py-1.5 text-[13px] transition-colors md:block"
              style={{ color: "var(--site-text-50)" }}
            >
              {tNav("login")}
            </Link>
          )}

          <ThemeToggle />
          <LanguageSwitcher />

          {/* Mobile hamburger */}
          <button
            className="flex size-9 items-center justify-center rounded-full transition-colors md:hidden"
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
            className="overflow-hidden border-t md:hidden"
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
