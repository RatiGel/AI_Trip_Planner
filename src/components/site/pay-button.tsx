"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { payNow } from "@/lib/pay";
import type { PaymentPurpose } from "@/lib/models/payment";

interface PayButtonProps {
  purpose: PaymentPurpose;
  targetId: string;
  serviceId?: string;
  label: string;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}

export function PayButton({ purpose, targetId, serviceId, label, className, variant, size }: PayButtonProps) {
  const params = useParams();
  const locale = typeof params?.locale === "string" ? params.locale : "en";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      await payNow({ purpose, targetId, serviceId, locale });
      // payNow redirects on success; keep spinner until navigation.
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button onClick={handleClick} disabled={loading} className={className} variant={variant} size={size}>
        {loading ? "…" : label}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
