import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/lib/models/user";
import { BusinessRequestModel } from "@/lib/models/business-request";
import { ProfileClient } from "./profile-client";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect({ href: "/login", locale });

  await connectDB();
  const userId = (session!.user as { id?: string }).id ?? "";
  // findById can throw CastError if token.id is not a valid ObjectId (edge case on first Google sign-in)
  const user = userId ? await UserModel.findById(userId).catch(() => null) : null;
  const bizRequest = userId
    ? await BusinessRequestModel.findOne({ userId }).lean().catch(() => null)
    : null;

  return (
    <ProfileClient
      name={session!.user.name ?? ""}
      email={session!.user.email ?? ""}
      avatarUrl={user?.avatar ?? session!.user.image ?? ""}
      role={(session!.user as { role?: string }).role ?? "tourist"}
      bizRequestStatus={bizRequest?.status ?? null}
      bizRejectionReason={bizRequest?.rejectionReason ?? null}
    />
  );
}
