import { setRequestLocale } from "next-intl/server";
import { ImagePlus } from "lucide-react";

export default async function BusinessMediaPage({
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
        <p className="text-sm text-muted-foreground">Photos and videos for your listings</p>
      </div>
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border text-muted-foreground">
        <ImagePlus className="size-10" />
        <p className="text-sm">Media uploads coming soon</p>
      </div>
    </div>
  );
}
