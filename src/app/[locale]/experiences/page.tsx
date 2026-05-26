import { setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { Clock, Users, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";

const EXPERIENCES = [
  {
    id: "1",
    title: "Old Town Walking Tour",
    category: "Tour",
    duration: "3 hours",
    groupSize: "Up to 12",
    rating: 4.9,
    reviews: 842,
    price: "₾35",
    img: "https://images.unsplash.com/photo-1564507004663-b6dfb3c824d5?w=800&q=80",
    desc: "Walk through 1,500 years of history with a local expert guide.",
    tags: ["Walking", "History", "Photography"],
  },
  {
    id: "2",
    title: "Georgian Wine & Food Tasting",
    category: "Food & Wine",
    duration: "4 hours",
    groupSize: "Up to 8",
    rating: 4.8,
    reviews: 631,
    price: "₾85",
    img: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80",
    desc: "Visit a family winery, taste 8+ wines, and enjoy a traditional supra feast.",
    tags: ["Wine", "Food", "Culture"],
  },
  {
    id: "3",
    title: "Sulphur Bath Experience",
    category: "Wellness",
    duration: "2 hours",
    groupSize: "Private",
    rating: 4.7,
    reviews: 1204,
    price: "₾60",
    img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    desc: "Private session in an original Abanotubani bathhouse with optional massage.",
    tags: ["Wellness", "Spa", "Authentic"],
  },
  {
    id: "4",
    title: "Kazbegi Mountain Day Trip",
    category: "Day Trip",
    duration: "Full day",
    groupSize: "Up to 15",
    rating: 4.9,
    reviews: 2187,
    price: "₾120",
    img: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80",
    desc: "Drive the Georgian Military Highway to Kazbegi with Gergeti Trinity Church.",
    tags: ["Mountains", "Nature", "Photography"],
  },
  {
    id: "5",
    title: "Street Art & Nightlife Tour",
    category: "Nightlife",
    duration: "4 hours",
    groupSize: "Up to 10",
    rating: 4.6,
    reviews: 389,
    price: "₾45",
    img: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&q=80",
    desc: "Discover Tbilisi's underground art scene and best bar-hopping route.",
    tags: ["Nightlife", "Art", "Social"],
  },
  {
    id: "6",
    title: "Cooking Masterclass: Georgian Cuisine",
    category: "Food",
    duration: "3.5 hours",
    groupSize: "Up to 6",
    rating: 4.8,
    reviews: 517,
    price: "₾70",
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    desc: "Learn to make khinkali, khachapuri, and churchkhela with a local family.",
    tags: ["Cooking", "Food", "Family"],
  },
];

const FILTERS = ["All", "Tours", "Food & Wine", "Wellness", "Day Trips", "Nightlife"];

export default async function ExperiencesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div style={{ background: "#0A0A0A", minHeight: "100vh" }}>
      {/* Hero */}
      <div className="relative flex items-end overflow-hidden" style={{ height: 380, paddingTop: 72 }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(10,10,10,0.95)), url('https://images.unsplash.com/photo-1564507004663-b6dfb3c824d5?w=1800&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-12 md:px-12">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[3px]" style={{ color: "#B5271D" }}>
            Live it fully
          </p>
          <h1
            className="font-display leading-tight text-white"
            style={{ fontSize: "clamp(42px, 7vw, 80px)", letterSpacing: "-2px" }}
          >
            Tours &amp; <em className="italic" style={{ color: "#F5C842" }}>Experiences</em>
          </h1>
        </div>
      </div>

      {/* Filters */}
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

      {/* Grid */}
      <div className="mx-auto max-w-7xl px-6 py-12 md:px-12">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {EXPERIENCES.map((exp) => (
            <Link key={exp.id} href={`/reserve/${exp.id}`} className="group block">
              <div className="overflow-hidden rounded-2xl" style={{ background: "#1E1E1E" }}>
                <div className="relative overflow-hidden" style={{ aspectRatio: "4/3" }}>
                  <Image src={exp.img} alt={exp.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white" style={{ background: "#B5271D" }}>
                    {exp.category}
                  </div>
                  <div className="absolute right-3 top-3 rounded-full px-3 py-1 text-[13px] font-bold text-white" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
                    {exp.price}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-display mb-2 text-lg text-white">{exp.title}</h3>
                  <p className="mb-3 text-[13px] leading-relaxed text-white/45">{exp.desc}</p>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {exp.tags.map((tag) => (
                      <span key={tag} className="rounded-full px-2.5 py-0.5 text-[11px] text-white/40" style={{ background: "rgba(255,255,255,0.06)" }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[12px] text-white/35">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><Clock className="size-3" /> {exp.duration}</span>
                      <span className="flex items-center gap-1"><Users className="size-3" /> {exp.groupSize}</span>
                    </div>
                    <span className="flex items-center gap-1 font-semibold" style={{ color: "#E8A020" }}>
                      <Star className="size-3 fill-current" /> {exp.rating}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
