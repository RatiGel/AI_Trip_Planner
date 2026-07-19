"use client";

import { useTranslations } from "next-intl";
import { Plane, TrainFront, Car, Footprints, CreditCard } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SectionShell } from "./section-shell";

const TABS = [
  { key: "airport", icon: Plane },
  { key: "transit", icon: TrainFront },
  { key: "taxi", icon: Car },
  { key: "walking", icon: Footprints },
  { key: "card", icon: CreditCard },
] as const;

export function GettingAround() {
  const t = useTranslations("travelInfoPage.gettingAround");

  return (
    <SectionShell id="getting-around" heading={t("heading")} sub={t("sub")} alt>
      <Tabs defaultValue="airport" className="gap-6">
        <TabsList
          variant="line"
          className="h-auto flex-wrap gap-2 border-b pb-0"
          style={{ borderColor: "var(--site-border-08)" }}
        >
          {TABS.map(({ key, icon: TabIcon }) => (
            <TabsTrigger
              key={key}
              value={key}
              className="gap-2 pb-3 text-[14px] data-active:text-[color:#F5C842]"
            >
              <TabIcon className="size-4" />
              {t(`tabs.${key}`)}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map(({ key }) => {
          const points = (t.raw(`${key}.points`) ?? []) as string[];
          return (
            <TabsContent key={key} value={key} className="pt-2">
              <div
                className="rounded-2xl border p-6 md:p-8"
                style={{
                  background: "var(--site-surface-08)",
                  borderColor: "var(--site-border-08)",
                }}
              >
                <h3
                  className="mb-5 text-xl font-semibold"
                  style={{ color: "var(--site-text)" }}
                >
                  {t(`${key}.title`)}
                </h3>
                <ul className="space-y-3.5">
                  {points.map((point, i) => (
                    <li key={i} className="flex gap-3">
                      <span
                        className="mt-2 size-1.5 shrink-0 rounded-full"
                        style={{ background: "#E8A020" }}
                      />
                      <span
                        className="text-[15px] leading-relaxed"
                        style={{ color: "var(--site-text-65)" }}
                      >
                        {point}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </SectionShell>
  );
}
