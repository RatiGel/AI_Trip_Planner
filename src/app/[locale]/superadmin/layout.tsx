import {
  BarChart3,
  Building2,
  Flag,
  LayoutDashboard,
  Shield,
  Users,
} from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";

const NAV = [
  { href: "/superadmin", label: "Overview", Icon: LayoutDashboard },
  { href: "/superadmin/users", label: "Users", Icon: Users },
  { href: "/superadmin/businesses", label: "Businesses", Icon: Building2 },
  { href: "/superadmin/content", label: "Content", Icon: Flag },
  { href: "/superadmin/reports", label: "Reports", Icon: BarChart3 },
  { href: "/superadmin/security", label: "Security", Icon: Shield },
];

export default async function SuperAdminLayout({
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
  if (role !== "superadmin") {
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
            Super Admin
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
