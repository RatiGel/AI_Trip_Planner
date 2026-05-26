import { setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

const EVENTS = [
  {
    id: "1",
    title: "Tbilisi Open Air Festival",
    category: "Music",
    date: "Jun 14–16, 2026",
    location: "Mtkvari River Bank",
    img: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80",
    featured: true,
    desc: "Three days of electronic music, art installations, and street food along the Mtkvari river.",
  },
  {
    id: "2",
    title: "Georgian Wine Festival",
    category: "Food & Wine",
    date: "May 25–26, 2026",
    location: "Old Town, Rike Park",
    img: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80",
    featured: true,
    desc: "200+ Georgian wine producers, traditional food, and live folk music.",
  },
  {
    id: "3",
    title: "Art Gene Festival",
    category: "Arts & Culture",
    date: "Jul 4–7, 2026",
    location: "Ethnographic Museum",
    img: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&q=80",
    featured: false,
    desc: "Traditional Georgian crafts, music, and dance from all regions of Georgia.",
  },
  {
    id: "4",
    title: "Tbilisi Jazz Festival",
    category: "Music",
    date: "Oct 10–13, 2026",
    location: "Fabrika & Venues",
    img: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80",
    featured: false,
    desc: "International jazz artists perform across Tbilisi's most iconic venues.",
  },
  {
    id: "5",
    title: "Tbilisoba City Day",
    category: "Festival",
    date: "Oct 4–5, 2026",
    location: "Citywide",
    img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    featured: false,
    desc: "Annual city celebration with food markets, street performances, and fireworks.",
  },
  {
    id: "6",
    title: "Documentary Film Festival",
    category: "Film",
    date: "Nov 1–8, 2026",
    location: "Various Cinemas",
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    featured: false,
    desc: "International documentary screenings and filmmaker Q&As across Tbilisi.",
  },
];

const FILTERS = ["All Events", "Music", "Food & Wine", "Arts & Culture", "Festivals", "Film"];

export default async function EventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const featured = EVENTS.filter((e) => e.featured);
  const regular = EVENTS.filter((e) => !e.featured);

  return (
    <div style={{ background: "#0A0A0A", minHeight: "100vh" }}>
      {/* Hero */}
      <div className="relative flex items-end overflow-hidden" style={{ height: 380, paddingTop: 72 }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(10,10,10,0.95)), url('https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1800&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-12 md:px-12">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[3px]" style={{ color: "#B5271D" }}>
            What&apos;s on
          </p>
          <h1
            className="font-display leading-tight text-white"
            style={{ fontSize: "clamp(42px, 7vw, 80px)", letterSpacing: "-2px" }}
          >
            Events &amp; <em className="italic" style={{ color: "#F5C842" }}>Festivals</em>
          </h1>
        </div>
      </div>

      {/* Filter bar */}
      <div className="sticky z-30 px-6 md:px-12" style={{ top: 72, background: "#141414", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto py-4 scrollbar-hide">
          {FILTERS.map((f, i) => (
            <button
              key={f}
              className="shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition-colors"
              style={
                i === 0
                  ? { background: "#B5271D", color: "white" }
                  : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-12 md:px-12">
        {/* Featured events */}
        <h2 className="font-display mb-6 text-2xl text-white" style={{ letterSpacing: "-0.5px" }}>
          Highlights
        </h2>
        <div className="mb-12 grid gap-5 md:grid-cols-2">
          {featured.map((ev) => (
            <div key={ev.id} className="group overflow-hidden rounded-2xl" style={{ background: "#1E1E1E" }}>
              <div className="relative overflow-hidden" style={{ aspectRatio: "16/8" }}>
                <Image src={ev.img} alt={ev.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute left-4 top-4 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white" style={{ background: "#B5271D" }}>
                  {ev.category}
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-display mb-2 text-xl text-white">{ev.title}</h3>
                <p className="mb-3 text-[13px] text-white/45">{ev.desc}</p>
                <div className="flex items-center gap-4 text-[12px] text-white/35">
                  <span className="flex items-center gap-1.5"><Calendar className="size-3.5" /> {ev.date}</span>
                  <span className="flex items-center gap-1.5"><MapPin className="size-3.5" /> {ev.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* All events */}
        <h2 className="font-display mb-6 text-2xl text-white" style={{ letterSpacing: "-0.5px" }}>
          All Events
        </h2>
        <div className="grid gap-4">
          {regular.map((ev) => (
            <div key={ev.id} className="group flex items-center gap-5 overflow-hidden rounded-2xl p-4 transition-colors hover:bg-white/4" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="relative size-20 shrink-0 overflow-hidden rounded-xl">
                <Image src={ev.img} alt={ev.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: "#B5271D" }}>{ev.category}</div>
                <h3 className="font-display mb-1 truncate text-lg text-white">{ev.title}</h3>
                <div className="flex items-center gap-3 text-[12px] text-white/35">
                  <span className="flex items-center gap-1"><Calendar className="size-3" /> {ev.date}</span>
                  <span className="flex items-center gap-1"><MapPin className="size-3" /> {ev.location}</span>
                </div>
              </div>
              <ArrowRight className="size-4 shrink-0 text-white/20 transition-colors group-hover:text-white/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
