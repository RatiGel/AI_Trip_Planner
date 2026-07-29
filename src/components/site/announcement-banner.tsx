"use client";

import { useTranslations } from "next-intl";

/**
 * Thin announcement strip that sits above the header on the home page only.
 * Rendered inside SiteHeader so both share the same fixed stack — the header
 * hides it once the page scrolls, collapsing back to its 72px bar.
 *
 * Fixed white/red regardless of theme: it reads as a paper strip above the
 * dark hero, so it does not follow the light/dark tokens.
 */
export function AnnouncementBanner() {
  const t = useTranslations("banner");

  return (
    <div className="bg-white">
      <p
        className="mx-auto flex min-h-9 max-w-7xl items-center justify-center text-balance px-4 py-2 text-center text-[12px] font-medium leading-snug tracking-[0.02em] sm:px-6 sm:text-[13px] md:px-12 md:text-[13.5px]"
        style={{ color: "#B5271D" }}
      >
        {t("subline")}
      </p>
    </div>
  );
}
