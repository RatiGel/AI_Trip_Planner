import {
  BarChart3,
  CreditCard,
  Gift,
  Image,
  LayoutDashboard,
  List,
  MessageSquare,
} from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";

const NAV = [
  { href: "/business", label: "Overview", Icon: LayoutDashboard },
  { href: "/business/listings", label: "Listings", Icon: List },
  { href: "/business/reviews", label: "Reviews", Icon: MessageSquare },
  { href: "/business/deals", label: "Deals", Icon: Gift },
  { href: "/business/media", label: "Media", Icon: Image },
  { href: "/business/analytics", label: "Analytics", Icon: BarChart3 },
  { href: "/business/billing", label: "Billing", Icon: CreditCard },
];

const ALLOWED_ROLES = ["business", "admin"];

export default async function BusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!role || !ALLOWED_ROLES.includes(role)) {
    redirect({ href: "/", locale });
  }

  return <Shell>{children}</Shell>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="container mx-auto grid gap-6 px-4 pb-16 pt-[calc(72px+2rem)] md:grid-cols-[240px_1fr]">
      <aside className="hidden md:block">
        <nav className="sticky top-[88px] space-y-1 rounded-2xl border border-border bg-card p-2 shadow-sm">
          <p className="px-3 pt-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Business
          </p>
          {NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon className="size-4 shrink-0 transition-transform group-hover:scale-110" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <section className="min-w-0">{children}</section>
    </div>
  );
}
