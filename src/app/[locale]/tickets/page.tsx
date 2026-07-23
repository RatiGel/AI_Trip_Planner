import { setRequestLocale, getTranslations } from "next-intl/server";
import { GettingAround } from "@/components/site/getting-around";

export default async function GettingAroundPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "gettingAround" });

  return (
    <div style={{ background: "var(--site-bg-base)", minHeight: "100vh" }}>
      <div className="relative flex items-end overflow-hidden" style={{ height: 360, paddingTop: 72 }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(10,10,10,0.95)), url('https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1800&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-20 md:px-12">
          <h1 className="font-display leading-tight text-white" style={{ fontSize: "clamp(42px, 7vw, 80px)", letterSpacing: "-2px" }}>
            {t("heading")} <em className="italic" style={{ color: "#F5C842" }}>{t("headingEm")}</em>
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-12 md:px-12">
        <GettingAround />
      </div>
    </div>
  );
}
