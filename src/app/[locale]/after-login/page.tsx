import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getActor, postLoginPath } from "@/lib/permissions";

/**
 * Neutral landing route for OAuth sign-in (e.g. Google), which redirects
 * before any client code can inspect the session's role. This route reads
 * the freshly-created session server-side and bounces to the correct
 * role-based destination. It renders nothing.
 */
export default async function AfterLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await getActor();
  redirect({ href: postLoginPath(actor?.role), locale });
}
