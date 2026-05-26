"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown, Sparkles, LogOut, User } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";

const NAV = [
  {
    label: "Discover",
    href: "/discover",
    children: [
      { label: "Sightseeing", href: "/discover?category=sight" },
      { label: "Museums", href: "/discover?category=museum" },
      { label: "Neighborhoods", href: "/discover" },
      { label: "Parks & Nature", href: "/discover?category=nature" },
    ],
  },
  {
    label: "Experiences",
    href: "/experiences",
    children: [
      { label: "Tours & Guides", href: "/experiences?type=tour" },
      { label: "Day Trips", href: "/experiences?type=daytrip" },
      { label: "Wellness & Spas", href: "/experiences?type=wellness" },
      { label: "Outdoor Activities", href: "/experiences?type=outdoor" },
    ],
  },
  {
    label: "Food & Drinks",
    href: "/food",
    children: [
      { label: "Restaurants", href: "/food?type=restaurant" },
      { label: "Cafes", href: "/food?type=cafe" },
      { label: "Wine Bars", href: "/food?type=wine" },
      { label: "Nightlife", href: "/food?type=nightlife" },
    ],
  },
  {
    label: "Events",
    href: "/events",
    children: [
      { label: "Upcoming Events", href: "/events" },
      { label: "Festivals", href: "/events?type=festival" },
      { label: "Arts & Culture", href: "/events?type=arts" },
      { label: "Music & Concerts", href: "/events?type=music" },
    ],
  },
  { label: "Travel Info", href: "/travel-info", children: [] },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

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
          ? "rgba(10,10,10,0.92)"
          : isHome
          ? "linear-gradient(to bottom, rgba(0,0,0,0.65), transparent)"
          : "rgba(10,10,10,0.92)",
        backdropFilter: scrolled || !isHome ? "blur(20px)" : "none",
        borderBottom: scrolled || !isHome ? "1px solid rgba(255,255,255,0.06)" : "none",
      }}
    >
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6 md:px-12">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1">
          <span className="font-display text-[22px] tracking-[-0.5px] text-white">
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
                className="flex items-center gap-1 rounded-md px-3 py-2 text-[14px] font-medium text-white/80 transition-colors hover:text-white"
              >
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
                    style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-4 py-2.5 text-[13px] text-white/65 transition-colors hover:bg-white/5 hover:text-white"
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
            href="/chat"
            className="hidden items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5 sm:flex"
            style={{ background: "#B5271D", boxShadow: "0 4px 16px rgba(181,39,29,0.4)" }}
          >
            <Sparkles className="size-3.5" />
            Plan My Trip
          </Link>

          {session?.user ? (
            <div className="hidden items-center gap-2 md:flex">
              <span className="flex items-center gap-1.5 text-[13px] text-white/50">
                <User className="size-3.5" />
                {session.user.name ?? session.user.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-md px-3 py-1.5 text-[13px] text-white/50 transition-colors hover:text-white"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-md px-3 py-1.5 text-[13px] text-white/50 transition-colors hover:text-white md:block"
            >
              Sign in
            </Link>
          )}

          <LanguageSwitcher />

          {/* Mobile hamburger */}
          <button
            className="flex size-9 items-center justify-center rounded-full text-white/70 transition-colors hover:text-white md:hidden"
            style={{ background: "rgba(255,255,255,0.08)" }}
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
            style={{ background: "rgba(10,10,10,0.97)", borderColor: "rgba(255,255,255,0.06)" }}
          >
            <nav className="flex flex-col gap-0.5 px-4 py-4">
              {NAV.map((item) => (
                <div key={item.label}>
                  <Link
                    href={item.href}
                    className="block rounded-xl px-4 py-3 text-[15px] font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                </div>
              ))}
              <div className="my-2 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
              {session?.user ? (
                <button
                  onClick={() => { signOut({ callbackUrl: "/" }); setMobileOpen(false); }}
                  className="rounded-xl px-4 py-3 text-left text-[15px] text-white/50 hover:bg-white/5"
                >
                  Sign out
                </button>
              ) : (
                <Link href="/login" className="block rounded-xl px-4 py-3 text-[15px] text-white/50 hover:bg-white/5" onClick={() => setMobileOpen(false)}>
                  Sign in
                </Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
