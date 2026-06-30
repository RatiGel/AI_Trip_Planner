import { setRequestLocale } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";
import { getHomeLayout } from "@/lib/home-layout";
import { HOME_SECTION_KEYS } from "@/lib/models/site-config";
import { LandingEditor, type PlaceOption } from "@/components/admin/landing-editor";

export default async function AdminLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await connectDB();
  const [layout, placeDocs] = await Promise.all([
    getHomeLayout(),
    PlaceModel.find({ status: "active" })
      .select("_id name citySlug")
      .sort({ name: 1 })
      .limit(200)
      .lean(),
  ]);

  const places: PlaceOption[] = placeDocs.map((p) => ({
    id: String(p._id),
    name: String(p.name ?? ""),
    citySlug: String(p.citySlug ?? ""),
  }));

  // Featured ids may be DB ids the editor needs even though getHomeLayout maps
  // them to Place objects; pull the raw configured ids back out.
  const featuredIds = layout.featured
    .map((f) => f.id)
    .filter((id) => /^[a-fA-F0-9]{24}$/.test(id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Landing page</h1>
        <p className="text-muted-foreground">
          Reorder or hide homepage sections, override the hero, and choose featured places.
        </p>
      </div>
      <LandingEditor
        allKeys={[...HOME_SECTION_KEYS]}
        initialOrder={layout.order}
        initialHero={layout.hero}
        initialFeaturedIds={featuredIds}
        places={places}
      />
    </div>
  );
}
