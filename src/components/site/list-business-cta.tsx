"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter, Link } from "@/i18n/navigation";

/**
 * Adaptive call-to-action for the "List your business" landing page.
 *  - guest         → sign up
 *  - tourist       → one-click upgrade to a business account, then go to the form
 *  - business/admin→ straight to the new-listing form
 */
export function ListBusinessCTA() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const role = (session?.user as { role?: string } | undefined)?.role;
  const isBusiness = ["business", "admin", "superadmin"].includes(role ?? "");

  async function becomeBusiness() {
    setLoading(true);
    const res = await fetch("/api/business/upgrade", { method: "POST" });
    if (!res.ok) {
      setLoading(false);
      toast.error("Could not upgrade your account. Try again.");
      return;
    }
    // Refresh the JWT so the new business role is reflected immediately.
    await update();
    router.push("/business/listings/new" as any);
  }

  const btn =
    "inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-[15px] font-semibold text-primary-foreground shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60";

  if (status === "loading") {
    return (
      <button className={btn} disabled>
        <Loader2 className="size-4 animate-spin" /> Loading…
      </button>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Link href={"/register" as any} className={btn}>
          Get started <ArrowRight className="size-4" />
        </Link>
        <Link
          href={"/login" as any}
          className="text-sm font-medium underline-offset-4 hover:underline"
          style={{ color: "var(--site-text-65)" }}
        >
          Already have an account? Sign in
        </Link>
      </div>
    );
  }

  if (isBusiness) {
    return (
      <Link href={"/business/listings/new" as any} className={btn}>
        Create a listing <ArrowRight className="size-4" />
      </Link>
    );
  }

  // Logged-in tourist
  return (
    <button onClick={becomeBusiness} disabled={loading} className={btn}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      {loading ? "Setting up…" : "List my business"}
      {!loading && <ArrowRight className="size-4" />}
    </button>
  );
}
