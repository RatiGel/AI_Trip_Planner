import type { TicketOption } from "@/types";

export const mockBusTickets: TicketOption[] = [
  {
    id: "b-1",
    type: "bus",
    from: "Tbilisi",
    to: "Batumi",
    departure: "08:00",
    arrival: "13:30",
    durationMin: 330,
    priceGEL: 35,
    operator: "Georgian Bus",
  },
  {
    id: "b-2",
    type: "bus",
    from: "Tbilisi",
    to: "Batumi",
    departure: "12:00",
    arrival: "17:45",
    durationMin: 345,
    priceGEL: 30,
    operator: "Metro Georgia",
  },
  {
    id: "b-3",
    type: "bus",
    from: "Tbilisi",
    to: "Kazbegi",
    departure: "09:30",
    arrival: "13:00",
    durationMin: 210,
    priceGEL: 25,
    operator: "Caucasus Lines",
  },
];

export const mockRailTickets: TicketOption[] = [
  {
    id: "r-1",
    type: "rail",
    from: "Tbilisi",
    to: "Batumi",
    departure: "07:55",
    arrival: "13:00",
    durationMin: 305,
    priceGEL: 55,
    operator: "Stadler Express",
  },
  {
    id: "r-2",
    type: "rail",
    from: "Tbilisi",
    to: "Batumi",
    departure: "17:30",
    arrival: "22:45",
    durationMin: 315,
    priceGEL: 50,
    operator: "Georgian Railway",
  },
  {
    id: "r-3",
    type: "rail",
    from: "Tbilisi",
    to: "Kutaisi",
    departure: "09:10",
    arrival: "13:55",
    durationMin: 285,
    priceGEL: 40,
    operator: "Georgian Railway",
  },
];

export const mockTransitPasses: TicketOption[] = [
  { id: "tp-1", type: "transit-pass", priceGEL: 3, operator: "1-day Tbilisi pass" },
  { id: "tp-3", type: "transit-pass", priceGEL: 7, operator: "3-day Tbilisi pass" },
  { id: "tp-7", type: "transit-pass", priceGEL: 15, operator: "7-day Tbilisi pass" },
];
