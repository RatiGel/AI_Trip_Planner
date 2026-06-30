import { setRequestLocale } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/lib/models/user";
import { UsersTable } from "@/components/admin/users-table";

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await connectDB();
  const docs = await UserModel.find()
    .select("name email role suspended warnings createdAt")
    .sort({ createdAt: -1 })
    .lean();

  const users = docs.map((u: any) => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: u.role ?? "tourist",
    suspended: u.suspended ?? false,
    warnings: u.warnings ?? 0,
    createdAt: (u.createdAt as Date).toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">{users.length} registered users</p>
      </div>
      <UsersTable users={users} />
    </div>
  );
}
