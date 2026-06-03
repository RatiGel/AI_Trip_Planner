# Phase 2: Business Owner Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Business Owner Dashboard — listings CRUD, reviews management, analytics charts, and billing page — backed by real MongoDB data.

**Architecture:** Business owners manage their own `PlaceModel` documents (filtered by `ownerId`). New listings are created with `status: 'pending'` and await superadmin approval. `ReviewModel` stores customer reviews per place. Analytics are derived from MongoDB aggregations over the owner's places. All business API routes enforce `ownerId` ownership checks.

**Tech Stack:** Next.js 16, MongoDB/Mongoose, NextAuth v5, Tailwind v4, shadcn/ui, recharts, TypeScript

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `src/lib/models/place.ts` | Add ownerId, status, featured, rejectionReason, viewCount |
| Create | `src/lib/models/review.ts` | Review model |
| Create | `src/app/api/business/listings/route.ts` | GET list + POST create |
| Create | `src/app/api/business/listings/[id]/route.ts` | PATCH update + DELETE |
| Create | `src/app/api/business/reviews/[id]/reply/route.ts` | PATCH add reply |
| Create | `src/components/business/listings-table.tsx` | Listings CRUD table |
| Create | `src/components/business/listing-form.tsx` | Create/edit listing form |
| Create | `src/components/business/reviews-table.tsx` | Reviews + reply UI |
| Create | `src/components/business/analytics-charts.tsx` | recharts bar chart |
| Modify | `src/app/[locale]/business/page.tsx` | Real stats from DB |
| Create | `src/app/[locale]/business/listings/page.tsx` | Listings index |
| Create | `src/app/[locale]/business/listings/new/page.tsx` | New listing |
| Create | `src/app/[locale]/business/listings/[id]/edit/page.tsx` | Edit listing |
| Create | `src/app/[locale]/business/reviews/page.tsx` | Reviews page |
| Create | `src/app/[locale]/business/analytics/page.tsx` | Analytics page |
| Create | `src/app/[locale]/business/billing/page.tsx` | Billing (static) |
| Create | `src/app/[locale]/business/media/page.tsx` | Media (placeholder) |
| Install | `recharts` | Charts library |

---

## Task 1: Install recharts

- [ ] **Step 1: Install**

```bash
npm install recharts
```

Expected: `added N packages` with no errors.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install recharts for analytics charts"
```

---

## Task 2: Update PlaceModel

**Files:**
- Modify: `src/lib/models/place.ts`

- [ ] **Step 1: Add new fields to PlaceSchema**

Add these fields inside `PlaceSchema` (before the closing brace of the schema object):

```ts
ownerId: { type: String, index: true },
status: {
  type: String,
  enum: ["pending", "active", "rejected"],
  default: "active",
  index: true,
},
featured: { type: Boolean, default: false },
rejectionReason: { type: String },
viewCount: { type: Number, default: 0 },
```

Full updated `src/lib/models/place.ts`:

```ts
import { Schema, model, models } from "mongoose";
import type { Place } from "@/types";

type PlaceDoc = Omit<Place, "id"> & { _id: unknown };

const GeoSchema = new Schema({ lng: Number, lat: Number, address: String }, { _id: false });

const OpeningHoursSchema = new Schema(
  { day: Number, open: String, close: String, closed: Boolean },
  { _id: false }
);

const PlaceSchema = new Schema<PlaceDoc>(
  {
    slug: { type: String, required: true, unique: true },
    citySlug: { type: String, required: true, index: true },
    name: { type: String, required: true },
    nameKa: String,
    description: String,
    descriptionKa: String,
    categories: [String],
    images: [String],
    geo: GeoSchema,
    openingHours: [OpeningHoursSchema],
    priceLevel: { type: Number, min: 1, max: 4 },
    rating: { type: Number, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    tags: [String],
    reservable: { type: Boolean, default: false },
    phone: String,
    website: String,
    averageVisitDurationMin: Number,
    popularityScore: { type: Number, min: 0, max: 100 },
    ownerId: { type: String, index: true },
    status: {
      type: String,
      enum: ["pending", "active", "rejected"],
      default: "active",
      index: true,
    },
    featured: { type: Boolean, default: false },
    rejectionReason: { type: String },
    viewCount: { type: Number, default: 0 },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

PlaceSchema.virtual("id").get(function (this: any) {
  return String(this._id);
});

export const PlaceModel = models.Place ?? model("Place", PlaceSchema);
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/models/place.ts
git commit -m "feat: add ownerId, status, featured, viewCount to PlaceModel"
```

---

## Task 3: Create ReviewModel

**Files:**
- Create: `src/lib/models/review.ts`

- [ ] **Step 1: Write the model**

```ts
import mongoose, { Schema, model, models } from "mongoose";

export interface IReview {
  _id: mongoose.Types.ObjectId;
  placeId: string;
  userId: string;
  userName: string;
  rating: number;
  text: string;
  reply?: string;
  flagged: boolean;
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    placeId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, required: true },
    reply: { type: String },
    flagged: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const ReviewModel =
  models.Review ?? model<IReview>("Review", ReviewSchema);
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/models/review.ts
git commit -m "feat: add ReviewModel"
```

---

## Task 4: Business listings API routes

**Files:**
- Create: `src/app/api/business/listings/route.ts`
- Create: `src/app/api/business/listings/[id]/route.ts`

- [ ] **Step 1: Write `GET + POST /api/business/listings`**

```ts
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";

async function requireBusiness() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !["business", "admin", "superadmin"].includes(role ?? "")) {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireBusiness();
  if (!session) return Response.json({ error: "Forbidden" }, { status: 403 });

  const userId = (session.user as { id?: string }).id!;
  await connectDB();

  const places = await PlaceModel.find({ ownerId: userId })
    .select("name slug status featured viewCount rating reviewCount categories citySlug createdAt")
    .sort({ createdAt: -1 })
    .lean();

  return Response.json(
    places.map((p: any) => ({
      id: p._id.toString(),
      name: p.name,
      slug: p.slug,
      status: p.status ?? "active",
      featured: p.featured ?? false,
      viewCount: p.viewCount ?? 0,
      rating: p.rating ?? 0,
      reviewCount: p.reviewCount ?? 0,
      categories: p.categories ?? [],
      citySlug: p.citySlug,
    }))
  );
}

export async function POST(req: Request) {
  const session = await requireBusiness();
  if (!session) return Response.json({ error: "Forbidden" }, { status: 403 });

  const userId = (session.user as { id?: string }).id!;
  const body = await req.json();
  const { name, nameKa, citySlug, address, lng, lat, description, descriptionKa, categories, priceLevel, phone, website, reservable } = body;

  if (!name || !citySlug) {
    return Response.json({ error: "name and citySlug required" }, { status: 400 });
  }

  await connectDB();

  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;

  const place = await PlaceModel.create({
    slug,
    name,
    nameKa: nameKa || "",
    citySlug,
    geo: { address: address || "", lng: lng || 0, lat: lat || 0 },
    description: description || "",
    descriptionKa: descriptionKa || "",
    categories: categories || [],
    priceLevel: priceLevel || 2,
    phone: phone || "",
    website: website || "",
    reservable: !!reservable,
    ownerId: userId,
    status: "pending",
    images: [],
    viewCount: 0,
  });

  return Response.json({ id: place._id.toString(), slug: place.slug }, { status: 201 });
}
```

- [ ] **Step 2: Write `PATCH + DELETE /api/business/listings/[id]`**

```ts
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";

async function requireBusiness() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !["business", "admin", "superadmin"].includes(role ?? "")) {
    return null;
  }
  return session;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireBusiness();
  if (!session) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const userId = (session.user as { id?: string }).id!;
  const role = (session.user as { role?: string }).role;

  await connectDB();

  const place = await PlaceModel.findById(id);
  if (!place) return Response.json({ error: "Not found" }, { status: 404 });

  const isOwner = place.ownerId === userId;
  const isAdminOrSuper = ["admin", "superadmin"].includes(role ?? "");
  if (!isOwner && !isAdminOrSuper) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const allowed = ["name", "nameKa", "citySlug", "description", "descriptionKa", "categories", "priceLevel", "phone", "website", "reservable", "geo"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const updated = await PlaceModel.findByIdAndUpdate(id, update, { new: true }).lean();
  return Response.json({ id: (updated as any)._id.toString() });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireBusiness();
  if (!session) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const userId = (session.user as { id?: string }).id!;
  const role = (session.user as { role?: string }).role;

  await connectDB();

  const place = await PlaceModel.findById(id);
  if (!place) return Response.json({ error: "Not found" }, { status: 404 });

  const isOwner = place.ownerId === userId;
  const isAdminOrSuper = ["admin", "superadmin"].includes(role ?? "");
  if (!isOwner && !isAdminOrSuper) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await PlaceModel.findByIdAndDelete(id);
  return Response.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/business/listings/
git commit -m "feat: add business listings API routes (GET, POST, PATCH, DELETE)"
```

---

## Task 5: Business reviews API route

**Files:**
- Create: `src/app/api/business/reviews/[id]/reply/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ReviewModel } from "@/lib/models/review";
import { PlaceModel } from "@/lib/models/place";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !["business", "admin", "superadmin"].includes(role ?? "")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const userId = (session.user as { id?: string }).id!;
  const { reply } = await req.json();

  if (!reply?.trim()) {
    return Response.json({ error: "reply required" }, { status: 400 });
  }

  await connectDB();

  const review = await ReviewModel.findById(id);
  if (!review) return Response.json({ error: "Not found" }, { status: 404 });

  const place = await PlaceModel.findById(review.placeId);
  const isOwner = place?.ownerId === userId;
  const isAdminOrSuper = ["admin", "superadmin"].includes(role ?? "");
  if (!isOwner && !isAdminOrSuper) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await ReviewModel.findByIdAndUpdate(id, { reply });
  return Response.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/business/reviews/
git commit -m "feat: add business review reply API route"
```

---

## Task 6: ListingsTable component

**Files:**
- Create: `src/components/business/listings-table.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Pencil, Trash2 } from "lucide-react";

interface Listing {
  id: string;
  name: string;
  slug: string;
  status: string;
  viewCount: number;
  rating: number;
  reviewCount: number;
  citySlug: string;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default",
  pending: "secondary",
  rejected: "destructive",
};

export function ListingsTable({ listings: initial }: { listings: Listing[] }) {
  const [listings, setListings] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();

  async function deleteListing(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    const res = await fetch(`/api/business/listings/${id}`, { method: "DELETE" });
    setDeleting(null);
    if (res.ok) {
      setListings((prev) => prev.filter((l) => l.id !== id));
      toast.success("Listing deleted");
    } else {
      toast.error("Failed to delete listing");
    }
  }

  if (listings.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">No listings yet.</p>
        <Button className="mt-4" onClick={() => router.push("/business/listings/new")}>
          Add your first listing
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Views</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {listings.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="font-medium">{l.name}</TableCell>
              <TableCell className="text-muted-foreground capitalize">{l.citySlug}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[l.status] ?? "secondary"}>
                  {l.status}
                </Badge>
              </TableCell>
              <TableCell>{l.viewCount}</TableCell>
              <TableCell>
                {l.rating > 0 ? `${l.rating.toFixed(1)} (${l.reviewCount})` : "—"}
              </TableCell>
              <TableCell className="text-right space-x-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => router.push(`/places/${l.slug}` as any)}
                  title="View"
                >
                  <Eye className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => router.push(`/business/listings/${l.id}/edit` as any)}
                  title="Edit"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={deleting === l.id}
                  onClick={() => deleteListing(l.id, l.name)}
                  title="Delete"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/business/listings-table.tsx
git commit -m "feat: add business ListingsTable component"
```

---

## Task 7: ListingForm component

**Files:**
- Create: `src/components/business/listing-form.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save } from "lucide-react";
import { mockCities } from "@/lib/mock/cities";
import { mockCategories } from "@/lib/mock/categories";
import type { CategorySlug } from "@/types";

interface ListingFormProps {
  listingId?: string;
  defaultValues?: {
    name: string;
    nameKa: string;
    citySlug: string;
    address: string;
    lng: number;
    lat: number;
    description: string;
    descriptionKa: string;
    categories: CategorySlug[];
    priceLevel: number;
    phone: string;
    website: string;
    reservable: boolean;
  };
}

export function ListingForm({ listingId, defaultValues }: ListingFormProps) {
  const router = useRouter();
  const isEdit = !!listingId;

  const [city, setCity] = useState(defaultValues?.citySlug ?? mockCities[0]?.slug ?? "");
  const [cats, setCats] = useState<Set<CategorySlug>>(
    new Set(defaultValues?.categories ?? [])
  );
  const [reservable, setReservable] = useState(defaultValues?.reservable ?? false);
  const [priceLevel, setPriceLevel] = useState(String(defaultValues?.priceLevel ?? 2));
  const [saving, setSaving] = useState(false);

  function toggleCat(c: CategorySlug) {
    setCats((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name") as string,
      nameKa: fd.get("nameKa") as string,
      citySlug: city,
      address: fd.get("address") as string,
      lng: parseFloat((fd.get("lng") as string) || "0"),
      lat: parseFloat((fd.get("lat") as string) || "0"),
      description: fd.get("description") as string,
      descriptionKa: fd.get("descriptionKa") as string,
      categories: Array.from(cats),
      priceLevel: parseInt(priceLevel),
      phone: fd.get("phone") as string,
      website: fd.get("website") as string,
      reservable,
    };

    setSaving(true);
    const res = await fetch(
      isEdit ? `/api/business/listings/${listingId}` : "/api/business/listings",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    setSaving(false);

    if (res.ok) {
      toast.success(isEdit ? "Listing updated" : "Listing submitted for review");
      router.push("/business/listings");
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Failed to save");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6 max-w-2xl">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name (EN) *</Label>
          <Input id="name" name="name" required defaultValue={defaultValues?.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nameKa">Name (KA)</Label>
          <Input id="nameKa" name="nameKa" defaultValue={defaultValues?.nameKa} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>City *</Label>
          <Select value={city} onValueChange={(v) => v && setCity(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mockCities.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input id="address" name="address" defaultValue={defaultValues?.address} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="lng">Longitude</Label>
          <Input id="lng" name="lng" type="number" step="any" defaultValue={defaultValues?.lng} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lat">Latitude</Label>
          <Input id="lat" name="lat" type="number" step="any" defaultValue={defaultValues?.lat} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Categories</Label>
        <div className="flex flex-wrap gap-2">
          {mockCategories.map((c) => (
            <label
              key={c.slug}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm hover:bg-accent has-[input:checked]:border-primary has-[input:checked]:bg-primary/10"
            >
              <Checkbox
                checked={cats.has(c.slug)}
                onCheckedChange={() => toggleCat(c.slug)}
              />
              <span className="capitalize">{c.slug}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="description">Description (EN)</Label>
          <Textarea id="description" name="description" rows={4} defaultValue={defaultValues?.description} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="descriptionKa">Description (KA)</Label>
          <Textarea id="descriptionKa" name="descriptionKa" rows={4} defaultValue={defaultValues?.descriptionKa} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Price level</Label>
          <Select value={priceLevel} onValueChange={setPriceLevel}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {"$".repeat(n)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" placeholder="+995 …" defaultValue={defaultValues?.phone} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input id="website" name="website" type="url" placeholder="https://" defaultValue={defaultValues?.website} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="reservable"
          checked={reservable}
          onCheckedChange={(v) => setReservable(!!v)}
        />
        <Label htmlFor="reservable">Reservable</Label>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          <Save className="size-4" />
          {saving ? "Saving…" : isEdit ? "Save changes" : "Submit listing"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/business/listings")}>
          Cancel
        </Button>
      </div>

      {!isEdit && (
        <p className="text-xs text-muted-foreground">
          New listings require admin approval before going live.
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/business/listing-form.tsx
git commit -m "feat: add business ListingForm component"
```

---

## Task 8: ReviewsTable component

**Files:**
- Create: `src/components/business/reviews-table.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Star, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Review {
  id: string;
  placeId: string;
  placeName: string;
  userName: string;
  rating: number;
  text: string;
  reply?: string | null;
  createdAt: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-3.5 ${i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </span>
  );
}

export function ReviewsTable({ reviews: initial }: { reviews: Review[] }) {
  const [reviews, setReviews] = useState(initial);
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);

  async function submitReply(id: string) {
    if (!replyText.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/business/reviews/${id}/reply`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply: replyText }),
    });
    setSaving(false);
    if (res.ok) {
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, reply: replyText } : r))
      );
      setReplyId(null);
      setReplyText("");
      toast.success("Reply saved");
    } else {
      toast.error("Failed to save reply");
    }
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">No reviews yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((r) => (
        <div key={r.id} className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-sm">{r.userName}</p>
              <p className="text-xs text-muted-foreground">{r.placeName} · {new Date(r.createdAt).toLocaleDateString()}</p>
            </div>
            <StarRating rating={r.rating} />
          </div>

          <p className="text-sm text-muted-foreground">{r.text}</p>

          {r.reply ? (
            <div className="rounded-xl bg-muted px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Your reply</p>
              <p className="text-sm">{r.reply}</p>
            </div>
          ) : replyId === r.id ? (
            <div className="space-y-2">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write your reply…"
                rows={3}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => submitReply(r.id)} disabled={saving}>
                  {saving ? "Saving…" : "Post reply"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setReplyId(null); setReplyText(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setReplyId(r.id)}
            >
              <MessageSquare className="size-3.5" /> Reply
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/business/reviews-table.tsx
git commit -m "feat: add business ReviewsTable component"
```

---

## Task 9: AnalyticsCharts component

**Files:**
- Create: `src/components/business/analytics-charts.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ListingStat {
  name: string;
  viewCount: number;
  reviewCount: number;
}

export function AnalyticsCharts({ listings }: { listings: ListingStat[] }) {
  const chartData = listings
    .slice(0, 8)
    .map((l) => ({ name: l.name.length > 18 ? l.name.slice(0, 18) + "…" : l.name, views: l.viewCount, reviews: l.reviewCount }));

  if (chartData.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">No listing data to display yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-medium mb-4">Views by listing</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="views" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-medium mb-4">Reviews by listing</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="reviews" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/business/analytics-charts.tsx
git commit -m "feat: add business AnalyticsCharts component"
```

---

## Task 10: Update business overview page with real stats

**Files:**
- Modify: `src/app/[locale]/business/page.tsx`

- [ ] **Step 1: Replace file content**

```tsx
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";
import { ReviewModel } from "@/lib/models/review";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const userId = (session!.user as { id?: string }).id!;

  await connectDB();

  const places = await PlaceModel.find({ ownerId: userId })
    .select("_id name status viewCount rating reviewCount")
    .lean();

  const placeIds = places.map((p: any) => p._id.toString());
  const totalViews = places.reduce((sum: number, p: any) => sum + (p.viewCount ?? 0), 0);
  const activeListings = places.filter((p: any) => p.status === "active").length;
  const pendingListings = places.filter((p: any) => p.status === "pending").length;

  const reviews = placeIds.length
    ? await ReviewModel.find({ placeId: { $in: placeIds } })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    : [];

  const avgRating =
    places.length > 0
      ? (
          places.reduce((sum: number, p: any) => sum + (p.rating ?? 0), 0) /
          places.length
        ).toFixed(1)
      : "—";

  const stats = [
    { label: "Total Views", value: totalViews },
    { label: "Active Listings", value: activeListings },
    { label: "Pending Approval", value: pendingListings },
    { label: "Avg Rating", value: avgRating },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Business Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {session?.user?.name}.
          </p>
        </div>
        <Button asChild>
          <Link href="/business/listings/new">
            <Plus className="size-4" /> Add Listing
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {reviews.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-medium mb-4">Recent reviews</h2>
          <div className="space-y-3">
            {reviews.map((r: any) => (
              <div key={r._id.toString()} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium">{r.userName}</p>
                  <p className="text-muted-foreground line-clamp-1">{r.text}</p>
                </div>
                <span className="text-muted-foreground shrink-0">★ {r.rating}</span>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="mt-3" asChild>
            <Link href="/business/reviews">View all reviews →</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/[locale]/business/page.tsx
git commit -m "feat: update business overview with real MongoDB stats"
```

---

## Task 11: Business listings pages

**Files:**
- Create: `src/app/[locale]/business/listings/page.tsx`
- Create: `src/app/[locale]/business/listings/new/page.tsx`
- Create: `src/app/[locale]/business/listings/[id]/edit/page.tsx`

- [ ] **Step 1: Write listings index page**

`src/app/[locale]/business/listings/page.tsx`:

```tsx
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";
import { ListingsTable } from "@/components/business/listings-table";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Plus } from "lucide-react";

export default async function BusinessListingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const userId = (session!.user as { id?: string }).id!;

  await connectDB();
  const places = await PlaceModel.find({ ownerId: userId })
    .select("name slug status featured viewCount rating reviewCount citySlug")
    .sort({ createdAt: -1 })
    .lean();

  const listings = places.map((p: any) => ({
    id: p._id.toString(),
    name: p.name,
    slug: p.slug,
    status: p.status ?? "active",
    featured: p.featured ?? false,
    viewCount: p.viewCount ?? 0,
    rating: p.rating ?? 0,
    reviewCount: p.reviewCount ?? 0,
    citySlug: p.citySlug,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Listings</h1>
          <p className="text-sm text-muted-foreground">{listings.length} listing(s)</p>
        </div>
        <Button asChild>
          <Link href="/business/listings/new">
            <Plus className="size-4" /> New listing
          </Link>
        </Button>
      </div>
      <ListingsTable listings={listings} />
    </div>
  );
}
```

- [ ] **Step 2: Write new listing page**

`src/app/[locale]/business/listings/new/page.tsx`:

```tsx
import { setRequestLocale } from "next-intl/server";
import { ListingForm } from "@/components/business/listing-form";

export default async function NewListingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New listing</h1>
        <p className="text-sm text-muted-foreground">
          Submit a new listing for review. It will go live once approved.
        </p>
      </div>
      <ListingForm />
    </div>
  );
}
```

- [ ] **Step 3: Write edit listing page**

`src/app/[locale]/business/listings/[id]/edit/page.tsx`:

```tsx
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";
import { ListingForm } from "@/components/business/listing-form";
import { redirect } from "@/i18n/navigation";
import type { CategorySlug } from "@/types";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const userId = (session!.user as { id?: string }).id!;

  await connectDB();
  const place = await PlaceModel.findById(id).lean() as any;

  if (!place || place.ownerId !== userId) {
    redirect({ href: "/business/listings", locale });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit listing</h1>
        <p className="text-sm text-muted-foreground">{place.name}</p>
      </div>
      <ListingForm
        listingId={id}
        defaultValues={{
          name: place.name ?? "",
          nameKa: place.nameKa ?? "",
          citySlug: place.citySlug ?? "",
          address: place.geo?.address ?? "",
          lng: place.geo?.lng ?? 0,
          lat: place.geo?.lat ?? 0,
          description: place.description ?? "",
          descriptionKa: place.descriptionKa ?? "",
          categories: (place.categories ?? []) as CategorySlug[],
          priceLevel: place.priceLevel ?? 2,
          phone: place.phone ?? "",
          website: place.website ?? "",
          reservable: place.reservable ?? false,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/business/listings/
git commit -m "feat: add business listings pages (index, new, edit)"
```

---

## Task 12: Business reviews page

**Files:**
- Create: `src/app/[locale]/business/reviews/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";
import { ReviewModel } from "@/lib/models/review";
import { ReviewsTable } from "@/components/business/reviews-table";

export default async function BusinessReviewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const userId = (session!.user as { id?: string }).id!;

  await connectDB();

  const places = await PlaceModel.find({ ownerId: userId })
    .select("_id name")
    .lean();

  const placeIds = places.map((p: any) => p._id.toString());
  const placeNameMap = Object.fromEntries(
    places.map((p: any) => [p._id.toString(), p.name])
  );

  const reviews = placeIds.length
    ? await ReviewModel.find({ placeId: { $in: placeIds } })
        .sort({ createdAt: -1 })
        .lean()
    : [];

  const serialized = reviews.map((r: any) => ({
    id: r._id.toString(),
    placeId: r.placeId,
    placeName: placeNameMap[r.placeId] ?? "Unknown",
    userName: r.userName,
    rating: r.rating,
    text: r.text,
    reply: r.reply ?? null,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>
        <p className="text-sm text-muted-foreground">{serialized.length} review(s)</p>
      </div>
      <ReviewsTable reviews={serialized} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/[locale]/business/reviews/
git commit -m "feat: add business reviews page"
```

---

## Task 13: Business analytics, billing, and media pages

**Files:**
- Create: `src/app/[locale]/business/analytics/page.tsx`
- Create: `src/app/[locale]/business/billing/page.tsx`
- Create: `src/app/[locale]/business/media/page.tsx`

- [ ] **Step 1: Write analytics page**

`src/app/[locale]/business/analytics/page.tsx`:

```tsx
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";
import { AnalyticsCharts } from "@/components/business/analytics-charts";

export default async function BusinessAnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const userId = (session!.user as { id?: string }).id!;

  await connectDB();
  const places = await PlaceModel.find({ ownerId: userId })
    .select("name viewCount reviewCount rating")
    .lean();

  const listings = places.map((p: any) => ({
    name: p.name,
    viewCount: p.viewCount ?? 0,
    reviewCount: p.reviewCount ?? 0,
    rating: p.rating ?? 0,
  }));

  const totalViews = listings.reduce((s, l) => s + l.viewCount, 0);
  const totalReviews = listings.reduce((s, l) => s + l.reviewCount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Performance across all your listings</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Total views</p>
          <p className="mt-1 text-2xl font-semibold">{totalViews}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Total reviews</p>
          <p className="mt-1 text-2xl font-semibold">{totalReviews}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Listings</p>
          <p className="mt-1 text-2xl font-semibold">{listings.length}</p>
        </div>
      </div>
      <AnalyticsCharts listings={listings} />
    </div>
  );
}
```

- [ ] **Step 2: Write billing page**

`src/app/[locale]/business/billing/page.tsx`:

```tsx
import { setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    description: "Up to 2 listings, basic analytics",
    features: ["2 listings", "Basic analytics", "Review replies", "Standard support"],
    current: true,
  },
  {
    name: "Pro",
    price: "$29/mo",
    description: "Unlimited listings, advanced analytics, featured placements",
    features: ["Unlimited listings", "Advanced analytics", "Featured placements", "Priority support", "Promotional offers"],
    current: false,
  },
];

export default async function BusinessBillingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">Manage your subscription plan</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 max-w-2xl">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-2xl border p-6 space-y-4 ${plan.current ? "border-primary bg-primary/5" : "border-border bg-card"}`}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{plan.name}</h2>
              {plan.current && <Badge>Current plan</Badge>}
            </div>
            <p className="text-2xl font-bold">{plan.price}</p>
            <p className="text-sm text-muted-foreground">{plan.description}</p>
            <ul className="space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="size-4 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            {!plan.current && (
              <Button className="w-full" disabled>
                Upgrade (coming soon)
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write media page placeholder**

`src/app/[locale]/business/media/page.tsx`:

```tsx
import { setRequestLocale } from "next-intl/server";
import { ImagePlus } from "lucide-react";

export default async function BusinessMediaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Media</h1>
        <p className="text-sm text-muted-foreground">Photos and videos for your listings</p>
      </div>
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border text-muted-foreground">
        <ImagePlus className="size-10" />
        <p className="text-sm">Media uploads coming soon</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/business/analytics/ src/app/[locale]/business/billing/ src/app/[locale]/business/media/
git commit -m "feat: add business analytics, billing, and media pages"
```

---

## Task 14: Final verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test as business user**

Sign in as a user with `role: "business"` (set via MongoDB or make-admin script with `role: "business"`). Navigate to `/en/business` — should see overview with stat cards.

- [ ] **Step 3: Test new listing**

Go to `/en/business/listings/new`. Fill in name, city, description. Submit. Toast "Listing submitted for review". Listing appears in `/en/business/listings` with status `pending`.

- [ ] **Step 4: Test edit listing**

Click Edit on a listing. Change description. Save. Toast "Listing updated".

- [ ] **Step 5: Test delete listing**

Click Delete. Confirm. Listing removed from table. Toast "Listing deleted".

- [ ] **Step 6: Test analytics page**

Go to `/en/business/analytics`. Should show stat cards and bar charts (empty if no views yet).

- [ ] **Step 7: Commit and push**

```bash
git push origin main
```
