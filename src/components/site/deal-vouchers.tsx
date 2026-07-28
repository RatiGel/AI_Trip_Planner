"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  ExplorerPass,
  type ExplorerPassData,
  type ExplorerPassLabels,
} from "@/components/site/explorer-pass";

export type VoucherView = ExplorerPassData;
export type VoucherLabels = ExplorerPassLabels & { heading: string };

/** Compact date for the collapsed row — no year, the list is recent purchases. */
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

/**
 * One line in the wallet: the deal's name, its face value and its state. This
 * is all a holder needs to find the right pass; the pass itself only opens when
 * they are at the gate and about to show it.
 */
function VoucherRow({
  voucher,
  labels,
  open,
  onToggle,
}: {
  voucher: VoucherView;
  labels: VoucherLabels;
  open: boolean;
  onToggle: () => void;
}) {
  const redeemed = voucher.status === "redeemed";
  const expired = !redeemed && voucher.expired === true;
  const accent = redeemed
    ? "var(--site-text-40)"
    : expired
      ? "var(--color-wine-light)"
      : "var(--color-gold)";
  const stateLabel = redeemed
    ? labels.redeemed
    : expired
      ? labels.expiredLabel
      : labels.active;

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="group flex w-full items-center gap-2.5 rounded-[14px] px-3 py-3 text-left transition-colors sm:gap-4 sm:px-4"
        style={{
          background: open ? "var(--site-surface-08)" : "transparent",
          border: "1px solid var(--site-border-06)",
        }}
      >
        {/* State carried as a dot, so the row reads without a badge eating the
            width the deal name needs on a phone. */}
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ background: accent }}
          aria-hidden
        />

        <span className="min-w-0 flex-1">
          <span
            className="block truncate text-[15px] font-semibold leading-tight"
            style={{ color: "var(--site-text)" }}
          >
            {voucher.dealTitle}
          </span>
          <span
            className="mt-0.5 block truncate text-[11px] font-medium uppercase tracking-[0.12em]"
            style={{ color: "var(--site-text-40)" }}
          >
            {stateLabel} · {shortDate(voucher.createdAt)}
          </span>
        </span>

        <span
          className="shrink-0 text-[15px] font-bold tabular-nums"
          style={{ color: accent }}
        >
          ₾{voucher.amountGEL}
        </span>

        <ChevronDown
          className="size-4 shrink-0 transition-transform duration-200"
          style={{
            color: "var(--site-text-40)",
            transform: open ? "rotate(180deg)" : "none",
          }}
          aria-hidden
        />
      </button>

      {/* The pass is mounted only while open. It is a physical object standing
          in for a ticket, so it appears whole rather than sliding out of the
          row — and unmounting keeps a long wallet cheap to render. */}
      {open && (
        <div className="voucher-reveal mt-2.5">
          <ExplorerPass pass={voucher} labels={labels} compact />
        </div>
      )}
    </div>
  );
}

/**
 * The wallet: every pass this account holds, newest first, collapsed to one
 * line each. Live passes come before spent and expired ones, because the only
 * reason to open this page is to present something at a gate — and one pass is
 * open at a time, so what is on screen is unambiguously what staff should read.
 */
export function DealVouchers({
  vouchers,
  labels,
}: {
  vouchers: VoucherView[];
  labels: VoucherLabels;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (!vouchers.length) return null;

  const usable = vouchers.filter(
    (v) => v.status !== "redeemed" && v.expired !== true,
  );
  const archived = vouchers.filter(
    (v) => v.status === "redeemed" || v.expired === true,
  );

  const toggle = (id: string) => setOpenId((cur) => (cur === id ? null : id));

  return (
    <section
      className="mt-16 rounded-[28px] px-4 pb-8 pt-7 sm:px-8 sm:pb-10 sm:pt-9"
      style={
        {
          // The wallet gets the site's own base surface rather than the shadcn
          // page background, so the passes read as elevated off it and their
          // seam punches show the right colour.
          background: "var(--site-bg-base)",
          border: "1px solid var(--site-border-06)",
          "--pass-page": "var(--site-bg-base)",
        } as React.CSSProperties
      }
    >
      <header
        className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-5"
        style={{ borderBottom: "1px solid var(--site-border-08)" }}
      >
        <h2
          className="font-display text-[27px] leading-tight sm:text-[31px]"
          style={{ color: "var(--site-text)" }}
        >
          {labels.heading}
        </h2>
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.18em] tabular-nums"
          style={{ color: "var(--site-text-40)" }}
        >
          {usable.length} {labels.active}
        </p>
      </header>

      {/* A pass is a hand-held object, so the opened card is capped at a
          ticket's width — the list stays a single column at every size rather
          than pairing up, which would put an opened pass beside a bare row. */}
      <div className="mx-auto mt-6 max-w-[520px] space-y-2.5">
        {usable.map((v) => (
          <VoucherRow
            key={v.id}
            voucher={v}
            labels={labels}
            open={openId === v.id}
            onToggle={() => toggle(v.id)}
          />
        ))}
      </div>

      {archived.length > 0 && (
        <div className="mx-auto mt-9 max-w-[520px]">
          <p
            className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{ color: "var(--site-text-35)" }}
          >
            {labels.redeemed} · {labels.expiredLabel}
          </p>
          <div className="space-y-2.5">
            {archived.map((v) => (
              <VoucherRow
                key={v.id}
                voucher={v}
                labels={labels}
                open={openId === v.id}
                onToggle={() => toggle(v.id)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
