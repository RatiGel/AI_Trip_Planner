import { getTranslations } from "next-intl/server";
import { ShieldCheck, PhoneCall } from "lucide-react";
import { SectionShell } from "./section-shell";

export async function SafetyCard() {
  const t = await getTranslations("travelInfoPage.safety");
  const tips = (t.raw("tips") ?? []) as string[];

  return (
    <SectionShell id="safety" heading={t("heading")} sub={t("sub")} alt>
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Reassurance + tips */}
        <div
          className="rounded-2xl border p-6 md:p-8 lg:col-span-2"
          style={{
            background: "var(--site-surface-08)",
            borderColor: "var(--site-border-08)",
          }}
        >
          <div className="mb-5 flex items-center gap-3">
            <ShieldCheck className="size-6" style={{ color: "#4ade80" }} />
            <p
              className="text-[15px] leading-relaxed"
              style={{ color: "var(--site-text-80)" }}
            >
              {t("intro")}
            </p>
          </div>
          <ul className="space-y-3.5">
            {tips.map((tip, i) => (
              <li key={i} className="flex gap-3">
                <span
                  className="mt-2 size-1.5 shrink-0 rounded-full"
                  style={{ background: "#E8A020" }}
                />
                <span
                  className="text-[15px] leading-relaxed"
                  style={{ color: "var(--site-text-65)" }}
                >
                  {tip}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Emergency callout */}
        <div
          className="flex flex-col items-center justify-center rounded-2xl border p-8 text-center"
          style={{
            background:
              "linear-gradient(160deg, rgba(181,39,29,0.22), rgba(181,39,29,0.08))",
            borderColor: "rgba(181,39,29,0.4)",
          }}
        >
          <PhoneCall className="mb-3 size-8" style={{ color: "#ff6b5e" }} />
          <p
            className="text-[13px] uppercase tracking-wide"
            style={{ color: "var(--site-text-60)" }}
          >
            {t("emergencyLabel")}
          </p>
          <p
            className="font-display mt-1 text-6xl font-bold"
            style={{ color: "#ffffff" }}
          >
            {t("emergencyNumber")}
          </p>
        </div>
      </div>
    </SectionShell>
  );
}
