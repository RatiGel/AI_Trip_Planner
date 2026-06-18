import { setRequestLocale } from "next-intl/server";
import { getAdminConfig } from "@/lib/get-admin-config";
import { ThemeEditor } from "@/components/admin/theme-editor";

export default async function ThemePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const config = await getAdminConfig();
  const initial = {
    colors: config?.colors ?? {
      primary: "#3b82f6",
      secondary: "#6366f1",
      background: "#ffffff",
      accent: "#f1f5f9",
      wine: "#B5271D",
      gold: "#E8A020",
    },
    typography: config?.typography ?? {
      fontFamily: "Inter",
      baseFontSizePx: 16,
      headingScale: 1.25,
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Theme Configurator
        </h1>
        <p className="text-muted-foreground">
          Edit global design tokens. Changes apply site-wide on next page load.
        </p>
      </div>
      <ThemeEditor initial={initial} />
    </div>
  );
}
