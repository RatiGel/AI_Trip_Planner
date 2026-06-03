import { setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    description: "Up to 2 listings, basic analytics",
    features: ["2 listings", "Basic analytics", "Review replies", "Standard support"],
    current: true,
  },
  {
    name: "Pro",
    price: "$29/mo",
    description: "Unlimited listings, advanced analytics, featured placements",
    features: ["Unlimited listings", "Advanced analytics", "Featured placements", "Priority support", "Promotional offers"],
    current: false,
  },
];

export default async function BusinessBillingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">Manage your subscription plan</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 max-w-2xl">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-2xl border p-6 space-y-4 ${
              plan.current ? "border-primary bg-primary/5" : "border-border bg-card"
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{plan.name}</h2>
              {plan.current && <Badge>Current plan</Badge>}
            </div>
            <p className="text-2xl font-bold">{plan.price}</p>
            <p className="text-sm text-muted-foreground">{plan.description}</p>
            <ul className="space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="size-4 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            {!plan.current && (
              <Button className="w-full" disabled>
                Upgrade (coming soon)
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
