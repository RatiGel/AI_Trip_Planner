"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TicketsSearch } from "@/components/site/tickets-search";
import { RoutePlanner } from "@/components/transit/route-planner";
import type { TicketOption } from "@/types";

export function GettingAround({ tickets }: { tickets: TicketOption[] }) {
  const t = useTranslations("gettingAround");
  const intercity = tickets.filter((x) => x.type === "bus" || x.type === "rail");

  return (
    <Tabs defaultValue="city" className="w-full">
      <TabsList>
        <TabsTrigger value="city">{t("cityTab")}</TabsTrigger>
        <TabsTrigger value="from">{t("fromTab")}</TabsTrigger>
      </TabsList>

      <TabsContent value="city">
        <p className="mb-8 text-[14px]" style={{ color: "var(--site-text-50)" }}>{t("citySubtitle")}</p>
        <RoutePlanner />
      </TabsContent>

      <TabsContent value="from">
        <p className="mb-8 text-[14px]" style={{ color: "var(--site-text-50)" }}>{t("fromSubtitle")}</p>
        <TicketsSearch tickets={intercity} />
      </TabsContent>
    </Tabs>
  );
}
