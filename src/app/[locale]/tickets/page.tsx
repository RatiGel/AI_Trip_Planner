import { setRequestLocale, getTranslations } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { TicketModel } from "@/lib/models/ticket";
import { mockBusTickets, mockRailTickets, mockTransitPasses } from "@/lib/mock/tickets";
import { GettingAround } from "@/components/site/getting-around";
import { serializeDoc } from "@/lib/serialize";
import type { TicketOption } from "@/types";

export default async function GettingAroundPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await connectDB();
  let tickets = serializeDoc<TicketOption[]>(await TicketModel.find().lean());
  if (tickets.length === 0) {
    tickets = [...mockBusTickets, ...mockRailTickets, ...mockTransitPasses];
  }

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
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-12 md:px-12">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[3px]" style={{ color: "#B5271D" }}>
            {t("eyebrow")}
          </p>
          <h1 className="font-display leading-tight text-white" style={{ fontSize: "clamp(42px, 7vw, 80px)", letterSpacing: "-2px" }}>
            {t("heading")} <em className="italic" style={{ color: "#F5C842" }}>{t("headingEm")}</em>
          </h1>
          <p className="mt-3 max-w-xl text-white/60" style={{ fontSize: "clamp(14px, 1.5vw, 16px)" }}>
            {t("description")}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-12 md:px-12">
        <GettingAround tickets={tickets} />
      </div>
    </div>
  );
}
