import type { ResolvedFooter, ResolvedHeader, ResolvedPage } from "./site-config-resolve";

/**
 * navLinks is intentionally empty: SiteHeader builds its nav from next-intl
 * translations. An empty list means "keep the translated nav" — see
 * SiteHeader's usesCmsNav check.
 */
export const DEFAULT_HEADER: ResolvedHeader = {
  logoText: "Tbilisi",
  logoImageUrl: "",
  navLinks: [],
};

export const DEFAULT_FOOTER: ResolvedFooter = {
  copyrightText: "",
  columns: [
    {
      heading: "Discover",
      links: [
        { label: "Sightseeing", href: "/discover?category=sight" },
        { label: "Museums", href: "/discover?category=museum" },
        { label: "Neighborhoods", href: "/discover" },
        { label: "Parks & Nature", href: "/discover?category=nature" },
      ],
    },
    {
      heading: "Experiences",
      links: [
        { label: "Tours & Guides", href: "/experiences" },
        { label: "Day Trips", href: "/experiences?type=daytrip" },
        { label: "Wellness", href: "/experiences?type=wellness" },
        { label: "Outdoor", href: "/experiences?type=outdoor" },
      ],
    },
    {
      heading: "Food & Drinks",
      links: [
        { label: "Restaurants", href: "/food?type=restaurant" },
        { label: "Cafes", href: "/food?type=cafe" },
        { label: "Wine Bars", href: "/food?type=wine" },
        { label: "Nightlife", href: "/food?type=nightlife" },
      ],
    },
    {
      heading: "Travel Info",
      links: [
        { label: "Getting Here", href: "/travel-info" },
        { label: "Getting Around", href: "/travel-info#transport" },
        { label: "City Card", href: "/tickets" },
        { label: "Accommodation", href: "/hotels" },
      ],
    },
    {
      heading: "For Business",
      links: [
        { label: "List your business", href: "/list-your-business" },
        { label: "Business dashboard", href: "/business" },
      ],
    },
  ],
  socialLinks: [
    { platform: "Instagram", url: "" },
    { platform: "TikTok", url: "" },
    { platform: "YouTube", url: "" },
  ],
};

export const DEFAULT_PAGES: Record<string, ResolvedPage> = {
  home: {
    heroTitle: "",
    heroSubtitle: "",
    heroImageUrl:
      "https://images.unsplash.com/photo-1565008576549-57569a49371d?w=1920&q=70",
    showCategories: true,
    showFeaturedPlaces: true,
  },
};

/** Neutral shape for a page key with no baked-in defaults. */
export const NEUTRAL_PAGE: ResolvedPage = {
  heroTitle: "",
  heroSubtitle: "",
  heroImageUrl: "",
  showCategories: true,
  showFeaturedPlaces: true,
};
