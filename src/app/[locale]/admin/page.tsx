import { Building2, CalendarCheck, MapPin, Receipt, Users, Image } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";
import { UserModel } from "@/lib/models/user";
import { ReservationModel } from "@/lib/models/reservation";

export default async function AdminHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await connectDB();

  const [placesCount, usersCount, reservationsCount] = await Promise.all([
    PlaceModel.countDocuments(),
    UserModel.countDocuments(),
    ReservationModel.countDocuments(),
  ]);

  const STATS = [
    { label: "Places", value: placesCount, Icon: MapPin, href: "/admin/places" },
    { label: "Users", value: usersCount, Icon: Users, href: "/admin/users" },
    { label: "Reservations", value: reservationsCount, Icon: CalendarCheck, href: "/admin/reservations" },
    { label: "Media", value: "—", Icon: Image, href: "/admin/media" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform management overview</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map(({ label, value, Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:bg-accent"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label}</p>
              <Icon className="size-4 text-primary" />
            </div>
            <p className="mt-2 text-3xl font-bold">{value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/admin/places" className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:bg-accent">
          <div className="flex items-center gap-3">
            <MapPin className="size-5 text-primary" />
            <div>
              <p className="font-medium">Manage Places</p>
              <p className="text-sm text-muted-foreground">Add, edit or remove listings</p>
            </div>
          </div>
        </Link>
        <Link href="/admin/users" className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:bg-accent">
          <div className="flex items-center gap-3">
            <Users className="size-5 text-primary" />
            <div>
              <p className="font-medium">Manage Users</p>
              <p className="text-sm text-muted-foreground">Edit roles, suspend accounts</p>
            </div>
          </div>
        </Link>
        <Link href="/admin/reservations" className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:bg-accent">
          <div className="flex items-center gap-3">
            <CalendarCheck className="size-5 text-primary" />
            <div>
              <p className="font-medium">Reservations</p>
              <p className="text-sm text-muted-foreground">View and manage bookings</p>
            </div>
          </div>
        </Link>
        <Link href="/admin/orders" className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:bg-accent">
          <div className="flex items-center gap-3">
            <Receipt className="size-5 text-primary" />
            <div>
              <p className="font-medium">Ticket Orders</p>
              <p className="text-sm text-muted-foreground">Track transport bookings</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
