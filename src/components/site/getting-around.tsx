"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TicketsSearch } from "@/components/site/tickets-search";
import { RoutePlanner } from "@/components/transit/route-planner";
import type { TicketOption } from "@/types";

export function GettingAround({ tickets }: { tickets: TicketOption[] }) {
  const t = useTranslations("gettingAround");
  const intercity = tickets.filter((x) => x.type === "bus" || x.type === "rail");
  const passes = tickets.filter((x) => x.type === "transit-pass");

  return (
    <Tabs defaultValue="city" className="w-full">
      <TabsList>
        <TabsTrigger value="city">{t("cityTab")}</TabsTrigger>
        <TabsTrigger value="from">{t("fromTab")}</TabsTrigger>
      </TabsList>

      <TabsContent value="city">
        <p className="mb-8 text-[14px]" style={{ color: "var(--site-text-50)" }}>{t("citySubtitle")}</p>
        <div className="grid gap-12 lg:grid-cols-2">
          <RoutePlanner />
          <div>
            <h2 className="text-2xl font-bold" style={{ color: "var(--site-text)" }}>{t("passes")}</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <TicketsSearch tickets={passes} />
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="from">
        <p className="mb-8 text-[14px]" style={{ color: "var(--site-text-50)" }}>{t("fromSubtitle")}</p>
        <TicketsSearch tickets={intercity} />
      </TabsContent>
    </Tabs>
  );
}
