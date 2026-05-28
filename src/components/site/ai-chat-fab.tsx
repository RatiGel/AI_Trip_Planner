"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function AiChatFab() {
  const t = useTranslations("common");
  return (
    <Link
      href="/chat"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full px-5 py-3 text-[14px] font-semibold text-white shadow-2xl transition-all hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(181,39,29,0.5)]"
      style={{ background: "#B5271D", boxShadow: "0 4px 24px rgba(181,39,29,0.45)" }}
    >
      <Sparkles className="size-4" />
      {t("aiChat")}
    </Link>
  );
}
