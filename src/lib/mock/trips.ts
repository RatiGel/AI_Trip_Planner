import type { SavedItinerary } from "@/types";

export const mockTrips: SavedItinerary[] = [
  {
    id: "trip-1",
    title: "3 days of museums & coffee",
    createdAt: "2026-04-21",
    days: [
      {
        date: "2026-05-20",
        items: [
          { placeId: "p-georgian-national-museum", time: "10:00", notes: "Start with the gold collection" },
          { placeId: "p-stamba-cafe", time: "13:00", notes: "Brunch + flat white" },
          { placeId: "p-narikala", time: "17:00" },
        ],
      },
      {
        date: "2026-05-21",
        items: [
          { placeId: "p-funicular-park", time: "11:00" },
          { placeId: "p-shavi-lomi", time: "20:00", notes: "Reserve courtyard table" },
        ],
      },
    ],
  },
];
