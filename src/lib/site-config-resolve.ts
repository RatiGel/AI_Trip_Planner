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

export function resolveHeader(raw: unknown): ResolvedHeader {
  const h = obj(raw);
  return {
    logoText: str(h.logoText, DEFAULT_HEADER.logoText),
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
    copyrightText: str(f.copyrightText, DEFAULT_FOOTER.copyrightText),
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
