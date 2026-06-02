# Admin Dashboard + Role-Based Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `role` field to users, gate `/admin` to admin-only, and build Users CRUD + Media CRUD admin pages.

**Architecture:** Role stored in MongoDB, passed through NextAuth JWT into session. Admin layout server component checks `session.user.role === 'admin'` and redirects non-admins to `/`. Two new admin pages backed by dedicated API routes — users via MongoDB, media via Cloudinary Admin API.

**Tech Stack:** Next.js 16, React 19, MongoDB/Mongoose, NextAuth v5, Cloudinary SDK, Tailwind v4, shadcn/ui, TypeScript

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Install | `cloudinary` npm package | Cloudinary SDK |
| Create | `src/lib/cloudinary.ts` | Sign, list, destroy helpers (server-only) |
| Modify | `src/lib/models/user.ts` | Add `role` field |
| Modify | `src/lib/auth.ts` | Pass `role` through JWT → session |
| Create | `src/types/next-auth.d.ts` | Extend Session + JWT types |
| Modify | `src/app/[locale]/admin/layout.tsx` | Auth gate + Users/Media nav links |
| Modify | `messages/en.json` + `ka.json` + `ru.json` | Add `admin.media` translation key |
| Create | `src/app/api/admin/users/route.ts` | GET all users |
| Create | `src/app/api/admin/users/[id]/route.ts` | PATCH + DELETE user |
| Create | `src/components/admin/users-table.tsx` | Inline-edit users table |
| Create | `src/app/[locale]/admin/users/page.tsx` | Users admin page |
| Create | `src/app/api/admin/media/route.ts` | GET list + DELETE Cloudinary asset |
| Create | `src/components/admin/media-grid.tsx` | Media grid with delete |
| Create | `src/app/[locale]/admin/media/page.tsx` | Media admin page |

---

## Task 1: Install Cloudinary SDK

**Files:** `package.json`

- [ ] **Step 1: Install**

```powershell
cd "c:\Users\Nini\Desktop\AI trip planner\AI_Trip_Planner\AI_Trip_Planner"
npm install cloudinary
```

Expected: `added N packages` with no errors.

- [ ] **Step 2: Commit**

```powershell
git add package.json package-lock.json
git commit -m "chore: install cloudinary sdk"
```

---

## Task 2: Create `src/lib/cloudinary.ts`

**Files:**
- Create: `src/lib/cloudinary.ts`

- [ ] **Step 1: Write the file**

```ts
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export function signUploadParams(folder: string) {
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = { timestamp, folder };
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!
  );
  return {
    signature,
    timestamp,
    folder,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
  };
}

export interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  resource_type: "image" | "video" | "raw";
  format: string;
  bytes: number;
  created_at: string;
  width?: number;
  height?: number;
}

export async function listResources(prefix = "trip-planner"): Promise<CloudinaryResource[]> {
  const [imageResult, videoResult] = await Promise.all([
    cloudinary.api.resources({ type: "upload", prefix, max_results: 500, resource_type: "image" }),
    cloudinary.api.resources({ type: "upload", prefix, max_results: 500, resource_type: "video" }),
  ]);
  return [...imageResult.resources, ...videoResult.resources] as CloudinaryResource[];
}

export async function destroyResource(
  publicId: string,
  resourceType: "image" | "video" = "image"
) {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/lib/cloudinary.ts
git commit -m "feat: add cloudinary helpers (sign, list, destroy)"
```

---

## Task 3: Add `role` to UserModel

**Files:**
- Modify: `src/lib/models/user.ts`

- [ ] **Step 1: Update interface and schema**

Replace the entire file content with:

```ts
import mongoose, { Schema, model, models } from "mongoose";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  avatar?: string;
  role: "user" | "admin";
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: false },
    avatar: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true }
);

export const UserModel = models.User ?? model<IUser>("User", UserSchema);
```

- [ ] **Step 2: Commit**

```powershell
git add src/lib/models/user.ts
git commit -m "feat: add role and avatar fields to UserModel"
```

---

## Task 4: Extend NextAuth types

**Files:**
- Create: `src/types/next-auth.d.ts`

- [ ] **Step 1: Create type declaration file**

```ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      role?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/types/next-auth.d.ts
git commit -m "feat: extend next-auth session and jwt types with id and role"
```

---

## Task 5: Pass `role` through NextAuth JWT and session

**Files:**
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Update jwt and session callbacks**

Replace the `callbacks` block in `src/lib/auth.ts` with:

```ts
callbacks: {
  async signIn({ user, account }) {
    if (account?.provider === "google") {
      await connectDB();
      const existing = await UserModel.findOne({ email: user.email });
      if (!existing) {
        await UserModel.create({ name: user.name, email: user.email, role: "user" });
      }
    }
    return true;
  },
  async jwt({ token, user }) {
    if (user) {
      await connectDB();
      const dbUser = await UserModel.findOne({ email: user.email }).lean();
      if (dbUser) {
        token.id = dbUser._id.toString();
        token.role = dbUser.role ?? "user";
      } else {
        token.id = user.id;
        token.role = "user";
      }
    }
    return token;
  },
  session({ session, token }) {
    if (token.id) session.user.id = token.id as string;
    if (token.role) session.user.role = token.role as string;
    return session;
  },
},
```

- [ ] **Step 2: Verify build**

```powershell
npm run build 2>&1 | Select-Object -Last 15
```

Expected: no TypeScript errors related to auth.

- [ ] **Step 3: Commit**

```powershell
git add src/lib/auth.ts
git commit -m "feat: pass role through jwt and session callbacks"
```

---

## Task 6: Add `media` i18n key to all message files

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ka.json`
- Modify: `messages/ru.json`

- [ ] **Step 1: Add to en.json**

In `messages/en.json`, find the `"admin"` object and add `"media": "Media"` after `"users": "Users"`:

```json
"admin": {
  "title": "Admin",
  "dashboard": "Dashboard",
  "cities": "Cities",
  "places": "Places",
  "categories": "Categories",
  "reservations": "Reservations",
  "ticketOrders": "Ticket orders",
  "users": "Users",
  "media": "Media",
  "newPlace": "New place",
  "newCity": "New city",
  "save": "Save",
  "cancel": "Cancel",
  "delete": "Delete",
  "edit": "Edit"
}
```

- [ ] **Step 2: Add to ka.json**

In `messages/ka.json`, find the `"admin"` object and add `"media": "მედია"` after the `"users"` key.

- [ ] **Step 3: Add to ru.json**

In `messages/ru.json`, find the `"admin"` object and add `"media": "Медиа"` after the `"users"` key.

- [ ] **Step 4: Commit**

```powershell
git add messages/
git commit -m "feat: add admin.media i18n key"
```

---

## Task 7: Gate admin layout + add nav links

**Files:**
- Modify: `src/app/[locale]/admin/layout.tsx`

- [ ] **Step 1: Replace layout file**

```tsx
import {
  Building2,
  CalendarCheck,
  Image,
  LayoutDashboard,
  MapPin,
  Receipt,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";

const NAV = [
  { href: "/admin", labelKey: "dashboard" as const, Icon: LayoutDashboard },
  { href: "/admin/places", labelKey: "places" as const, Icon: MapPin },
  { href: "/admin/cities", labelKey: "cities" as const, Icon: Building2 },
  { href: "/admin/reservations", labelKey: "reservations" as const, Icon: CalendarCheck },
  { href: "/admin/orders", labelKey: "ticketOrders" as const, Icon: Receipt },
  { href: "/admin/users", labelKey: "users" as const, Icon: Users },
  { href: "/admin/media", labelKey: "media" as const, Icon: Image },
];

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
  if (!session?.user || (session.user as { role?: string }).role !== "admin") {
    redirect({ href: "/", locale });
  }

  return <Shell>{children}</Shell>;
}

function Shell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("admin");
  return (
    <div className="container mx-auto grid gap-6 px-4 py-8 md:grid-cols-[220px_1fr]">
      <aside className="hidden md:block">
        <div className="sticky top-20 space-y-1 rounded-2xl border border-border bg-card p-2">
          <p className="px-3 pt-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("title")}
          </p>
          {NAV.map(({ href, labelKey, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Icon className="size-4" /> {t(labelKey)}
            </Link>
          ))}
        </div>
      </aside>
      <section>{children}</section>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/app/[locale]/admin/layout.tsx
git commit -m "feat: gate admin layout to admin role, add users+media nav"
```

---

## Task 8: Admin users API routes

**Files:**
- Create: `src/app/api/admin/users/route.ts`
- Create: `src/app/api/admin/users/[id]/route.ts`

- [ ] **Step 1: Create GET route for listing users**

`src/app/api/admin/users/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/lib/models/user";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "admin") {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return Response.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const users = await UserModel.find()
    .select("name email role createdAt avatar")
    .sort({ createdAt: -1 })
    .lean();

  return Response.json(
    users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role ?? "user",
      createdAt: u.createdAt,
      avatar: u.avatar ?? null,
    }))
  );
}
```

- [ ] **Step 2: Create PATCH + DELETE route for individual user**

`src/app/api/admin/users/[id]/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/lib/models/user";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "admin") {
    return null;
  }
  return session;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { name, email, role } = body as { name?: string; email?: string; role?: string };

  await connectDB();

  const existing = await UserModel.findOne({ email, _id: { $ne: id } });
  if (existing) {
    return Response.json({ error: "Email already in use" }, { status: 409 });
  }

  const updated = await UserModel.findByIdAndUpdate(
    id,
    { ...(name && { name }), ...(email && { email }), ...(role && { role }) },
    { new: true }
  ).lean();

  if (!updated) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({
    id: updated._id.toString(),
    name: updated.name,
    email: updated.email,
    role: updated.role ?? "user",
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const adminId = (session.user as { id?: string }).id;

  if (id === adminId) {
    return Response.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  await connectDB();
  const deleted = await UserModel.findByIdAndDelete(id);
  if (!deleted) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```powershell
git add src/app/api/admin/users/
git commit -m "feat: add admin users API routes (GET, PATCH, DELETE)"
```

---

## Task 9: UsersTable component

**Files:**
- Create: `src/components/admin/users-table.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface EditState {
  name: string;
  email: string;
  role: string;
}

export function UsersTable({ users: initial }: { users: AdminUser[] }) {
  const [users, setUsers] = useState(initial);
  const [editId, setEditId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ name: "", email: "", role: "user" });
  const [loading, setLoading] = useState(false);

  function startEdit(user: AdminUser) {
    setEditId(user.id);
    setEditState({ name: user.name, email: user.email, role: user.role });
  }

  function cancelEdit() {
    setEditId(null);
  }

  async function saveEdit(id: string) {
    setLoading(true);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editState),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Failed to update user");
      return;
    }

    const updated = await res.json();
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updated } : u)));
    setEditId(null);
    toast.success("User updated");
  }

  async function deleteUser(id: string, name: string) {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;

    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Failed to delete user");
      return;
    }

    setUsers((prev) => prev.filter((u) => u.id !== id));
    toast.success("User deleted");
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) =>
            editId === user.id ? (
              <TableRow key={user.id}>
                <TableCell>
                  <Input
                    value={editState.name}
                    onChange={(e) => setEditState((s) => ({ ...s, name: e.target.value }))}
                    className="h-8 w-40"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={editState.email}
                    onChange={(e) => setEditState((s) => ({ ...s, email: e.target.value }))}
                    className="h-8 w-48"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={editState.role}
                    onValueChange={(v) => setEditState((s) => ({ ...s, role: v }))}
                  >
                    <SelectTrigger className="h-8 w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">user</SelectItem>
                      <SelectItem value="admin">admin</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" onClick={() => saveEdit(user.id)} disabled={loading}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={loading}>
                    Cancel
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => startEdit(user)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteUser(user.id, user.name)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            )
          )}
          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No users found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/components/admin/users-table.tsx
git commit -m "feat: add UsersTable admin component"
```

---

## Task 10: Admin users page

**Files:**
- Create: `src/app/[locale]/admin/users/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
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
    .select("name email role createdAt avatar")
    .sort({ createdAt: -1 })
    .lean();

  const users = docs.map((u) => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: u.role ?? "user",
    createdAt: (u.createdAt as Date).toISOString(),
    avatar: u.avatar ?? null,
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
```

- [ ] **Step 2: Commit**

```powershell
git add src/app/[locale]/admin/users/
git commit -m "feat: add admin users page"
```

---

## Task 11: Admin media API route

**Files:**
- Create: `src/app/api/admin/media/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { auth } from "@/lib/auth";
import { listResources, destroyResource } from "@/lib/cloudinary";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "admin") {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return Response.json({ error: "Forbidden" }, { status: 403 });

  const resources = await listResources("trip-planner");
  return Response.json(resources);
}

export async function DELETE(req: Request) {
  const session = await requireAdmin();
  if (!session) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { publicId, resourceType } = await req.json() as {
    publicId: string;
    resourceType?: "image" | "video";
  };

  if (!publicId) return Response.json({ error: "publicId required" }, { status: 400 });

  const result = await destroyResource(publicId, resourceType ?? "image");
  if (result.result !== "ok" && result.result !== "not found") {
    return Response.json({ error: "Cloudinary delete failed" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/app/api/admin/media/route.ts
git commit -m "feat: add admin media API route (GET list, DELETE)"
```

---

## Task 12: MediaGrid component

**Files:**
- Create: `src/components/admin/media-grid.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CloudinaryResource } from "@/lib/cloudinary";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaGrid({ resources: initial }: { resources: CloudinaryResource[] }) {
  const [resources, setResources] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function deleteResource(publicId: string, resourceType: "image" | "video") {
    if (!confirm(`Delete this file? This cannot be undone.`)) return;

    setDeleting(publicId);
    const res = await fetch("/api/admin/media", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId, resourceType }),
    });
    setDeleting(null);

    if (!res.ok) {
      toast.error("Failed to delete file");
      return;
    }

    setResources((prev) => prev.filter((r) => r.public_id !== publicId));
    toast.success("File deleted");
  }

  if (resources.length === 0) {
    return (
      <p className="py-16 text-center text-muted-foreground">No media files uploaded yet.</p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {resources.map((r) => (
        <div
          key={r.public_id}
          className="group relative overflow-hidden rounded-xl border border-border bg-card"
        >
          {r.resource_type === "image" ? (
            <img
              src={r.secure_url}
              alt={r.public_id}
              className="aspect-square w-full object-cover"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center bg-muted">
              <Video className="size-10 text-muted-foreground" />
            </div>
          )}

          <div className="p-2 space-y-1">
            <p className="truncate text-xs font-medium" title={r.public_id}>
              {r.public_id.split("/").pop()}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(r.bytes)} · {new Date(r.created_at).toLocaleDateString()}
            </p>
          </div>

          <Button
            size="icon"
            variant="destructive"
            className="absolute right-2 top-2 size-7 opacity-0 group-hover:opacity-100 transition-opacity"
            disabled={deleting === r.public_id}
            onClick={() => deleteResource(r.public_id, r.resource_type as "image" | "video")}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/components/admin/media-grid.tsx
git commit -m "feat: add MediaGrid admin component"
```

---

## Task 13: Admin media page

**Files:**
- Create: `src/app/[locale]/admin/media/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
import { setRequestLocale } from "next-intl/server";
import { listResources } from "@/lib/cloudinary";
import { MediaGrid } from "@/components/admin/media-grid";

export default async function AdminMediaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const resources = await listResources("trip-planner");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Media</h1>
        <p className="text-sm text-muted-foreground">{resources.length} files in Cloudinary</p>
      </div>
      <MediaGrid resources={resources} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/app/[locale]/admin/media/
git commit -m "feat: add admin media page"
```

---

## Task 14: Final verification

- [ ] **Step 1: Run dev server**

```powershell
npm run dev
```

- [ ] **Step 2: Verify non-admin redirect**

Sign in as `test@gmail.com` / `test1234`. Go to `http://localhost:3000/admin`. Should redirect to home (`/en`).

- [ ] **Step 3: Promote test user to admin in MongoDB**

In MongoDB Atlas (or Compass), find the user with email `test@gmail.com` and set `role: "admin"`. Then sign out and sign back in (JWT must refresh).

- [ ] **Step 4: Verify admin access**

After signing back in, go to `/admin`. Should show sidebar with Users and Media links.

- [ ] **Step 5: Test Users page**

Go to `/admin/users`. Should list all users. Click Edit on a user → inputs appear. Change role to `admin` → Save. Expect toast "User updated".

- [ ] **Step 6: Test Media page**

Go to `/admin/media`. Should show grid (empty if no uploads yet — "No media files uploaded yet."). Hover a card → delete button appears. Click → confirm → card removed.

- [ ] **Step 7: Test 403 on API**

Sign out. In browser console:

```js
fetch("/api/admin/users").then(r => console.log(r.status))
```

Expected: `403`
