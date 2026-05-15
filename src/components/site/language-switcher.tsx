"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

const LABELS: Record<Locale, string> = { en: "English", ka: "ქართული" };

export function LanguageSwitcher() {
  const t = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale() as Locale;
  const [pending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={pending} aria-label={t("language")}>
          <Globe className="size-4" />
          <span className="ml-2 hidden sm:inline">{LABELS[locale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-32">
        {routing.locales.map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => switchTo(l)}
            className={l === locale ? "font-medium" : ""}
          >
            {LABELS[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
