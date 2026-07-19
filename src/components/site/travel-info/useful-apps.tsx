import { getTranslations } from "next-intl/server";
import { SectionShell, glassCard, glassStyle } from "./section-shell";
import { Icon } from "./icon-map";

type App = {
  icon: string;
  name: string;
  desc: string;
};

export async function UsefulApps() {
  const t = await getTranslations("travelInfoPage.apps");
  const items = (t.raw("items") ?? []) as App[];

  return (
    <SectionShell id="apps" heading={t("heading")} sub={t("sub")} alt>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((app) => (
          <div
            key={app.name}
            className={`${glassCard} flex items-start gap-4 hover:-translate-y-1`}
            style={glassStyle}
          >
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "rgba(232,160,32,0.14)", color: "#F5C842" }}
            >
              <Icon name={app.icon} className="size-5" />
            </div>
            <div>
              <h3
                className="text-base font-semibold"
                style={{ color: "var(--site-text)" }}
              >
                {app.name}
              </h3>
              <p
                className="mt-1 text-[13px] leading-relaxed"
                style={{ color: "var(--site-text-60)" }}
              >
                {app.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
