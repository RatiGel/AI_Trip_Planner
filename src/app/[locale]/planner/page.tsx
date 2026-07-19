import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { PlannerView } from "@/components/planner/planner-view";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "planner" });
  return buildMetadata({
    locale,
    path: "/planner",
    title: t("title"),
    description:
      "Build a personalized Tbilisi itinerary in minutes with our free AI trip planner. Tell it your travel style and get a day-by-day plan.",
  });
}

export default async function PlannerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PlannerView />;
}
