import { getTranslations } from "next-intl/server";
import { Accessibility } from "lucide-react";
import { SectionShell } from "./section-shell";

export async function AccessibilityCard() {
  const t = await getTranslations("travelInfoPage.accessibility");
  const points = (t.raw("points") ?? []) as string[];

  return (
    <SectionShell id="accessibility" heading={t("heading")} sub={t("sub")} alt>
      <div
        className="rounded-2xl border p-6 md:p-8"
        style={{
          background: "var(--site-surface-08)",
          borderColor: "var(--site-border-08)",
        }}
      >
        <div
          className="mb-5 flex size-12 items-center justify-center rounded-xl"
          style={{ background: "rgba(232,160,32,0.14)", color: "#F5C842" }}
        >
          <Accessibility className="size-6" />
        </div>
        <ul className="grid gap-3.5 sm:grid-cols-2">
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
    </SectionShell>
  );
}
