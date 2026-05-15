import { setRequestLocale } from "next-intl/server";
import { MapPlaceholder } from "@/components/map/map-placeholder";

export default async function MapPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <MapPlaceholder />;
}
