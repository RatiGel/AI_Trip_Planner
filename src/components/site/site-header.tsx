"use client";

import { useTranslations } from "next-intl";
import { Menu, MapPin, Sparkles } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LanguageSwitcher } from "./language-switcher";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/cities", labelKey: "cities" as const },
  { href: "/map", labelKey: "map" as const },
  { href: "/chat", labelKey: "chat" as const },
  { href: "/tickets", labelKey: "tickets" as const },
  { href: "/trips", labelKey: "trips" as const },
];

export function SiteHeader() {
  const t = useTranslations("nav");
  const tSite = useTranslations("site");
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <MapPin className="size-4" />
            </span>
            <span>{tSite("name")}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((n) => {
              const active = pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                >
                  {t(n.labelKey)}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/chat">
              <Sparkles className="size-4" />
              {t("chat")}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <Link href="/login">{t("login")}</Link>
          </Button>
          <LanguageSwitcher />

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>{tSite("name")}</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4 pt-2">
                {NAV.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                  >
                    {t(n.labelKey)}
                  </Link>
                ))}
                <Link
                  href="/admin"
                  className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                >
                  {t("admin")}
                </Link>
                <div className="h-px bg-border my-2" />
                <Link
                  href="/login"
                  className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                >
                  {t("login")}
                </Link>
                <Link
                  href="/register"
                  className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                >
                  {t("register")}
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
