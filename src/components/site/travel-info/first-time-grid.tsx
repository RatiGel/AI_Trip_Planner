import { getTranslations } from "next-intl/server";
import { SectionShell, glassCard, glassStyle } from "./section-shell";
import { Icon } from "./icon-map";

type Item = {
  icon: string;
  title: string;
  value: string;
  detail: string;
};

export async function FirstTimeGrid() {
  const t = await getTranslations("travelInfoPage.firstTime");
  const items = (t.raw("items") ?? []) as Item[];

  return (
    <SectionShell id="first-time" heading={t("heading")} sub={t("sub")}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.title}
            className={`${glassCard} hover:-translate-y-1`}
            style={glassStyle}
          >
            <div
              className="mb-4 flex size-11 items-center justify-center rounded-xl"
              style={{ background: "rgba(232,160,32,0.14)", color: "#F5C842" }}
            >
              <Icon name={item.icon} className="size-5" />
            </div>
            <h3
              className="text-[13px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--site-text-50)" }}
            >
              {item.title}
            </h3>
            <p
              className="mt-1 mb-2 text-lg font-semibold"
              style={{ color: "var(--site-text)" }}
            >
              {item.value}
            </p>
            <p
              className="text-[13px] leading-relaxed"
              style={{ color: "var(--site-text-60)" }}
            >
              {item.detail}
            </p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
