import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { TicketsSearch } from "@/components/site/tickets-search";
import { connectDB } from "@/lib/db";
import { TicketModel } from "@/lib/models/ticket";
import type { TicketOption } from "@/types";

export default async function TicketsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await connectDB();
  const tickets = (await TicketModel.find().lean()) as unknown as TicketOption[];
  return <TicketsContent tickets={tickets} />;
}

function TicketsContent({ tickets }: { tickets: TicketOption[] }) {
  const t = useTranslations("tickets");
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <TicketsSearch tickets={tickets} />
    </div>
  );
}
