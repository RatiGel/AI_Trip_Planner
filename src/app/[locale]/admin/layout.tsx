import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminBreadcrumbs } from "@/components/admin/breadcrumbs";

const ALLOWED_ROLES = ["admin", "superadmin"];

export default async function AdminLayout({
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

  return (
    <div className="container mx-auto flex gap-6 px-4 py-8">
      <AdminSidebar />
      <section className="min-w-0 flex-1">
        <AdminBreadcrumbs />
        {children}
      </section>
    </div>
  );
}
