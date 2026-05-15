import type { City } from "@/types";

export const mockCities: City[] = [
  {
    id: "c-tbilisi",
    slug: "tbilisi",
    name: "Tbilisi",
    nameKa: "თბილისი",
    country: "Georgia",
    description:
      "Georgia's capital — a layered city of sulphur baths, brick churches, brutalist towers and wine bars hidden in courtyards.",
    descriptionKa:
      "საქართველოს დედაქალაქი — გოგირდის აბანოების, აგურის ეკლესიების, ბრუტალისტური კოშკებისა და ეზოებში დამალული ღვინის ბარების ქალაქი.",
    heroImage:
      "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=1600&q=80",
    geo: { lng: 44.7833, lat: 41.7151, address: "Tbilisi, Georgia" },
    placesCount: 42,
  },
  {
    id: "c-batumi",
    slug: "batumi",
    name: "Batumi",
    nameKa: "ბათუმი",
    country: "Georgia",
    description:
      "Black Sea boomtown with a botanic garden, palm-lined boulevard and a skyline that never sleeps.",
    descriptionKa:
      "შავი ზღვის სანაპირო ქალაქი ბოტანიკური ბაღით, პალმებიანი ბულვარით და ცხოვრებით სავსე ჰორიზონტით.",
    heroImage:
      "https://images.unsplash.com/photo-1605448646431-25c7e85d31c1?auto=format&fit=crop&w=1600&q=80",
    geo: { lng: 41.6168, lat: 41.6168, address: "Batumi, Georgia" },
    placesCount: 18,
  },
  {
    id: "c-kazbegi",
    slug: "kazbegi",
    name: "Kazbegi",
    nameKa: "ყაზბეგი",
    country: "Georgia",
    description:
      "Alpine village in the Caucasus, gateway to Gergeti Trinity Church and Mt Kazbek's glaciers.",
    descriptionKa:
      "ალპური სოფელი კავკასიონში, გერგეტის სამების ეკლესიისა და ყაზბეგის მყინვარების კარიბჭე.",
    heroImage:
      "https://images.unsplash.com/photo-1517824806704-9040b037703b?auto=format&fit=crop&w=1600&q=80",
    geo: { lng: 44.6406, lat: 42.6588, address: "Stepantsminda, Georgia" },
    placesCount: 9,
  },
  {
    id: "c-kutaisi",
    slug: "kutaisi",
    name: "Kutaisi",
    nameKa: "ქუთაისი",
    country: "Georgia",
    description:
      "Ancient capital of Colchis — UNESCO-listed Bagrati Cathedral, Sataplia caves and slow river afternoons.",
    descriptionKa:
      "კოლხეთის უძველესი დედაქალაქი — UNESCO-ს ბაგრატის ტაძარი, სათაფლიის გამოქვაბულები და მშვიდი მდინარის ნაპირები.",
    heroImage:
      "https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&w=1600&q=80",
    geo: { lng: 42.7, lat: 42.2679, address: "Kutaisi, Georgia" },
    placesCount: 11,
  },
];

export function getCityBySlug(slug: string) {
  return mockCities.find((c) => c.slug === slug);
}
