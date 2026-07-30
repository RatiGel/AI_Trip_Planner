import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getActor, canAccessStaffPanel } from "@/lib/permissions";
import { SuperadminSidebar } from "@/components/superadmin/sidebar";
import { AdminBreadcrumbs } from "@/components/admin/breadcrumbs";

export default async function SuperAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await getActor();
  if (!canAccessStaffPanel(actor)) {
    redirect({ href: "/", locale });
  }

  return (
    <div className="container mx-auto flex gap-6 px-4 py-8">
      <SuperadminSidebar />
      <section className="min-w-0 flex-1">
        <AdminBreadcrumbs />
        {children}
      </section>
    </div>
  );
}
