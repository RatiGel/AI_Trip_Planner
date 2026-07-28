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

  const live = !redeemed && !expired;
  const spent = redeemed || expired;

  return (
    <div className="ticket-rail-row min-w-0">
      {/* The state dot rides the spine itself, so a stack of rows prints one
          scannable column of state. It replaces the row border: on a rail, a
          box around each row fights the spine it hangs from. It is a sibling of
          the button, not a child — inside the button it would anchor to the
          button's own box and the row's hover fill would clip it. */}
      <span
        className="ticket-dot absolute left-[2.5px] top-[21px] z-[1] size-[9px] rounded-full"
        style={
          {
            background: accent,
            "--dot-halo": live
              ? `color-mix(in srgb, ${accent} 22%, transparent)`
              : "transparent",
          } as React.CSSProperties
        }
        aria-hidden
      />

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="group flex w-full items-center gap-3 rounded-r-[10px] py-[13px] pl-5 pr-3 text-left transition-colors sm:gap-4"
        style={{
          background: open ? "var(--site-surface-08)" : "transparent",
        }}
      >
        <span className="min-w-0 flex-1">
          <span
            className="block truncate text-[15px] font-semibold leading-tight transition-colors group-hover:opacity-80"
            style={{ color: "var(--site-text)" }}
          >
            {voucher.dealTitle}
          </span>
          <span
            className="mt-1 block truncate font-mono text-[10.5px] uppercase tracking-[0.16em]"
            style={{ color: "var(--site-text-40)" }}
          >
            {stateLabel} · {shortDate(voucher.createdAt)}
          </span>
        </span>

        {/* Face value set in the display serif — on a ticket the amount is
            printed, not labelled, and the serif is what separates it from the
            row's utility type. Right-aligned in a fixed slot so the amounts
            form a column that can be totalled by eye. */}
        <span
          className={`font-display w-[68px] shrink-0 text-right text-[18px] leading-none tabular-nums ${
            spent ? "line-through decoration-1" : ""
          }`}
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
          row — and unmounting keeps a long wallet cheap to render. Indented to
          the spine so the opened pass reads as hanging off the same rail. */}
      {open && (
        <div className="voucher-reveal mb-1 ml-5 mt-2">
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
      className="mt-16"
      style={
        {
          // The passes punch notches through to whatever is behind them, so the
          // page surface has to be declared even though the wallet draws no
          // panel of its own.
          "--pass-page": "var(--site-bg-base)",
        } as React.CSSProperties
      }
    >
      {/* The count is set as a fraction, not a total: what a holder wants to
          know opening a wallet is how many passes are still good out of how
          many they hold. Mono and tabular so the digits sit still. */}
      <header className="flex max-w-[520px] flex-wrap items-end justify-between gap-x-6 gap-y-2 pr-3">
        <h2
          className="font-display text-[30px] leading-none sm:text-[34px]"
          style={{ color: "var(--site-text)" }}
        >
          {labels.heading}
        </h2>
        <p className="flex items-baseline gap-1.5 font-mono tabular-nums">
          <span
            className="text-[15px] font-semibold leading-none"
            style={{ color: "var(--color-gold)" }}
          >
            {usable.length}
          </span>
          <span
            className="text-[11px] leading-none"
            style={{ color: "var(--site-text-35)" }}
          >
            / {vouchers.length}
          </span>
          <span
            className="ml-0.5 text-[10px] uppercase tracking-[0.18em] leading-none"
            style={{ color: "var(--site-text-40)" }}
          >
            {labels.active}
          </span>
        </p>
      </header>

      {/* A pass is a hand-held object, so the opened card is capped at a
          ticket's width — the list stays a single column at every size rather
          than pairing up, which would put an opened pass beside a bare row.

          Pulled left by the row's own text indent, so the row title lands on
          the page's left edge — shared with the header logo and the heading —
          and the spine hangs just outside it in the margin. */}
      <div className="ticket-rail -ml-5 mt-7 w-[520px] max-w-full">
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

      {/* Spent and expired passes keep the same rail but drop back: a holder
          scrolls past them to reach what still works, so they are quieter
          rather than hidden — a redeemed pass is still a receipt. */}
      {archived.length > 0 && (
        <div className="mt-10 w-[520px] max-w-full">
          <p
            className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em]"
            style={{ color: "var(--site-text-35)" }}
          >
            {labels.redeemed} · {labels.expiredLabel}
          </p>
          <div className="ticket-rail -ml-5">
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
