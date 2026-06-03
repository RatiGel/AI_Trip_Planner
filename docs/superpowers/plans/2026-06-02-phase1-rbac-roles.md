# Phase 1: RBAC + Roles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the user role system from `user/admin` to `tourist/business/admin/superadmin`, gate all three dashboard route groups, and update the site header to show role-adaptive navigation links.

**Architecture:** Role stored in MongoDB `UserModel`, read on every sign-in and injected into the NextAuth JWT token. Each dashboard layout (`/admin`, `/business`, `/superadmin`) is a server component that calls `auth()` and redirects on role mismatch. The site header reads `session.user.role` client-side via `useSession()` to show relevant nav links.

**Tech Stack:** Next.js 16, MongoDB/Mongoose, NextAuth v5, Tailwind v4, shadcn/ui, TypeScript

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `src/lib/models/user.ts` | Expand role enum, add `suspended` field |
| Modify | `src/lib/auth.ts` | Pass role through JWT/session |
| Modify | `src/types/next-auth.d.ts` | Extend Session + JWT types (create if missing) |
| Modify | `src/app/[locale]/admin/layout.tsx` | Gate to `admin \| superadmin` |
| Create | `src/app/[locale]/business/layout.tsx` | Gate to `business \| admin \| superadmin` |
| Create | `src/app/[locale]/business/page.tsx` | Business dashboard placeholder |
| Create | `src/app/[locale]/superadmin/layout.tsx` | Gate to `superadmin` only |
| Create | `src/app/[locale]/superadmin/page.tsx` | Super admin dashboard placeholder |
| Create | `src/lib/models/business-request.ts` | Business upgrade request model |
| Create | `src/app/api/business-request/route.ts` | POST submit upgrade request |
| Create | `src/app/[locale]/profile/page.tsx` | Profile page with upgrade CTA |
| Create | `src/app/[locale]/profile/profile-client.tsx` | Client profile component |
| Modify | `src/components/site/site-header.tsx` | Role-adaptive nav links |
| Modify | `scripts/make-admin.ts` | Set `superadmin` instead of `admin` |
| Modify | `messages/en.json` | Add nav.business, nav.superadmin, nav.planner keys |
| Modify | `messages/ka.json` | Same keys in Georgian |
| Modify | `messages/ru.json` | Same keys in Russian |

---

## Task 1: Expand UserModel role enum + add suspended

**Files:**
- Modify: `src/lib/models/user.ts`

- [ ] **Step 1: Replace file content**

```ts
import mongoose, { Schema, model, models } from "mongoose";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  avatar?: string;
  role: "tourist" | "business" | "admin" | "superadmin";
  suspended: boolean;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: false },
    avatar: { type: String },
    role: {
      type: String,
      enum: ["tourist", "business", "admin", "superadmin"],
      default: "tourist",
    },
    suspended: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const UserModel = models.User ?? model<IUser>("User", UserSchema);
```

- [ ] **Step 2: Update make-admin script to use `superadmin`**

In `scripts/make-admin.ts`, change the `$set` value:

```ts
{ $set: { role: "superadmin" } }
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/models/user.ts scripts/make-admin.ts
git commit -m "feat: expand user role enum to tourist/business/admin/superadmin"
```

---

## Task 2: Create `src/types/next-auth.d.ts`

**Files:**
- Create: `src/types/next-auth.d.ts`

- [ ] **Step 1: Write type declarations**

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

```bash
git add src/types/next-auth.d.ts
git commit -m "feat: extend next-auth session and jwt types"
```

---

## Task 3: Update `auth.ts` to pass role through JWT/session

**Files:**
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Replace callbacks block**

Replace the entire `callbacks` object in `src/lib/auth.ts` with:

```ts
callbacks: {
  async signIn({ user, account }) {
    if (account?.provider === "google") {
      await connectDB();
      const existing = await UserModel.findOne({ email: user.email });
      if (!existing) {
        await UserModel.create({
          name: user.name,
          email: user.email,
          role: "tourist",
          suspended: false,
        });
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
        token.role = dbUser.role ?? "tourist";
      } else {
        token.id = user.id;
        token.role = "tourist";
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

```bash
npm run build 2>&1 | tail -15
```

Expected: no TypeScript errors in auth.ts or session types.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: pass role through jwt and session callbacks"
```

---

## Task 4: Add i18n keys to all three message files

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ka.json`
- Modify: `messages/ru.json`

- [ ] **Step 1: Update `messages/en.json`**

In the `"nav"` object, add these keys:

```json
"planner": "AI Planner",
"myBusiness": "My Business",
"superadmin": "Super Admin"
```

Full updated `"nav"` object:

```json
"nav": {
  "home": "Home",
  "cities": "Cities",
  "map": "Map",
  "chat": "AI Planner",
  "trips": "My Trips",
  "tickets": "Tickets",
  "admin": "Admin",
  "login": "Sign in",
  "register": "Sign up",
  "logout": "Sign out",
  "language": "Language",
  "planner": "AI Planner",
  "myBusiness": "My Business",
  "superadmin": "Super Admin"
}
```

- [ ] **Step 2: Update `messages/ka.json`**

Add to the `"nav"` object:

```json
"planner": "AI დამგეგმავი",
"myBusiness": "ჩემი ბიზნესი",
"superadmin": "სუპერ ადმინი"
```

- [ ] **Step 3: Update `messages/ru.json`**

Add to the `"nav"` object:

```json
"planner": "AI Планировщик",
"myBusiness": "Мой бизнес",
"superadmin": "Суперадмин"
```

- [ ] **Step 4: Commit**

```bash
git add messages/
git commit -m "feat: add nav i18n keys for planner, myBusiness, superadmin"
```

---

## Task 5: Create `BusinessRequestModel`

**Files:**
- Create: `src/lib/models/business-request.ts`

- [ ] **Step 1: Write the model**

```ts
import mongoose, { Schema, model, models } from "mongoose";

export interface IBusinessRequest {
  _id: mongoose.Types.ObjectId;
  userId: string;
  businessName: string;
  businessType: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  createdAt: Date;
}

const BusinessRequestSchema = new Schema<IBusinessRequest>(
  {
    userId: { type: String, required: true, unique: true },
    businessName: { type: String, required: true },
    businessType: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

export const BusinessRequestModel =
  models.BusinessRequest ??
  model<IBusinessRequest>("BusinessRequest", BusinessRequestSchema);
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/models/business-request.ts
git commit -m "feat: add BusinessRequestModel"
```

---

## Task 6: Create business upgrade request API route

**Files:**
- Create: `src/app/api/business-request/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { BusinessRequestModel } from "@/lib/models/business-request";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id!;
  const { businessName, businessType, description } = await req.json();

  if (!businessName || !businessType || !description) {
    return Response.json({ error: "All fields required" }, { status: 400 });
  }

  await connectDB();

  const existing = await BusinessRequestModel.findOne({ userId });
  if (existing) {
    return Response.json(
      { error: "You already have a pending or approved request" },
      { status: 409 }
    );
  }

  const request = await BusinessRequestModel.create({
    userId,
    businessName,
    businessType,
    description,
  });

  return Response.json({ id: request._id.toString(), status: request.status });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id!;
  await connectDB();

  const request = await BusinessRequestModel.findOne({ userId }).lean();
  if (!request) return Response.json(null);

  return Response.json({
    id: request._id.toString(),
    status: request.status,
    rejectionReason: request.rejectionReason ?? null,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/business-request/route.ts
git commit -m "feat: add business upgrade request API route"
```

---

## Task 7: Create Profile page with business upgrade CTA

**Files:**
- Create: `src/app/[locale]/profile/page.tsx`
- Create: `src/app/[locale]/profile/profile-client.tsx`

- [ ] **Step 1: Write `profile/page.tsx`**

```tsx
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
  const userId = (session!.user as { id?: string }).id!;
  const user = await UserModel.findById(userId).lean();
  const bizRequest = await BusinessRequestModel.findOne({ userId }).lean();

  return (
    <ProfileClient
      name={session!.user.name ?? ""}
      email={session!.user.email ?? ""}
      avatar={user?.avatar ?? session!.user.image ?? ""}
      role={(session!.user as { role?: string }).role ?? "tourist"}
      bizRequestStatus={bizRequest?.status ?? null}
      bizRejectionReason={bizRequest?.rejectionReason ?? null}
    />
  );
}
```

- [ ] **Step 2: Write `profile/profile-client.tsx`**

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  name: string;
  email: string;
  avatar: string;
  role: string;
  bizRequestStatus: "pending" | "approved" | "rejected" | null;
  bizRejectionReason: string | null;
}

export function ProfileClient({
  name,
  email,
  role,
  bizRequestStatus,
  bizRejectionReason,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    businessName: "",
    businessType: "",
    description: "",
  });

  async function submitRequest() {
    if (!form.businessName || !form.businessType || !form.description) {
      toast.error("All fields are required");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/business-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (res.ok) {
      toast.success("Request submitted! An admin will review it shortly.");
      setShowForm(false);
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Failed to submit request");
    }
  }

  return (
    <div className="container mx-auto max-w-lg px-4 py-16">
      <h1 className="mb-8 text-2xl font-semibold">Profile</h1>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <p className="text-sm text-muted-foreground">Name</p>
          <p className="font-medium">{name}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="font-medium">{email}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Role</p>
          <Badge variant={role === "tourist" ? "secondary" : "default"}>
            {role}
          </Badge>
        </div>
      </div>

      {role === "tourist" && (
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 space-y-4">
          <div>
            <h2 className="font-semibold">Become a Business Owner</h2>
            <p className="text-sm text-muted-foreground mt-1">
              List your restaurant, cafe, hotel, or tour service on the platform.
            </p>
          </div>

          {bizRequestStatus === "pending" && (
            <Badge variant="secondary">Request pending review</Badge>
          )}

          {bizRequestStatus === "rejected" && (
            <div className="space-y-2">
              <Badge variant="destructive">Request rejected</Badge>
              {bizRejectionReason && (
                <p className="text-sm text-muted-foreground">
                  Reason: {bizRejectionReason}
                </p>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
                Apply again
              </Button>
            </div>
          )}

          {!bizRequestStatus && !showForm && (
            <Button onClick={() => setShowForm(true)}>Apply now</Button>
          )}

          {showForm && !bizRequestStatus && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Business name</Label>
                <Input
                  value={form.businessName}
                  onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                  placeholder="e.g. Café Leila"
                />
              </div>
              <div className="space-y-2">
                <Label>Business type</Label>
                <Select
                  value={form.businessType}
                  onValueChange={(v) => setForm((f) => ({ ...f, businessType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="cafe">Café</SelectItem>
                    <SelectItem value="hotel">Hotel</SelectItem>
                    <SelectItem value="tour">Tour operator</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Tell us about your business"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={submitRequest} disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit request"}
                </Button>
                <Button variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/profile/
git commit -m "feat: add profile page with business upgrade request form"
```

---

## Task 8: Gate admin layout to `admin | superadmin`

**Files:**
- Modify: `src/app/[locale]/admin/layout.tsx`

- [ ] **Step 1: Replace file content**

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

```bash
git add src/app/[locale]/admin/layout.tsx
git commit -m "feat: gate admin layout to admin|superadmin roles"
```

---

## Task 9: Create business dashboard layout + placeholder

**Files:**
- Create: `src/app/[locale]/business/layout.tsx`
- Create: `src/app/[locale]/business/page.tsx`

- [ ] **Step 1: Write `business/layout.tsx`**

```tsx
import {
  BarChart3,
  CreditCard,
  Image,
  LayoutDashboard,
  List,
  MessageSquare,
} from "lucide-react";
import { useTranslations } from "next-intl";
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
```

- [ ] **Step 2: Write `business/page.tsx`**

```tsx
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Business Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {session?.user?.name}. Manage your listings and analytics here.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {["Total Views", "Active Listings", "Avg Rating"].map((label) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold">—</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Full analytics available in Phase 2.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/business/
git commit -m "feat: add business dashboard layout and placeholder page"
```

---

## Task 10: Create superadmin layout + placeholder

**Files:**
- Create: `src/app/[locale]/superadmin/layout.tsx`
- Create: `src/app/[locale]/superadmin/page.tsx`

- [ ] **Step 1: Write `superadmin/layout.tsx`**

```tsx
import {
  BarChart3,
  Building2,
  Flag,
  LayoutDashboard,
  Shield,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
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
```

- [ ] **Step 2: Write `superadmin/page.tsx`**

```tsx
import { setRequestLocale } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/lib/models/user";
import { BusinessRequestModel } from "@/lib/models/business-request";

export default async function SuperAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await connectDB();
  const [totalUsers, pendingRequests] = await Promise.all([
    UserModel.countDocuments(),
    BusinessRequestModel.countDocuments({ status: "pending" }),
  ]);

  const stats = [
    { label: "Total Users", value: totalUsers },
    { label: "Pending Business Requests", value: pendingRequests },
    { label: "Active Listings", value: "—" },
    { label: "Revenue", value: "—" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Platform Overview</h1>
        <p className="text-sm text-muted-foreground">Super admin control panel</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/superadmin/
git commit -m "feat: add superadmin layout and overview page"
```

---

## Task 11: Update site header with role-adaptive nav

**Files:**
- Modify: `src/components/site/site-header.tsx`

- [ ] **Step 1: Add role-based links to the right actions section**

In `site-header.tsx`, find the `{session?.user ? (` block (around line 167) and replace the entire authenticated user section:

```tsx
{session?.user ? (
  <div className="hidden items-center gap-2 md:flex">
    {/* Role-based dashboard links */}
    {(session.user as { role?: string }).role === "business" && (
      <Link
        href="/business"
        className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition-all hover:-translate-y-0.5"
        style={{ border: "1px solid var(--site-border-20)", color: "var(--site-text-80)" }}
      >
        {tNav("myBusiness")}
      </Link>
    )}
    {(["admin", "superadmin"] as string[]).includes(
      (session.user as { role?: string }).role ?? ""
    ) && (
      <Link
        href="/admin"
        className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition-all hover:-translate-y-0.5"
        style={{ border: "1px solid var(--site-border-20)", color: "var(--site-text-80)" }}
      >
        {tNav("admin")}
      </Link>
    )}
    {(session.user as { role?: string }).role === "superadmin" && (
      <Link
        href="/superadmin"
        className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition-all hover:-translate-y-0.5"
        style={{ border: "1px solid var(--site-border-20)", color: "var(--site-text-80)" }}
      >
        {tNav("superadmin")}
      </Link>
    )}
    <span className="flex items-center gap-1.5 text-[13px]" style={{ color: "var(--site-text-50)" }}>
      <User className="size-3.5" />
      {session.user.name ?? session.user.email}
    </span>
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-md px-3 py-1.5 text-[13px] transition-colors"
      style={{ color: "var(--site-text-50)" }}
    >
      <LogOut className="size-4" />
    </button>
  </div>
) : (
  <Link
    href="/login"
    className="hidden rounded-md px-3 py-1.5 text-[13px] transition-colors md:block"
    style={{ color: "var(--site-text-50)" }}
  >
    {tNav("login")}
  </Link>
)}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -15
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/site/site-header.tsx
git commit -m "feat: add role-adaptive nav links in site header"
```

---

## Task 12: Final verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify tourist redirect**

Sign in as `test@gmail.com` / `test1234`. Go to `/en/admin` — should redirect to `/en`. Go to `/en/business` — should redirect to `/en`. Go to `/en/superadmin` — should redirect to `/en`.

- [ ] **Step 3: Verify business upgrade form**

Go to `/en/profile`. Should see "Become a Business Owner" section. Click "Apply now" → fill form → submit. Toast "Request submitted".

- [ ] **Step 4: Promote to superadmin and verify**

Run `npx tsx --env-file=.env.local scripts/make-admin.ts` (for `ninikusradze@gmail.com`). Sign out and back in. Header should show "Admin" and "Super Admin" links. `/en/admin` and `/en/superadmin` should load without redirect.

- [ ] **Step 5: Verify superadmin overview stats**

Go to `/en/superadmin`. Should show total user count and pending business requests count from live MongoDB data.
