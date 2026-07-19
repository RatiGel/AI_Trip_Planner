import { getTranslations } from "next-intl/server";
import { SectionShell, glassCard, glassStyle } from "./section-shell";
import { Icon } from "./icon-map";

type Season = {
  season: string;
  icon: string;
  months: string;
  temp: string;
  desc: string;
  pack: string;
};

export async function WeatherSeasons() {
  const t = await getTranslations("travelInfoPage.weather");
  const tp = await getTranslations("travelInfoPage.weather.labels");
  const items = (t.raw("items") ?? []) as Season[];

  return (
    <SectionShell id="weather" heading={t("heading")} sub={t("sub")}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((s) => (
          <div
            key={s.season}
            className={`${glassCard} hover:-translate-y-1`}
            style={glassStyle}
          >
            <div className="mb-4 flex items-center justify-between">
              <Icon name={s.icon} className="size-7" />
              <span
                className="text-[12px] font-medium"
                style={{ color: "var(--site-text-50)" }}
              >
                {s.months}
              </span>
            </div>
            <h3
              className="text-lg font-semibold"
              style={{ color: "var(--site-text)" }}
            >
              {s.season}
            </h3>
            <p
              className="font-display mt-1 text-2xl"
              style={{ color: "#F5C842" }}
            >
              {s.temp}
            </p>
            <p
              className="mt-2 text-[13px] leading-relaxed"
              style={{ color: "var(--site-text-60)" }}
            >
              {s.desc}
            </p>
            <p
              className="mt-3 border-t pt-3 text-[13px] leading-relaxed"
              style={{
                color: "var(--site-text-50)",
                borderColor: "var(--site-border-08)",
              }}
            >
              <span className="font-semibold">{tp("pack")} </span>
              {s.pack}
            </p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
