import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Business Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {session?.user?.name}. Manage your listings and analytics here.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {["Total Views", "Active Listings", "Avg Rating"].map((label) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold">—</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Full analytics coming in Phase 2.</p>
    </div>
  );
}
