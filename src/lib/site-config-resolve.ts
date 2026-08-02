import {
  DEFAULT_FOOTER,
  DEFAULT_HEADER,
  DEFAULT_PAGES,
  NEUTRAL_PAGE,
} from "./site-config-defaults";

export type NavLink = { label: string; href: string };
export type FooterColumn = { heading: string; links: NavLink[] };
export type SocialLink = { platform: string; url: string };

export type ResolvedHeader = {
  logoText: string;
  logoImageUrl: string;
  navLinks: NavLink[];
};
export type ResolvedFooter = {
  copyrightText: string;
  columns: FooterColumn[];
  socialLinks: SocialLink[];
};
export type ResolvedPage = {
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  showCategories: boolean;
  showFeaturedPlaces: boolean;
};

function obj(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

/** A non-empty trimmed string, or the fallback. */
function str(raw: unknown, fallback: string): string {
  return typeof raw === "string" && raw.trim() !== "" ? raw : fallback;
}

function bool(raw: unknown, fallback: boolean): boolean {
  return typeof raw === "boolean" ? raw : fallback;
}

function navLinks(raw: unknown): NavLink[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    const e = obj(entry);
    const label = typeof e.label === "string" ? e.label.trim() : "";
    const href = typeof e.href === "string" ? e.href.trim() : "";
    return label && href ? [{ label, href }] : [];
  });
}

/** Falls back whenever the cleaned list is empty — never blanks a region. */
function listOrDefault<T>(cleaned: T[], fallback: T[]): T[] {
  return cleaned.length > 0 ? cleaned : fallback;
}

/**
 * Values the SiteConfig schema used to write as defaults on document creation.
 * Nobody chose them, and they do not match what the site actually renders — so
 * treating them as configured content silently downgraded the live branding
 * (the footer read "© 2025 TbilisiTrip" instead of the real word mark and the
 * current year). The schema no longer writes them, but documents created before
 * that fix still carry them, so they are ignored here too.
 *
 * TEMPORARY SCAFFOLDING — not permanent product behavior. It exists only to
 * paper over documents written before the schema fix, pending the one-time
 * migration in `scripts/fix-stale-site-config-defaults.ts`. Delete this set
 * and `configuredStr` (reverting to plain `str`) once no live document
 * contains these values.
 *
 * Known false positive while this shim is active: an admin who deliberately
 * sets logoText or copyrightText to exactly one of these strings has that
 * input silently discarded and sees the default instead. Narrow, but real.
 */
const STALE_SCHEMA_DEFAULTS = new Set(["TbilisiTrip", "© 2025 TbilisiTrip"]);

/** Like `str`, but also treats a retired schema default as "not configured". */
function configuredStr(raw: unknown, fallback: string): string {
  const value = str(raw, fallback);
  return STALE_SCHEMA_DEFAULTS.has(value) ? fallback : value;
}

export function resolveHeader(raw: unknown): ResolvedHeader {
  const h = obj(raw);
  return {
    logoText: configuredStr(h.logoText, DEFAULT_HEADER.logoText),
    logoImageUrl: str(h.logoImageUrl, DEFAULT_HEADER.logoImageUrl),
    navLinks: listOrDefault(navLinks(h.navLinks), DEFAULT_HEADER.navLinks),
  };
}

export function resolveFooter(raw: unknown): ResolvedFooter {
  const f = obj(raw);

  const columns: FooterColumn[] = Array.isArray(f.columns)
    ? f.columns.flatMap((entry) => {
        const c = obj(entry);
        const heading = typeof c.heading === "string" ? c.heading.trim() : "";
        const links = navLinks(c.links);
        return heading && links.length > 0 ? [{ heading, links }] : [];
      })
    : [];

  const socialLinks: SocialLink[] = Array.isArray(f.socialLinks)
    ? f.socialLinks.flatMap((entry) => {
        const s = obj(entry);
        const platform = typeof s.platform === "string" ? s.platform.trim() : "";
        const url = typeof s.url === "string" ? s.url.trim() : "";
        return platform ? [{ platform, url }] : [];
      })
    : [];

  return {
    copyrightText: configuredStr(f.copyrightText, DEFAULT_FOOTER.copyrightText),
    columns: listOrDefault(columns, DEFAULT_FOOTER.columns),
    socialLinks: listOrDefault(socialLinks, DEFAULT_FOOTER.socialLinks),
  };
}

export function resolvePage(raw: unknown, key: string): ResolvedPage {
  // Look up only DEFAULT_PAGES' own keys — a plain object literal inherits
  // from Object.prototype, so an admin-typed CMS key like "__proto__",
  // "constructor", or "toString" must never resolve to an inherited member.
  const base = Object.prototype.hasOwnProperty.call(DEFAULT_PAGES, key)
    ? DEFAULT_PAGES[key]
    : NEUTRAL_PAGE;
  const p = obj(raw);
  return {
    heroTitle: str(p.heroTitle, base.heroTitle),
    heroSubtitle: str(p.heroSubtitle, base.heroSubtitle),
    heroImageUrl: str(p.heroImageUrl, base.heroImageUrl),
    showCategories: bool(p.showCategories, base.showCategories),
    showFeaturedPlaces: bool(p.showFeaturedPlaces, base.showFeaturedPlaces),
  };
}
