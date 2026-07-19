"use client";

import { useTranslations } from "next-intl";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

type Faq = { q: string; a: string };

export function FaqBlock({ namespace }: { namespace: string }) {
  const t = useTranslations(namespace);
  const items = (t.raw("items") ?? []) as Faq[];

  return (
    <section className="px-6 py-16 md:px-12 md:py-20">
      <div className="mx-auto max-w-3xl">
        <h2
          className="font-display mb-3 text-center leading-tight"
          style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-1px" }}
        >
          {t("heading")}
        </h2>
        <p className="mb-10 text-center text-base leading-relaxed opacity-60">
          {t("sub")}
        </p>
        <div className="rounded-2xl border px-6 md:px-8" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <Accordion>
            {items.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="py-5 text-base">{faq.q}</AccordionTrigger>
                <AccordionContent>
                  <p className="text-[15px] leading-relaxed opacity-70">{faq.a}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
