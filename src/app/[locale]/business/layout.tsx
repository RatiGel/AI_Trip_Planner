import {
  BarChart3,
  CreditCard,
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
  { href: "/business/media", label: "Media", Icon: Image },
  { href: "/business/analytics", label: "Analytics", Icon: BarChart3 },
  { href: "/business/billing", label: "Billing", Icon: CreditCard },
];

const ALLOWED_ROLES = ["business", "admin", "superadmin"];

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
    <div className="container mx-auto grid gap-6 px-4 py-8 md:grid-cols-[220px_1fr]">
      <aside className="hidden md:block">
        <div className="sticky top-20 space-y-1 rounded-2xl border border-border bg-card p-2">
          <p className="px-3 pt-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Business
          </p>
          {NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Icon className="size-4" /> {label}
            </Link>
          ))}
        </div>
      </aside>
      <section>{children}</section>
    </div>
  );
}
