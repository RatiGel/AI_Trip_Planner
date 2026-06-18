"use client";

import { CalendarDays, DollarSign, MapPin, Users } from "lucide-react";

export type KpiData = {
  users: number;
  trips: number;
  revenueGEL: number;
  activePlans: number;
};

const COLORS = [
  "text-blue-500",
  "text-emerald-500",
  "text-amber-500",
  "text-violet-500",
];

export function KpiCards({ data }: { data: KpiData }) {
  const cards = [
    {
      label: "Total Users",
      value: data.users.toLocaleString(),
      Icon: Users,
      color: COLORS[0],
    },
    {
      label: "AI Trips Generated",
      value: data.trips.toLocaleString(),
      Icon: CalendarDays,
      color: COLORS[1],
    },
    {
      label: "Total Revenue",
      value: `₾ ${data.revenueGEL.toLocaleString()}`,
      Icon: DollarSign,
      color: COLORS[2],
    },
    {
      label: "Active Plans",
      value: data.activePlans.toLocaleString(),
      Icon: MapPin,
      color: COLORS[3],
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ label, value, Icon, color }) => (
        <div
          key={label}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{label}</p>
            <Icon className={`size-4 ${color}`} />
          </div>
          <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
        </div>
      ))}
    </div>
  );
}
