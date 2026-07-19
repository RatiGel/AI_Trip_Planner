import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Icon } from "./icon-map";

type Related = {
  icon: string;
  title: string;
  desc: string;
  href: string;
  cta: string;
};

export async function RelatedLinks() {
  const t = await getTranslations("travelInfoPage.related");
  const items = (t.raw("items") ?? []) as Related[];

  return (
    <section className="px-6 py-16 md:px-12 md:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 max-w-2xl">
          <h2
            className="font-display mb-3 leading-tight"
            style={{
              fontSize: "clamp(28px, 4vw, 44px)",
              letterSpacing: "-1px",
              color: "var(--site-text)",
            }}
          >
            {t("heading")}
          </h2>
          <p
            className="text-base leading-relaxed"
            style={{ color: "var(--site-text-60)" }}
          >
            {t("sub")}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group rounded-2xl border p-7 transition-all duration-200 hover:-translate-y-1"
              style={{
                background: "var(--site-surface-08)",
                borderColor: "var(--site-border-08)",
              }}
            >
              <div
                className="mb-5 flex size-12 items-center justify-center rounded-xl"
                style={{ background: "rgba(232,160,32,0.14)", color: "#F5C842" }}
              >
                <Icon name={item.icon} className="size-6" />
              </div>
              <h3
                className="text-xl font-semibold"
                style={{ color: "var(--site-text)" }}
              >
                {item.title}
              </h3>
              <p
                className="mt-2 text-[14px] leading-relaxed"
                style={{ color: "var(--site-text-60)" }}
              >
                {item.desc}
              </p>
              <span
                className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold"
                style={{ color: "#F5C842" }}
              >
                {item.cta}
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
