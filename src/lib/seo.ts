import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

const SITE_URL = "https://www.exploretbilisi.online";

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
    title: { absolute: `${title} · ExploreTbilisi` },
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
      // When no explicit image, omit the key so the generated
      // opengraph-image.tsx file convention supplies the default card.
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export { SITE_URL };
