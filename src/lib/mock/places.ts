import type { Place } from "@/types";

const hours = (open: string, close: string, daysClosed: number[] = []) =>
  Array.from({ length: 7 }, (_, d) => ({
    day: d,
    open,
    close,
    closed: daysClosed.includes(d),
  }));

export const mockPlaces: Place[] = [
  {
    id: "p-narikala",
    slug: "narikala-fortress",
    citySlug: "tbilisi",
    name: "Narikala Fortress",
    nameKa: "ნარიყალის ციხე",
    description:
      "4th-century hilltop citadel above the Old Town with sweeping views over Tbilisi's rooftops, sulfur baths and the Mtkvari river.",
    descriptionKa:
      "მე-4 საუკუნის ციტადელი ძველი თბილისის თავზე, საიდანაც იშლება ხედი სახურავებზე, აბანოებზე და მტკვარზე.",
    categories: ["sight"],
    images: [
      "https://images.unsplash.com/photo-1564507004663-b6dfb3c824d5?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1538300342682-cf57afb97285?auto=format&fit=crop&w=1200&q=80",
    ],
    geo: { lng: 44.8089, lat: 41.6878, address: "Narikala, Old Tbilisi" },
    openingHours: hours("00:00", "23:59"),
    priceLevel: 1,
    rating: 4.7,
    reviewCount: 2841,
    tags: ["panoramic", "history", "free"],
    reservable: false,
  },
  {
    id: "p-georgian-national-museum",
    slug: "georgian-national-museum",
    citySlug: "tbilisi",
    name: "Georgian National Museum",
    nameKa: "საქართველოს ეროვნული მუზეუმი",
    description:
      "Anchor museum on Rustaveli Ave covering pre-Christian gold, Soviet occupation, and Caucasus archaeology under one roof.",
    descriptionKa:
      "მთავარი მუზეუმი რუსთაველის გამზირზე — ქრისტიანობამდელი ოქრო, საბჭოთა ოკუპაცია და კავკასიური არქეოლოგია ერთ შენობაში.",
    categories: ["museum"],
    images: [
      "https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=1200&q=80",
    ],
    geo: { lng: 44.7989, lat: 41.6975, address: "3 Rustaveli Ave, Tbilisi" },
    openingHours: hours("10:00", "18:00", [1]),
    priceLevel: 2,
    rating: 4.5,
    reviewCount: 1212,
    tags: ["history", "archaeology", "must-see"],
    reservable: false,
    phone: "+995 32 282 211",
    website: "https://museum.ge",
  },
  {
    id: "p-stamba-cafe",
    slug: "stamba-cafe",
    citySlug: "tbilisi",
    name: "Stamba Cafe",
    nameKa: "სტამბა კაფე",
    description:
      "Industrial-chic third-wave coffee inside a converted Soviet printing house. Specialty roasts, brunch, and a courtyard.",
    descriptionKa:
      "მესამე ტალღის ყავა საბჭოთა სტამბის შენობაში. სპეციალური ჯიშები, ბრანჩი და ეზო.",
    categories: ["cafe", "restaurant"],
    images: [
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80",
    ],
    geo: { lng: 44.7975, lat: 41.7095, address: "14 Merab Kostava St, Tbilisi" },
    openingHours: hours("08:00", "23:00"),
    priceLevel: 3,
    rating: 4.6,
    reviewCount: 980,
    tags: ["wifi", "brunch", "design"],
    reservable: true,
    website: "https://stambahotel.com",
  },
  {
    id: "p-bassiani",
    slug: "bassiani",
    citySlug: "tbilisi",
    name: "Bassiani",
    nameKa: "ბასიანი",
    description:
      "World-renowned techno club under the Dinamo football stadium. Strict door policy, marathon weekend sets.",
    descriptionKa:
      "მსოფლიოში ცნობილი ტექნო კლუბი დინამოს სტადიონის ქვეშ. მკაცრი დრესკოდი, შაბათ-კვირის გრძელი სეტები.",
    categories: ["club"],
    images: [
      "https://images.unsplash.com/photo-1571266028243-d220c6a35e4f?auto=format&fit=crop&w=1200&q=80",
    ],
    geo: { lng: 44.7912, lat: 41.7233, address: "Dinamo Arena, Tbilisi" },
    openingHours: hours("00:00", "10:00", [0, 1, 2, 3, 4]),
    priceLevel: 3,
    rating: 4.8,
    reviewCount: 1530,
    tags: ["techno", "nightlife", "underground"],
    reservable: false,
  },
  {
    id: "p-funicular-park",
    slug: "mtatsminda-park",
    citySlug: "tbilisi",
    name: "Mtatsminda Park",
    nameKa: "მთაწმინდის პარკი",
    description:
      "Hilltop amusement park reached by a vintage funicular — Ferris wheel, restaurants and the best skyline view in the city.",
    descriptionKa:
      "გასართობი პარკი მთაწმინდაზე, რომელსაც ვინტაჟური ფუნიკულიორი მიიყვანს. ნახვის ბორბალი, რესტორნები და საუკეთესო ხედი.",
    categories: ["park", "sight"],
    images: [
      "https://images.unsplash.com/photo-1542359649-31e03cd4d909?auto=format&fit=crop&w=1200&q=80",
    ],
    geo: { lng: 44.7913, lat: 41.6948, address: "Mtatsminda Plateau, Tbilisi" },
    openingHours: hours("10:00", "23:00"),
    priceLevel: 2,
    rating: 4.6,
    reviewCount: 4221,
    tags: ["family", "view", "rides"],
    reservable: false,
  },
  {
    id: "p-shavi-lomi",
    slug: "shavi-lomi",
    citySlug: "tbilisi",
    name: "Shavi Lomi",
    nameKa: "შავი ლომი",
    description:
      "Beloved Georgian-fusion restaurant in a converted house — handmade khinkali, seasonal dishes and a leafy courtyard.",
    descriptionKa:
      "საყვარელი ქართულ-ფიუჟენ რესტორანი ძველ სახლში — ხელნაკეთი ხინკალი, სეზონური კერძები და მწვანე ეზო.",
    categories: ["restaurant", "wine"],
    images: [
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
    ],
    geo: { lng: 44.789, lat: 41.7145, address: "23 Amaghleba St, Tbilisi" },
    openingHours: hours("12:00", "23:30"),
    priceLevel: 3,
    rating: 4.7,
    reviewCount: 2050,
    tags: ["khinkali", "wine", "courtyard"],
    reservable: true,
    phone: "+995 32 296 9595",
  },
  {
    id: "p-piazza-batumi",
    slug: "batumi-piazza",
    citySlug: "batumi",
    name: "Batumi Piazza",
    nameKa: "ბათუმის პიაცა",
    description:
      "Italian-style square ringed with mosaics, hotels and live music — the heart of Batumi's old quarter.",
    descriptionKa:
      "იტალიური სტილის მოედანი მოზაიკებითა და ცოცხალი მუსიკით — ბათუმის ძველი უბნის გული.",
    categories: ["sight"],
    images: [
      "https://images.unsplash.com/photo-1603502824729-ca57da7c66f7?auto=format&fit=crop&w=1200&q=80",
    ],
    geo: { lng: 41.6486, lat: 41.6481, address: "Piazza Square, Batumi" },
    openingHours: hours("00:00", "23:59"),
    priceLevel: 1,
    rating: 4.5,
    reviewCount: 3210,
    tags: ["square", "music", "instagram"],
    reservable: false,
  },
  {
    id: "p-gergeti",
    slug: "gergeti-trinity",
    citySlug: "kazbegi",
    name: "Gergeti Trinity Church",
    nameKa: "გერგეტის სამება",
    description:
      "14th-century church on a ridge at 2,170 m with Mt Kazbek towering behind — the postcard image of Georgia.",
    descriptionKa:
      "მე-14 საუკუნის ეკლესია 2170 მ-ზე, რომლის ფონზე დგას მყინვარწვერი — საქართველოს ღია ბარათი.",
    categories: ["sight", "park"],
    images: [
      "https://images.unsplash.com/photo-1518002171953-a080ee817e1f?auto=format&fit=crop&w=1200&q=80",
    ],
    geo: { lng: 44.6225, lat: 42.6624, address: "Gergeti, Stepantsminda" },
    openingHours: hours("00:00", "23:59"),
    priceLevel: 1,
    rating: 4.9,
    reviewCount: 5421,
    tags: ["hike", "mountain", "iconic"],
    reservable: false,
  },
];

export function getPlacesByCity(citySlug: string) {
  return mockPlaces.filter((p) => p.citySlug === citySlug);
}

export function getPlaceBySlug(slug: string) {
  return mockPlaces.find((p) => p.slug === slug);
}

export function getPlacesByCategory(category: string) {
  return mockPlaces.filter((p) => p.categories.includes(category as never));
}
