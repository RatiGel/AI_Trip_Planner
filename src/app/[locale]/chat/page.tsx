import { setRequestLocale } from "next-intl/server";
import { ChatUI } from "@/components/chat/chat-ui";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ChatUI />;
}
