import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/business",
        "/superadmin",
        "/api",
        "/login",
        "/register",
        "/profile",
        "/reservations",
        "/reserve",
        "/trips",
        "/tickets",
        "/payment",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
