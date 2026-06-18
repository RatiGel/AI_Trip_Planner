import { setRequestLocale } from "next-intl/server";
import { getSiteConfig } from "@/lib/get-site-config";
import { CmsEditor } from "@/components/admin/cms-editor";

type PageConfig = {
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  showCategories: boolean;
  showFeaturedPlaces: boolean;
  componentOrder: string[];
};

export default async function CmsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const config = await getSiteConfig();

  const initial = {
    header: config?.header ?? {
      logoText: "TbilisiTrip",
      logoImageUrl: "",
      navLinks: [],
    },
    footer: config?.footer ?? {
      copyrightText: "© 2025 TbilisiTrip",
      columns: [],
      socialLinks: [],
    },
    pages: (config?.pages as Record<string, PageConfig> | undefined) ?? {},
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">CMS</h1>
        <p className="text-muted-foreground">
          Edit header, footer, and per-page hero content.
        </p>
      </div>
      <CmsEditor initial={initial} />
    </div>
  );
}
