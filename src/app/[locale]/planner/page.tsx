import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { PlannerView } from "@/components/planner/planner-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "planner" });
  return { title: t("title") };
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
