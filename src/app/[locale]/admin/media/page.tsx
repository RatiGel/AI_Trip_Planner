import { setRequestLocale } from "next-intl/server";
import { ImagePlus } from "lucide-react";

export default async function AdminMediaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Media</h1>
        <p className="text-sm text-muted-foreground">Uploaded files across the platform</p>
      </div>
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border text-muted-foreground">
        <ImagePlus className="size-10" />
        <p className="text-sm">Media management coming soon</p>
        <p className="text-xs">Requires Cloudinary integration (Phase 4)</p>
      </div>
    </div>
  );
}
