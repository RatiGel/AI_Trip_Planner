import { CalendarDays, MapPin } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { connectDB } from "@/lib/db";
import { ReservationModel } from "@/lib/models/reservation";
import { PlaceModel } from "@/lib/models/place";
import { VoucherModel } from "@/lib/models/voucher";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PayButton } from "@/components/site/pay-button";
import { DealVouchers, type VoucherView } from "@/components/site/deal-vouchers";
import { isPassExpired, passLabels } from "@/components/site/explorer-pass";
import { backfillOrderNumbers } from "@/lib/voucher";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  confirmed: "default",
  cancelled: "destructive",
};

type ReservationDoc = {
  _id: unknown;
  placeId: string;
  datetime: string;
  partySize: number;
  notes?: string;
  status: "pending" | "confirmed" | "cancelled";
  priceGEL?: number;
  paymentStatus?: "unpaid" | "paid";
  createdAt: Date;
};

type PlaceDoc = {
  _id: unknown;
  slug: string;
  name: string;
  images: string[];
};

export default async function ReservationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect({ href: "/login", locale });

  await connectDB();
  const userId = (session!.user as { id?: string }).id ?? "";

  const rawReservations = await ReservationModel.find({ userId })
    .sort({ datetime: -1 })
    .lean<ReservationDoc[]>();

  const placeIds = [...new Set(rawReservations.map((r) => r.placeId))];
  const rawPlaces = await PlaceModel.find({ _id: { $in: placeIds } })
    .select("slug name images")
    .lean<PlaceDoc[]>();
  const placeMap = new Map(rawPlaces.map((p) => [String(p._id), p]));

  const reservations = rawReservations.map((r) => ({
    id: String(r._id),
    placeId: r.placeId,
    datetime: r.datetime,
    partySize: r.partySize,
    notes: r.notes,
    status: r.status,
    priceGEL: r.priceGEL,
    paymentStatus: r.paymentStatus,
    place: placeMap.get(r.placeId) ?? null,
  }));

  const rawVouchers = await VoucherModel.find({ userId })
    .sort({ createdAt: -1 })
    .lean<
      {
        _id: unknown;
        code: string;
        dealId: string;
        dealTitle: string;
        amountGEL: number;
        status: string;
        createdAt: Date;
        validUntil?: Date;
        buyerName?: string;
        buyerEmail?: string;
        recipientFirstName?: string;
        recipientLastName?: string;
        recipientAge?: number;
        businessName?: string;
        businessAddress?: string;
        orderNo?: number;
      }[]
    >();

  // Vouchers issued before orderNo existed get one assigned now, so every pass
  // shows a short order number instead of a blank field.
  const backfilled = await backfillOrderNumbers(rawVouchers);

  // Vouchers issued before the buyer snapshot existed have no name to print as
  // the holder. These are this user's own vouchers, so fall back to the signed-in
  // account rather than leaving the holder line blank.
  const sessionUser = session!.user as { name?: string | null; email?: string | null };
  const fallbackBuyerName = sessionUser.name ?? "";
  const fallbackBuyerEmail = sessionUser.email ?? "";

  const vouchers: VoucherView[] = rawVouchers.map((v) => {
    const view: VoucherView = {
      id: String(v._id),
      code: v.code,
      dealId: v.dealId,
      dealTitle: v.dealTitle,
      amountGEL: v.amountGEL,
      status: v.status,
      createdAt: v.createdAt.toISOString(),
      validUntil: v.validUntil?.toISOString(),
      buyerName: v.buyerName || fallbackBuyerName,
      buyerEmail: v.buyerEmail || fallbackBuyerEmail,
      recipientFirstName: v.recipientFirstName,
      recipientLastName: v.recipientLastName,
      recipientAge: v.recipientAge,
      businessName: v.businessName,
      businessAddress: v.businessAddress,
      orderNo: v.orderNo ?? backfilled.get(String(v._id)),
    };
    return { ...view, expired: isPassExpired(view) };
  });

  const td = await getTranslations({ locale, namespace: "myDeals" });
  const voucherLabels = { heading: td("heading"), ...passLabels(td) };

  if (!reservations.length && !vouchers.length) {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
        <CalendarDays className="mb-4 size-10 text-primary" />
        <h1 className="text-2xl font-semibold">My Reservations</h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          You haven&apos;t made any reservations yet. Browse places to book a table or experience.
        </p>
        <Button asChild className="mt-6">
          <Link href="/places">Browse Places</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {reservations.length > 0 && (
        <>
          <h1 className="text-3xl font-semibold tracking-tight">My Reservations</h1>
          <p className="mt-1 text-muted-foreground">{reservations.length} reservation{reservations.length !== 1 ? "s" : ""}</p>

          <div className="mt-6 space-y-4">
            {reservations.map((r) => {
              const place = r.place;
              const dt = new Date(r.datetime);
              const dateLabel = dt.toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              const timeLabel = dt.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={r.id}
                  className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-start"
                >
                  {/* Place thumbnail */}
                  {place?.images?.[0] && (
                    <div className="h-24 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:h-20 sm:w-28">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={place.images[0]}
                        alt={place.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold">
                        {place ? (
                          <Link href={`/places/${place.slug}`} className="hover:underline">
                            {place.name}
                          </Link>
                        ) : (
                          "Unknown Place"
                        )}
                      </h2>
                      <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>
                        {r.status}
                      </Badge>
                      {r.paymentStatus === "paid" && (
                        <Badge variant="outline" className="text-emerald-600">
                          Paid
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="size-3.5" />
                        {dateLabel} · {timeLabel}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="size-3.5" />
                        {r.partySize} {r.partySize === 1 ? "person" : "people"}
                      </span>
                      {r.priceGEL != null && r.priceGEL > 0 && (
                        <span className="font-medium text-foreground">₾ {r.priceGEL}</span>
                      )}
                    </div>

                    {r.notes && (
                      <p className="text-sm text-muted-foreground">{r.notes}</p>
                    )}

                    {/* Pay button for unpaid reservations with a price */}
                    {r.status !== "cancelled" &&
                      r.paymentStatus === "unpaid" &&
                      r.priceGEL != null &&
                      r.priceGEL > 0 && (
                        <PayButton
                          purpose="reservation"
                          targetId={r.id}
                          label={`Pay ₾${r.priceGEL} deposit`}
                          size="sm"
                          variant="default"
                        />
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <DealVouchers vouchers={vouchers} labels={voucherLabels} />
    </div>
  );
}
