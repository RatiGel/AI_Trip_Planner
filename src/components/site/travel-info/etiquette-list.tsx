import { getTranslations } from "next-intl/server";
import { Check, X } from "lucide-react";
import { SectionShell } from "./section-shell";

export async function EtiquetteList() {
  const t = await getTranslations("travelInfoPage.etiquette");
  const dos = (t.raw("dos") ?? []) as string[];
  const donts = (t.raw("donts") ?? []) as string[];

  const columns = [
    {
      title: t("doTitle"),
      items: dos,
      icon: Check,
      color: "#4ade80",
      bg: "rgba(74,222,128,0.12)",
      border: "rgba(74,222,128,0.25)",
    },
    {
      title: t("dontTitle"),
      items: donts,
      icon: X,
      color: "#ff6b5e",
      bg: "rgba(181,39,29,0.12)",
      border: "rgba(181,39,29,0.3)",
    },
  ];

  return (
    <SectionShell id="etiquette" heading={t("heading")} sub={t("sub")}>
      <div className="grid gap-4 md:grid-cols-2">
        {columns.map((col) => {
          const Ico = col.icon;
          return (
            <div
              key={col.title}
              className="rounded-2xl border p-6 md:p-8"
              style={{ background: col.bg, borderColor: col.border }}
            >
              <h3
                className="mb-5 flex items-center gap-2.5 text-xl font-semibold"
                style={{ color: "var(--site-text)" }}
              >
                <span
                  className="flex size-7 items-center justify-center rounded-full"
                  style={{ background: col.color, color: "#0a0a0a" }}
                >
                  <Ico className="size-4" strokeWidth={3} />
                </span>
                {col.title}
              </h3>
              <ul className="space-y-3.5">
                {col.items.map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <Ico
                      className="mt-1 size-4 shrink-0"
                      style={{ color: col.color }}
                      strokeWidth={2.5}
                    />
                    <span
                      className="text-[15px] leading-relaxed"
                      style={{ color: "var(--site-text-65)" }}
                    >
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}
