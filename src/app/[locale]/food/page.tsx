import { setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { MapPin, Clock, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";

const PLACES = [
  {
    id: "1",
    name: "Shavi Lomi",
    category: "Restaurant",
    type: "restaurant",
    cuisine: "Georgian Modern",
    area: "Vera",
    hours: "12:00 – 23:00",
    rating: 4.8,
    priceLevel: 3,
    img: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80",
    desc: "Award-winning modern Georgian cuisine in a cosy neighbourhood setting.",
    mustTry: "Wild garlic khinkali",
  },
  {
    id: "2",
    name: "Café Leila",
    category: "Cafe",
    type: "cafe",
    cuisine: "All-day Café",
    area: "Old Town",
    hours: "08:00 – 22:00",
    rating: 4.7,
    priceLevel: 2,
    img: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&q=80",
    desc: "Airy courtyard café beloved for specialty coffee and homemade pastries.",
    mustTry: "Cheese bread & cold brew",
  },
  {
    id: "3",
    name: "Wine Factory N1",
    category: "Wine Bar",
    type: "wine",
    cuisine: "Wine & Snacks",
    area: "Marjanishvili",
    hours: "14:00 – 02:00",
    rating: 4.9,
    priceLevel: 3,
    img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    desc: "Minimalist wine bar in a restored factory, 200+ Georgian natural wines.",
    mustTry: "Rkatsiteli amber wine",
  },
  {
    id: "4",
    name: "Bassiani Rooftop Bar",
    category: "Nightlife",
    type: "nightlife",
    cuisine: "Cocktail Bar",
    area: "Marjanishvili",
    hours: "20:00 – 06:00",
    rating: 4.6,
    priceLevel: 2,
    img: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80",
    desc: "Rooftop bar with panoramic views and Tbilisi's best cocktail programme.",
    mustTry: "Chacha Sour",
  },
  {
    id: "5",
    name: "Barbarestan",
    category: "Restaurant",
    type: "restaurant",
    cuisine: "Heritage Georgian",
    area: "Vera",
    hours: "13:00 – 23:00",
    rating: 4.9,
    priceLevel: 4,
    img: "https://images.unsplash.com/photo-1564507004663-b6dfb3c824d5?w=800&q=80",
    desc: "Recipes from an 1878 cookbook by Princess Barbaré Jorjadze, meticulously recreated.",
    mustTry: "Walnut-stuffed chicken satsivi",
  },
  {
    id: "6",
    name: "Fabrika Food Court",
    category: "Food Hall",
    type: "restaurant",
    cuisine: "Mixed / Street Food",
    area: "Chugureti",
    hours: "11:00 – 00:00",
    rating: 4.5,
    priceLevel: 1,
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    desc: "20+ vendors in the iconic repurposed sewing factory — something for everyone.",
    mustTry: "Georgian fast food & craft beer",
  },
];

const FILTERS = ["All", "Restaurants", "Cafes", "Wine Bars", "Nightlife"];

export default async function FoodPage({
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
              "linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(10,10,10,0.95)), url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1800&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-12 md:px-12">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[3px]" style={{ color: "#B5271D" }}>
            Eat, drink, celebrate
          </p>
          <h1
            className="font-display leading-tight text-white"
            style={{ fontSize: "clamp(42px, 7vw, 80px)", letterSpacing: "-2px" }}
          >
            Food &amp; <em className="italic" style={{ color: "#F5C842" }}>Drinks</em>
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
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PLACES.map((place) => (
            <div key={place.id} className="group overflow-hidden rounded-2xl" style={{ background: "#1E1E1E" }}>
              <div className="relative overflow-hidden" style={{ aspectRatio: "4/3" }}>
                <Image src={place.img} alt={place.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white" style={{ background: "#B5271D" }}>
                  {place.category}
                </div>
              </div>
              <div className="p-5">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-white/30">{place.cuisine}</div>
                <h3 className="font-display mb-1.5 text-xl text-white">{place.name}</h3>
                <p className="mb-3 text-[13px] leading-relaxed text-white/45">{place.desc}</p>

                {/* Must try */}
                <div className="mb-4 rounded-xl px-3 py-2" style={{ background: "rgba(232,160,32,0.1)", border: "1px solid rgba(232,160,32,0.2)" }}>
                  <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "#E8A020" }}>Must try: </span>
                  <span className="text-[12px] text-white/60">{place.mustTry}</span>
                </div>

                <div className="flex items-center justify-between text-[12px] text-white/35">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><MapPin className="size-3" /> {place.area}</span>
                    <span className="flex items-center gap-1"><Clock className="size-3" /> {place.hours}</span>
                  </div>
                  <span className="flex items-center gap-1 font-semibold" style={{ color: "#E8A020" }}>
                    <Star className="size-3 fill-current" /> {place.rating}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
