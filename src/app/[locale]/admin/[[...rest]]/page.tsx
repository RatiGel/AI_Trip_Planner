import { redirect } from "@/i18n/navigation";

export default async function LegacyAdminRedirect({
  params,
}: {
  params: Promise<{ locale: string; rest?: string[] }>;
}) {
  const { locale, rest } = await params;
  const suffix = rest?.length ? `/${rest.join("/")}` : "";
  redirect({ href: `/superadmin${suffix}`, locale });
}
