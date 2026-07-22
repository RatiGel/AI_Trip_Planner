"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { FlagIcon } from "./flag-icon";

const LABELS: Record<Locale, { name: string; code: string }> = {
  en: { name: "English", code: "EN" },
  ka: { name: "ქართული", code: "KA" },
  ru: { name: "Русский", code: "RU" },
};

export function LanguageSwitcher({ overHero = false }: { overHero?: boolean }) {
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
      <DropdownMenuTrigger
        disabled={pending}
        aria-label={t("language")}
        className="flex h-9 items-center gap-1.5 rounded-full pl-1 pr-2.5 text-[13px] font-semibold tracking-wide outline-none transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        style={{
          border: `1px solid ${overHero ? "rgba(255,255,255,0.28)" : "var(--site-border-20)"}`,
          color: overHero ? "rgba(255,255,255,0.9)" : "var(--site-text-80)",
          background: overHero ? "rgba(255,255,255,0.08)" : "transparent",
        }}
      >
        <span className="flex size-7 items-center justify-center overflow-hidden rounded-full ring-1 ring-black/10">
          <FlagIcon locale={locale} size={28} />
        </span>
        {LABELS[locale].code}
        <ChevronDown className="size-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44 p-1.5">
        {routing.locales.map((l) => {
          const active = l === locale;
          return (
            <DropdownMenuItem
              key={l}
              onClick={() => switchTo(l)}
              className="flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-[14px]"
              data-active={active || undefined}
            >
              <span className="flex size-8 items-center justify-center overflow-hidden rounded-full ring-1 ring-black/10">
                <FlagIcon locale={l} size={32} />
              </span>
              <span className={active ? "font-semibold" : "font-medium"}>{LABELS[l].name}</span>
              {active && <Check className="ml-auto size-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
