import { Bell } from "lucide-react";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { NotificationModel } from "@/lib/models/notification";
import { Badge } from "@/components/ui/badge";

type NotifDoc = {
  _id: unknown;
  dealTitle: string;
  voucherCode: string;
  buyerName: string;
  buyerEmail: string;
  amountGEL: number;
  read: boolean;
  createdAt: Date;
};

export default async function AdminNotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "admin" });

  const session = await auth();
  const ownerId = (session?.user as { id?: string } | undefined)?.id ?? "";

  await connectDB();
  const raw = ownerId
    ? await NotificationModel.find({ ownerId })
        .sort({ createdAt: -1 })
        .lean<NotifDoc[]>()
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">{t("notifications")}</h1>
      {raw.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-16 text-center">
          <Bell className="mb-3 size-8 text-muted-foreground" />
          <p className="text-muted-foreground">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {raw.map((n) => (
            <div
              key={String(n._id)}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{n.dealTitle}</p>
                  {!n.read && <Badge variant="default">New</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {n.buyerName || "Guest"}
                  {n.buyerEmail ? ` · ${n.buyerEmail}` : ""}
                </p>
                <p className="text-sm">
                  Code:{" "}
                  <span className="select-all font-mono font-bold tracking-widest">
                    {n.voucherCode}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">₾ {n.amountGEL}</span>
                <span>{n.createdAt.toLocaleString("en-GB")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
