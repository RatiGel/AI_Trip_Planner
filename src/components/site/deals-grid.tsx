"use client";

import { useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { payNow } from "@/lib/pay";
import { RecipientsDialog } from "@/components/site/recipients-dialog";
import type { DealCategory, DealOption, VoucherRecipient } from "@/types";

const DEAL_CATEGORY_COLOR: Record<DealCategory, string> = {
  attraction: "#B5271D",
  food: "#D97706",
  transport: "#0891B2",
  experience: "#7C3AED",
};

function DealCard({ deal, index }: { deal: DealOption; index: number }) {
  const t = useTranslations("deals");
  const tr = useTranslations("recipients");
  const color = DEAL_CATEGORY_COLOR[deal.category];
  const params = useParams();
  const locale = typeof params?.locale === "string" ? params.locale : "en";
  const [loading, setLoading] = useState(false);
  const [pickingRecipients, setPickingRecipients] = useState(false);
  const { status } = useSession();
  const router = useRouter();

  function grab() {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=/${locale}/deals`);
      return;
    }
    // Passes are issued to named holders, so collect them before checkout.
    setPickingRecipients(true);
  }

  async function checkout(recipients: VoucherRecipient[]) {
    setPickingRecipients(false);
    setLoading(true);
    const total = deal.priceGEL * recipients.length;
    toast.success(`${deal.title} · ${total}₾`, { description: t("redirecting") });
    try {
      await payNow({
        purpose: "deal",
        targetId: deal.id,
        amount: total,
        desc: deal.title,
        locale,
        recipients,
      });
      // payNow redirects to Flitt on success; keep spinner until navigation.
    } catch (e) {
      setLoading(false);
      toast.error((e as Error).message);
    }
  }

  return (
    <motion.div
      className="group overflow-hidden rounded-2xl"
      style={{ background: "var(--site-bg-elevated)", border: "1px solid var(--site-border-06)" }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07 }}
      whileHover={{ y: -4, borderColor: "rgba(232,160,32,0.25)" }}
    >
      {deal.image && (
        <div className="relative overflow-hidden" style={{ aspectRatio: "16/10" }}>
          <Image
            src={deal.image}
            alt={deal.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div
            className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
            style={{ background: "#16A34A" }}
          >
            -{deal.discountPct}% {t("discount")}
          </div>
          <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white"
              style={{ background: color }}
            >
              {deal.category}
            </span>
            {deal.badge && (
              <span
                className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white"
                style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
              >
                {deal.badge}
              </span>
            )}
          </div>
        </div>
      )}
      <div className="p-5">
        <h3 className="font-display mb-1.5 text-lg" style={{ color: "var(--site-text)" }}>{deal.title}</h3>
        <p className="mb-4 line-clamp-2 text-[13px] leading-relaxed" style={{ color: "var(--site-text-50)" }}>
          {deal.description}
        </p>
        {deal.validUntil && (
          <p className="mb-3 flex items-center gap-1 text-[11px] uppercase tracking-[1px]" style={{ color: "var(--site-text-40)" }}>
            <Clock className="size-3" />
            {t("validUntil")} {deal.validUntil}
          </p>
        )}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] line-through" style={{ color: "var(--site-text-35)" }}>
              {deal.priceOriginal}₾
            </p>
            <p className="text-xl font-bold" style={{ color: "#E8A020" }}>
              {deal.priceGEL}<span className="ml-0.5 text-base">₾</span>
            </p>
          </div>
          <button
            onClick={grab}
            disabled={loading}
            className="rounded-full px-4 py-2 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60"
            style={{ background: "#B5271D", boxShadow: "0 4px 16px rgba(181,39,29,0.35)" }}
          >
            {loading ? "…" : t("grab")}
          </button>
        </div>
      </div>

      <RecipientsDialog
        open={pickingRecipients}
        onOpenChange={setPickingRecipients}
        unitPriceGEL={deal.priceGEL}
        onConfirm={checkout}
        labels={{
          title: tr("title"),
          description: tr("description"),
          firstName: tr("firstName"),
          lastName: tr("lastName"),
          isMinor: tr("isMinor"),
          age: tr("age"),
          addPerson: tr("addPerson"),
          remove: tr("remove"),
          passLabel: tr("passLabel"),
          cancel: tr("cancel"),
          confirm: tr("confirm"),
          total: tr("total"),
        }}
      />
    </motion.div>
  );
}

export function DealsGrid({ deals }: { deals: DealOption[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {deals.map((deal, i) => (
        <DealCard key={deal.id} deal={deal} index={i} />
      ))}
    </div>
  );
}
