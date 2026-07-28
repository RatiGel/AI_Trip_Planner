import {
  ExplorerPass,
  type ExplorerPassData,
  type ExplorerPassLabels,
} from "@/components/site/explorer-pass";

export type VoucherView = ExplorerPassData;
export type VoucherLabels = ExplorerPassLabels & { heading: string };

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
      <div className="mt-4 space-y-5">
        {vouchers.map((v) => (
          <ExplorerPass key={v.id} pass={v} labels={labels} />
        ))}
      </div>
    </section>
  );
}
