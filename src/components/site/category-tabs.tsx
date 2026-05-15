"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PlaceCard } from "./place-card";
import type { CategorySlug, Place } from "@/types";

const ORDER: CategorySlug[] = [
  "sight",
  "museum",
  "cafe",
  "restaurant",
  "club",
  "park",
  "wine",
  "shop",
];

export function CategoryTabs({ places }: { places: Place[] }) {
  const t = useTranslations("categories");
  const tCity = useTranslations("city");
  const [tab, setTab] = useState<string>("all");

  const present = useMemo(() => {
    const set = new Set<CategorySlug>();
    places.forEach((p) => p.categories.forEach((c) => set.add(c)));
    return ORDER.filter((c) => set.has(c));
  }, [places]);

  const filtered = useMemo(
    () => (tab === "all" ? places : places.filter((p) => p.categories.includes(tab as CategorySlug))),
    [tab, places],
  );

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="flex w-full flex-wrap gap-1 bg-transparent p-0">
        <TabsTrigger value="all" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          {tCity("all")}
        </TabsTrigger>
        {present.map((c) => (
          <TabsTrigger
            key={c}
            value={c}
            className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            {t(c)}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={tab} className="mt-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <PlaceCard key={p.id} place={p} />
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
