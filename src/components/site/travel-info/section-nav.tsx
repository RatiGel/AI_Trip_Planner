"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "first-time", key: "firstTime" },
  { id: "getting-around", key: "gettingAround" },
  { id: "neighborhoods", key: "neighborhoods" },
  { id: "safety", key: "safety" },
  { id: "etiquette", key: "etiquette" },
  { id: "accessibility", key: "accessibility" },
  { id: "weather", key: "weather" },
  { id: "apps", key: "apps" },
  { id: "faq", key: "faq" },
] as const;

export function SectionNav() {
  const tn = useTranslations("travelInfoPage.nav");
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry nearest the top of the viewport that is intersecting.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // Trigger when a section crosses the band just below the sticky bar.
      { rootMargin: "-140px 0px -55% 0px", threshold: 0 }
    );

    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      className="sticky top-16 z-30 border-b backdrop-blur-xl"
      style={{
        background: "rgba(10,10,10,0.72)",
        borderColor: "var(--site-border-08)",
      }}
    >
      <div className="mx-auto max-w-7xl">
        <ul className="flex gap-1 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] md:px-8 [&::-webkit-scrollbar]:hidden">
          {SECTIONS.map((s) => (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                className={cn(
                  "block rounded-full px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-200",
                  active === s.id
                    ? "text-black"
                    : "text-white/55 hover:text-white/90"
                )}
                style={
                  active === s.id
                    ? { background: "#E8A020" }
                    : undefined
                }
              >
                {tn(s.key)}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
