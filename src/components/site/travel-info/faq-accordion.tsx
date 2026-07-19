"use client";

import { useTranslations } from "next-intl";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { SectionShell } from "./section-shell";

type Faq = { q: string; a: string };

export function FaqAccordion() {
  const t = useTranslations("travelInfoPage.faq");
  const items = (t.raw("items") ?? []) as Faq[];

  return (
    <SectionShell id="faq" heading={t("heading")} sub={t("sub")}>
      <div
        className="mx-auto max-w-3xl rounded-2xl border px-6 md:px-8"
        style={{
          background: "var(--site-surface-08)",
          borderColor: "var(--site-border-08)",
        }}
      >
        <Accordion>
          {items.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="py-5 text-base [&[data-slot=accordion-trigger]]:text-[color:var(--site-text)]">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent>
                <p
                  className="text-[15px] leading-relaxed"
                  style={{ color: "var(--site-text-65)" }}
                >
                  {faq.a}
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </SectionShell>
  );
}
