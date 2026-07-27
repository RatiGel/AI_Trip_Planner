import { Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface VoucherView {
  id: string;
  code: string;
  dealTitle: string;
  amountGEL: number;
  status: string;
  createdAt: string;
}

export interface VoucherLabels {
  heading: string;
  active: string;
  redeemed: string;
  codeLabel: string;
}

export function DealVouchers({
  vouchers,
  labels,
}: {
  vouchers: VoucherView[];
  labels: VoucherLabels;
}) {
  if (!vouchers.length) return null;
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-semibold tracking-tight">{labels.heading}</h2>
      <div className="mt-4 space-y-4">
        {vouchers.map((v) => (
          <div
            key={v.id}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <Ticket className="mt-0.5 size-5 text-primary" />
              <div>
                <p className="text-base font-semibold">{v.dealTitle}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {labels.codeLabel}:{" "}
                  <span className="select-all font-mono font-bold tracking-widest text-foreground">
                    {v.code}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium text-foreground">₾ {v.amountGEL}</span>
              <Badge variant={v.status === "redeemed" ? "outline" : "default"}>
                {v.status === "redeemed" ? labels.redeemed : labels.active}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
