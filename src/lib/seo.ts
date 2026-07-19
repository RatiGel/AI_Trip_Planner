import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

const SITE_URL = "https://exploretbilisi.online";

function localizedPath(locale: string, path: string) {
  const clean = path === "/" ? "" : path;
  return `${SITE_URL}/${locale}${clean}`;
}

export function buildMetadata({
  locale,
  path,
  title,
  description,
  image,
}: {
  locale: string;
  path: string;
  title: string;
  description: string;
  image?: string;
}): Metadata {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = localizedPath(l, path);
  }

  return {
    title,
    description,
    alternates: {
      canonical: localizedPath(locale, path),
      languages,
    },
    openGraph: {
      title,
      description,
      url: localizedPath(locale, path),
      siteName: "ExploreTbilisi",
      locale,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export { SITE_URL };
