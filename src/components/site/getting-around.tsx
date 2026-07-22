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
      <TabsList className="mb-2 h-auto gap-2 bg-transparent p-0">
        <TabsTrigger
          value="city"
          className="flex-none rounded-full border-transparent px-5 py-2.5 text-[17px] font-bold tracking-tight text-muted-foreground/60 transition-all hover:text-foreground data-active:bg-primary data-active:text-primary-foreground data-active:shadow-md dark:data-active:bg-primary dark:data-active:text-primary-foreground"
        >
          {t("cityTab")}
        </TabsTrigger>
        <TabsTrigger
          value="from"
          className="flex-none rounded-full border-transparent px-5 py-2.5 text-[17px] font-bold tracking-tight text-muted-foreground/60 transition-all hover:text-foreground data-active:bg-primary data-active:text-primary-foreground data-active:shadow-md dark:data-active:bg-primary dark:data-active:text-primary-foreground"
        >
          {t("fromTab")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="city">
        <RoutePlanner />
      </TabsContent>

      <TabsContent value="from">
        <p className="mb-8 text-[14px]" style={{ color: "var(--site-text-50)" }}>{t("fromSubtitle")}</p>
        <TicketsSearch tickets={intercity} />
      </TabsContent>
    </Tabs>
  );
}
