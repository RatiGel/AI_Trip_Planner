import { getTranslations } from "next-intl/server";
import { MapPin } from "lucide-react";
import { SectionShell, glassCard, glassStyle } from "./section-shell";

type Hood = {
  name: string;
  vibe: string;
  desc: string;
  goodFor: string;
};

export async function NeighborhoodGuide() {
  const t = await getTranslations("travelInfoPage.neighborhoods");
  const items = (t.raw("items") ?? []) as Hood[];

  return (
    <SectionShell id="neighborhoods" heading={t("heading")} sub={t("sub")}>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((h) => (
          <div
            key={h.name}
            className={`${glassCard} hover:-translate-y-1`}
            style={glassStyle}
          >
            <div className="mb-3 flex items-center gap-2.5">
              <MapPin className="size-5" style={{ color: "#F5C842" }} />
              <h3
                className="text-xl font-semibold"
                style={{ color: "var(--site-text)" }}
              >
                {h.name}
              </h3>
            </div>
            <span
              className="inline-block rounded-full px-3 py-1 text-[12px] font-medium"
              style={{
                background: "rgba(232,160,32,0.12)",
                color: "#F5C842",
              }}
            >
              {h.vibe}
            </span>
            <p
              className="mt-3 text-[15px] leading-relaxed"
              style={{ color: "var(--site-text-65)" }}
            >
              {h.desc}
            </p>
            <p
              className="mt-3 text-[13px]"
              style={{ color: "var(--site-text-50)" }}
            >
              <span className="font-semibold">{t("goodForLabel")} </span>
              {h.goodFor}
            </p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
