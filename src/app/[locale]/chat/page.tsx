import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ChatUI } from "@/components/chat/chat-ui";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "chat" });
  return buildMetadata({
    locale,
    path: "/chat",
    title: t("title"),
    description:
      "Chat with our free AI trip planner to build a day-by-day Tbilisi itinerary. Get personalized attraction, food, and route suggestions in seconds.",
  });
}

export default async function ChatPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ChatUI />;
}
