import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { TicketsSearch } from "@/components/site/tickets-search";

export default async function TicketsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TicketsContent />;
}

function TicketsContent() {
  const t = useTranslations("tickets");
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <TicketsSearch />
    </div>
  );
}
