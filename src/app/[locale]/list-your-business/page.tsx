import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import {
  BadgeCheck,
  CalendarClock,
  Eye,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";
import { ListBusinessCTA } from "@/components/site/list-business-cta";

const BENEFITS = [
  {
    Icon: Eye,
    title: "Get discovered",
    body: "Reach travelers planning their Tbilisi trip through our AI route planner, maps, and city guides.",
  },
  {
    Icon: MapPin,
    title: "On the map",
    body: "Your business appears in search, on the interactive map, and in curated itineraries.",
  },
  {
    Icon: CalendarClock,
    title: "Take reservations",
    body: "Let visitors book a table or service directly from your listing — optional, your call.",
  },
  {
    Icon: Star,
    title: "Build reputation",
    body: "Collect reviews and ratings, reply to guests, and track how your listing performs.",
  },
];

const STEPS = [
  {
    Icon: Sparkles,
    title: "1. Submit your details",
    body: "Tell us about your business — name, category, location, hours, photos, and contact info.",
  },
  {
    Icon: ShieldCheck,
    title: "2. We review it",
    body: "Our team checks every submission to keep the platform trustworthy. No charge during review.",
  },
  {
    Icon: Wallet,
    title: "3. Pay & publish",
    body: "Once approved, pay a one-time 50 GEL listing fee and your business goes live instantly.",
  },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    locale,
    path: "/list-your-business",
    title: "List Your Business on ExploreTbilisi",
    description:
      "Reach travelers planning their Tbilisi trip. List your restaurant, café, tour, shop, or stay and get discovered through our AI planner, maps, and city guides.",
  });
}

export default async function ListYourBusinessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen" style={{ background: "var(--site-bg)" }}>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(1200px 500px at 50% -10%, var(--site-surface-08), transparent)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-6 pt-36 pb-20 text-center md:px-12">
          <span
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-medium"
            style={{
              border: "1px solid var(--site-border-20)",
              color: "var(--site-text-80)",
            }}
          >
            <BadgeCheck className="size-3.5" style={{ color: "#E8A020" }} />
            For local businesses
          </span>
          <h1
            className="mx-auto mt-6 max-w-3xl font-display text-4xl leading-tight tracking-tight md:text-6xl"
            style={{ color: "var(--site-text)" }}
          >
            Put your business in front of every
            <span style={{ color: "#E8A020" }}> Tbilisi traveler</span>
          </h1>
          <p
            className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed"
            style={{ color: "var(--site-text-65)" }}
          >
            Restaurants, cafés, tours, shops, and stays — join the platform
            travelers use to plan their trip. List once, get found everywhere.
          </p>
          <div className="mt-9 flex justify-center">
            <ListBusinessCTA />
          </div>
          <p className="mt-4 text-sm" style={{ color: "var(--site-text-50)" }}>
            One-time 50 GEL listing fee · paid only after approval
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:px-12">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(({ Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl p-6"
              style={{
                background: "var(--site-bg-elevated)",
                border: "1px solid var(--site-border-08)",
              }}
            >
              <div
                className="flex size-11 items-center justify-center rounded-xl"
                style={{ background: "var(--site-surface-08)", color: "#E8A020" }}
              >
                <Icon className="size-5" />
              </div>
              <h3
                className="mt-4 text-[16px] font-semibold"
                style={{ color: "var(--site-text)" }}
              >
                {title}
              </h3>
              <p
                className="mt-1.5 text-sm leading-relaxed"
                style={{ color: "var(--site-text-65)" }}
              >
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-6 pb-20 md:px-12">
        <h2
          className="text-center font-display text-3xl tracking-tight md:text-4xl"
          style={{ color: "var(--site-text)" }}
        >
          How it works
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map(({ Icon, title, body }) => (
            <div key={title} className="text-center">
              <div
                className="mx-auto flex size-14 items-center justify-center rounded-2xl"
                style={{
                  background: "var(--site-surface-08)",
                  color: "#E8A020",
                  border: "1px solid var(--site-border-08)",
                }}
              >
                <Icon className="size-6" />
              </div>
              <h3
                className="mt-4 text-[17px] font-semibold"
                style={{ color: "var(--site-text)" }}
              >
                {title}
              </h3>
              <p
                className="mx-auto mt-2 max-w-xs text-sm leading-relaxed"
                style={{ color: "var(--site-text-65)" }}
              >
                {body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center gap-4 text-center">
          <ListBusinessCTA />
        </div>
      </section>
    </main>
  );
}
