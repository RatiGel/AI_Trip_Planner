"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface PlatformStats {
  usersByRole: { role: string; count: number }[];
  listingsByCity: { city: string; count: number }[];
  listingsByCategory: { category: string; count: number }[];
}

export function PlatformCharts({ stats }: { stats: PlatformStats }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-medium mb-4">Users by role</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stats.usersByRole} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="role" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-medium mb-4">Listings by city</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stats.listingsByCity} margin={{ top: 0, right: 0, left: -20, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="city" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
        <h3 className="text-sm font-medium mb-4">Listings by category</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stats.listingsByCategory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="category" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
