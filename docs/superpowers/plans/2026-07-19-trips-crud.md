# My Trips: Open / Edit / Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in user expand/collapse days on a saved trip, edit its title and day/stop contents, and delete it, from `/trips`.

**Architecture:** New `GET/PATCH/DELETE /api/trips/[id]` route mirrors the ownership-check pattern already used by `/api/business/listings/[id]/route.ts`. `/trips` page keeps its server-side data fetch but delegates rendering to a new client component `TripsList` (accordion days + edit/delete buttons), mirroring `ListingsTable`. A new `/trips/[id]/edit` page + `TripForm` client component mirror `business/listings/[id]/edit/page.tsx` + `ListingForm`. A new `GET /api/places/search` route backs a `Command`-based place picker combobox for adding stops.

**Tech Stack:** Next.js 16 (App Router, Promise params), Mongoose, next-intl, shadcn/ui (`Accordion`, `Command`, `Popover`, `Button`, `Badge`, `Input`), `sonner` toast, lucide-react icons.

## Global Constraints

- `params`/`searchParams` in page props are Promises — always `await` them (CLAUDE.md).
- Import `Link`, `useRouter`, `redirect`, `usePathname` from `@/i18n/navigation`, never `next/navigation` (CLAUDE.md).
- Add any new user-facing string to all three message files together: `messages/en.json`, `messages/ka.json`, `messages/ru.json` (CLAUDE.md).
- No test suite configured in this repo — verify each task by running `npm run dev` and exercising the flow manually (CLAUDE.md).
- `src/components/ui/` are shadcn primitives — never modify directly.
- `/api/trips/route.ts` uses `NextRequest`/`NextResponse` from `next/server` — match that convention in the new `[id]/route.ts` and `places/search/route.ts` (not the plain `Response.json` style used in `business/listings`).

---

### Task 1: Schema — stable subdocument ids on itinerary days/items

**Files:**
- Modify: `src/lib/models/itinerary.ts`

**Interfaces:**
- Produces: `IItinerary.days[].{_id}` and `IItinerary.days[].items[].{_id}` (Mongoose auto ObjectId strings), consumed by Task 5 (`TripForm`) to key/target rows for edit/remove.

- [ ] **Step 1: Remove `_id: false` from both subdocument schemas**

In `src/lib/models/itinerary.ts`, change:

```ts
const ItineraryItemSchema = new Schema(
  { placeId: String, time: String, notes: String },
  { _id: false }
);

const ItineraryDaySchema = new Schema(
  { date: String, items: [ItineraryItemSchema] },
  { _id: false }
);
```

to:

```ts
const ItineraryItemSchema = new Schema({
  placeId: String,
  time: String,
  notes: String,
});

const ItineraryDaySchema = new Schema({
  date: String,
  items: [ItineraryItemSchema],
});
```

Also update the `IItinerary` interface to reflect optional `_id` on subdocuments:

```ts
export interface IItinerary {
  _id: mongoose.Types.ObjectId;
  title: string;
  userId?: string;
  days: {
    _id?: mongoose.Types.ObjectId;
    date: string;
    items: { _id?: mongoose.Types.ObjectId; placeId: string; time: string; notes?: string }[];
  }[];
  createdAt: Date;
}
```

- [ ] **Step 2: Manual verify**

Run: `npm run dev`, sign in, go to `/en/chat`, generate and save a trip, then check MongoDB directly (or via `/api/trips` response in browser devtools Network tab while on `/en/trips`) that the new document's `days[]` and `days[].items[]` now include `_id` fields.
Expected: new trips saved after this change have subdocument `_id`s; trips saved before this change still load fine (existing docs simply lack `_id` on those subdocuments until next PATCH).

- [ ] **Step 3: Commit**

```bash
git add src/lib/models/itinerary.ts
git commit -m "feat(trips): add stable ids to itinerary day/item subdocuments"
```

---

### Task 2: API — `GET /api/places/search` (place picker backend)

**Files:**
- Create: `src/app/api/places/search/route.ts`

**Interfaces:**
- Produces: `GET /api/places/search?q=<string>` → `200 [{ id: string, name: string, nameKa?: string, category: string }]` (array, capped at 20). Consumed by Task 5 (`TripForm`'s stop-adding combobox).

- [ ] **Step 1: Implement the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json([]);

  await connectDB();
  const places = await PlaceModel.find({ name: { $regex: q, $options: "i" } })
    .select("name nameKa categories")
    .limit(20)
    .lean();

  return NextResponse.json(
    places.map((p: any) => ({
      id: String(p._id),
      name: p.name,
      nameKa: p.nameKa,
      category: p.categories?.[0] ?? "",
    }))
  );
}
```

- [ ] **Step 2: Manual verify**

Run: `npm run dev`, then in a browser (signed in or not — this route has no auth requirement, matching public place data elsewhere) visit `http://localhost:3000/api/places/search?q=a`.
Expected: JSON array of up to 20 places whose name contains "a" (case-insensitive), each with `id`, `name`, `nameKa`, `category`. Visiting `/api/places/search` with no `q` returns `[]`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/places/search/route.ts
git commit -m "feat(places): add place search API for trip-editing place picker"
```

---

### Task 3: API — `GET/PATCH/DELETE /api/trips/[id]`

**Files:**
- Create: `src/app/api/trips/[id]/route.ts`

**Interfaces:**
- Consumes: `ItineraryModel` from `@/lib/models/itinerary` (Task 1 shape), `auth()` from `@/lib/auth`, `connectDB()` from `@/lib/db`.
- Produces:
  - `GET /api/trips/:id` → `200 <ItineraryModel document JSON>` | `401` | `403` | `404`.
  - `PATCH /api/trips/:id` body `{ title: string, days: IItinerary["days"] }` → `200 <updated document JSON>` | `400` | `401` | `403` | `404`.
  - `DELETE /api/trips/:id` → `204` | `401` | `403` | `404`.
  - Consumed by Task 4 (`TripsList` delete button, edit page `GET`) and Task 5 (`TripForm` PATCH).

- [ ] **Step 1: Implement the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ItineraryModel } from "@/lib/models/itinerary";
import { auth } from "@/lib/auth";

async function loadOwnedTrip(id: string, userId: string) {
  await connectDB();
  const trip = await ItineraryModel.findById(id);
  if (!trip) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (trip.userId !== userId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { trip };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id ?? "";

  const { id } = await params;
  const { trip, error } = await loadOwnedTrip(id, userId);
  if (error) return error;

  return NextResponse.json(trip!.toObject());
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id ?? "";

  const { id } = await params;
  const { trip, error } = await loadOwnedTrip(id, userId);
  if (error) return error;

  const body = await req.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!Array.isArray(body.days)) {
    return NextResponse.json({ error: "Days must be an array" }, { status: 400 });
  }

  trip!.title = title;
  trip!.days = body.days;
  await trip!.save();

  return NextResponse.json(trip!.toObject());
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id ?? "";

  const { id } = await params;
  const { trip, error } = await loadOwnedTrip(id, userId);
  if (error) return error;

  await ItineraryModel.findByIdAndDelete(id);
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 2: Manual verify**

Run: `npm run dev`, sign in, save a trip from `/en/chat` to get an id (check `/en/trips` or Network tab on the save POST response for the new `_id`). Then in the browser console on any page of the same origin:

```js
const id = "PASTE_ID_HERE";
await fetch(`/api/trips/${id}`).then(r => r.json());          // expect the trip document
await fetch(`/api/trips/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Renamed", days: [] }) }).then(r => r.json()); // expect updated doc, title "Renamed"
await fetch(`/api/trips/${id}`, { method: "DELETE" }).then(r => r.status); // expect 204
await fetch(`/api/trips/${id}`).then(r => r.status);           // expect 404 (now deleted)
```

Expected: matches the comments above. Also verify signed-out (`fetch` in an incognito/no-session tab) returns `401` for all three methods, and a trip id belonging to a different user returns `403`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/trips/[id]/route.ts
git commit -m "feat(trips): add get/update/delete API for a single saved trip"
```

---

### Task 4: `TripsList` client component — accordion days + edit/delete actions

**Files:**
- Create: `src/components/trips/trips-list.tsx`
- Modify: `src/app/[locale]/trips/page.tsx`
- Modify: `messages/en.json`, `messages/ka.json`, `messages/ru.json`

**Interfaces:**
- Consumes: `SavedItinerary`, `Place` types from `@/types`; `Accordion`/`AccordionItem`/`AccordionTrigger`/`AccordionContent` from `@/components/ui/accordion`; `Button`, `Badge` from `@/components/ui`; `useRouter` from `@/i18n/navigation`; `DELETE /api/trips/[id]` (Task 3).
- Produces: `TripsList({ trips, placesMap }: { trips: SavedItinerary[]; placesMap: Record<string, Place> })` default export, a client component rendered by `TripsPage`.

- [ ] **Step 1: Add i18n keys**

In `messages/en.json`, inside the existing `"trips"` block, add:

```json
"trips": {
  "title": "My Trips",
  "empty": "You haven't saved any trips yet.",
  "startPlanning": "Start planning",
  "signInToSee": "Sign in to see your trips",
  "edit": "Edit",
  "delete": "Delete",
  "deleteConfirm": "Delete \"{title}\"? This cannot be undone.",
  "deleted": "Trip deleted",
  "deleteFailed": "Failed to delete trip"
}
```

In `messages/ka.json`, same block with Georgian translations:

```json
"trips": {
  "title": "ჩემი მოგზაურობები",
  "empty": "ჯერ არცერთი მოგზაურობა არ შეგინახავთ.",
  "startPlanning": "დაგეგმვის დაწყება",
  "signInToSee": "შედით სისტემაში მოგზაურობების სანახავად",
  "edit": "რედაქტირება",
  "delete": "წაშლა",
  "deleteConfirm": "წავშალოთ „{title}“? ამის გაუქმება შეუძლებელია.",
  "deleted": "მოგზაურობა წაიშალა",
  "deleteFailed": "მოგზაურობის წაშლა ვერ მოხერხდა"
}
```

In `messages/ru.json`, same block with Russian translations:

```json
"trips": {
  "title": "Мои поездки",
  "empty": "Вы ещё не сохранили ни одной поездки.",
  "startPlanning": "Начать планирование",
  "signInToSee": "Войдите, чтобы увидеть свои поездки",
  "edit": "Изменить",
  "delete": "Удалить",
  "deleteConfirm": "Удалить «{title}»? Это действие необратимо.",
  "deleted": "Поездка удалена",
  "deleteFailed": "Не удалось удалить поездку"
}
```

(Keep each file's existing surrounding keys unchanged — only add these new ones inside the `"trips"` object, replacing it entirely with the block shown.)

- [ ] **Step 2: Create `TripsList`**

```tsx
"use client";

import { useState } from "react";
import { CalendarDays, Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import type { SavedItinerary, Place } from "@/types";

export function TripsList({
  trips: initial,
  placesMap,
}: {
  trips: SavedItinerary[];
  placesMap: Record<string, Place>;
}) {
  const [trips, setTrips] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);
  const t = useTranslations("trips");
  const locale = useLocale();
  const router = useRouter();

  async function deleteTrip(id: string, title: string) {
    if (!confirm(t("deleteConfirm", { title }))) return;
    setDeleting(id);
    const res = await fetch(`/api/trips/${id}`, { method: "DELETE" });
    setDeleting(null);
    if (res.ok) {
      setTrips((prev) => prev.filter((trip) => trip.id !== id));
      toast.success(t("deleted"));
    } else {
      toast.error(t("deleteFailed"));
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {trips.map((trip) => (
        <article key={trip.id} className="rounded-2xl border border-border bg-card p-5">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{trip.title}</h2>
              <p className="text-xs text-muted-foreground">{trip.createdAt}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{trip.days.length} days</Badge>
              <Button
                size="icon"
                variant="ghost"
                title={t("edit")}
                onClick={() => router.push(`/trips/${trip.id}/edit` as Parameters<typeof router.push>[0])}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                title={t("delete")}
                disabled={deleting === trip.id}
                className="text-destructive hover:text-destructive"
                onClick={() => deleteTrip(trip.id, trip.title)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </header>

          <Accordion className="mt-4">
            {trip.days.map((day) => (
              <AccordionItem key={day.date} value={day.date}>
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    <CalendarDays className="size-4 text-primary" />
                    {day.date}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2">
                    {day.items.map((item) => {
                      const place = placesMap[item.placeId];
                      if (!place) return null;
                      const name = locale === "ka" ? place.nameKa : place.name;
                      return (
                        <li key={`${item.placeId}-${item.time}`} className="flex items-start gap-3">
                          <span className="w-12 shrink-0 text-sm tabular-nums text-muted-foreground">
                            {item.time}
                          </span>
                          <div className="flex-1">
                            <Link
                              href={`/places/${place.slug}`}
                              className="text-sm font-medium hover:underline"
                            >
                              {name}
                            </Link>
                            {item.notes && (
                              <p className="text-xs text-muted-foreground">{item.notes}</p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </article>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Wire `TripsList` into `trips/page.tsx`**

In `src/app/[locale]/trips/page.tsx`, replace the inline `TripsContent` function's trip-rendering body with `TripsList`. Full replacement for the file:

```tsx
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ItineraryModel } from "@/lib/models/itinerary";
import { PlaceModel } from "@/lib/models/place";
import { TripsList } from "@/components/trips/trips-list";
import type { SavedItinerary, Place } from "@/types";

export default async function TripsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  let trips: SavedItinerary[] = [];
  let placesMap: Record<string, Place> = {};

  if (session?.user) {
    await connectDB();
    const userId = (session.user as { id?: string }).id ?? "";
    const docs = userId
      ? await ItineraryModel.find({ userId }).sort({ createdAt: -1 }).lean()
      : [];
    trips = docs.map((d) => ({
      id: d._id.toString(),
      title: d.title,
      createdAt: d.createdAt.toISOString().slice(0, 10),
      days: d.days,
    }));

    const placeIds = trips.flatMap((t) => t.days.flatMap((d) => d.items.map((i) => i.placeId)));
    const unique = [...new Set(placeIds)];
    const places = (await PlaceModel.find({ _id: { $in: unique } }).lean()) as unknown as Place[];
    placesMap = Object.fromEntries(places.map((p) => [p.id, p]));
  }

  return <TripsContent trips={trips} placesMap={placesMap} isLoggedIn={!!session?.user} />;
}

function TripsContent({
  trips,
  placesMap,
  isLoggedIn,
}: {
  trips: SavedItinerary[];
  placesMap: Record<string, Place>;
  isLoggedIn: boolean;
}) {
  const t = useTranslations("trips");

  if (!isLoggedIn || trips.length === 0) {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
        <Sparkles className="mb-4 size-10 text-primary" />
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-2 max-w-md text-muted-foreground">{t("empty")}</p>
        {!isLoggedIn ? (
          <Button asChild className="mt-6">
            <Link href="/login">{t("signInToSee")}</Link>
          </Button>
        ) : (
          <Button asChild className="mt-6">
            <Link href="/chat">{t("startPlanning")}</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <TripsList trips={trips} placesMap={placesMap} />
    </div>
  );
}
```

Note: `TripsContent` is a **server component** here (it calls `useTranslations` from `next-intl`, which works in RSC per this codebase's existing usage), while `TripsList` is the new `"use client"` boundary — same split pattern as `business/listings/page.tsx` → `ListingsTable`.

- [ ] **Step 4: Manual verify**

Run: `npm run dev`, sign in, visit `/en/trips` with at least one saved trip.
Expected: each trip card shows title, date, "N days" badge, edit (pencil) and delete (trash) icon buttons. Days are collapsed by default; clicking a day's date row expands it to show that day's stops; clicking again collapses it. Clicking delete shows a `confirm()` dialog; confirming removes the card immediately and shows a "Trip deleted" toast; the trip is gone from `/api/trips` afterward too. Clicking edit navigates to `/en/trips/<id>/edit` (404 for now — built in Task 5).

- [ ] **Step 5: Commit**

```bash
git add src/components/trips/trips-list.tsx src/app/\[locale\]/trips/page.tsx messages/en.json messages/ka.json messages/ru.json
git commit -m "feat(trips): expandable day accordion plus edit/delete actions on trip cards"
```

---

### Task 5: Trip edit page + `TripForm`

**Files:**
- Create: `src/app/[locale]/trips/[id]/edit/page.tsx`
- Create: `src/components/trips/trip-form.tsx`

**Interfaces:**
- Consumes: `ItineraryModel` (Task 1), `PATCH /api/trips/[id]` (Task 3), `GET /api/places/search` (Task 2), `Command`/`CommandInput`/`CommandList`/`CommandItem`/`CommandEmpty` from `@/components/ui/command`, `Popover`/`PopoverTrigger`/`PopoverContent` from `@/components/ui/popover`, `Input`, `Label`, `Button` from `@/components/ui`.
- Produces: `TripForm({ tripId, defaultValues }: { tripId: string; defaultValues: { title: string; days: { date: string; items: { placeId: string; time: string; notes?: string; name: string }[] }[] } })` — note `items[].name` is a display-only field added client-side by the edit page (joined from `PlaceModel`) so the form never has to re-fetch place names for already-picked stops.

- [ ] **Step 1: Create the edit page**

```tsx
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ItineraryModel } from "@/lib/models/itinerary";
import { PlaceModel } from "@/lib/models/place";
import { TripForm } from "@/components/trips/trip-form";
import { redirect } from "@/i18n/navigation";

export default async function EditTripPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  await connectDB();
  const trip = userId ? ((await ItineraryModel.findById(id).lean()) as any) : null;

  if (!trip || trip.userId !== userId) {
    redirect({ href: "/trips", locale });
  }

  const placeIds = [
    ...new Set(
      trip.days.flatMap((d: any) => d.items.map((i: any) => i.placeId))
    ),
  ];
  const places = (await PlaceModel.find({ _id: { $in: placeIds } })
    .select("name")
    .lean()) as any[];
  const nameById = Object.fromEntries(places.map((p) => [String(p._id), p.name]));

  const defaultValues = {
    title: trip.title as string,
    days: trip.days.map((d: any) => ({
      date: d.date as string,
      items: d.items.map((i: any) => ({
        placeId: i.placeId as string,
        time: i.time as string,
        notes: i.notes as string | undefined,
        name: nameById[i.placeId] ?? "Unknown place",
      })),
    })),
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Edit trip</h1>
      <p className="text-sm text-muted-foreground">{trip.title}</p>
      <div className="mt-6">
        <TripForm tripId={id} defaultValues={defaultValues} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `TripForm`**

```tsx
"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface TripItem {
  placeId: string;
  time: string;
  notes?: string;
  name: string;
}

interface TripDay {
  date: string;
  items: TripItem[];
}

interface TripFormProps {
  tripId: string;
  defaultValues: {
    title: string;
    days: TripDay[];
  };
}

interface PlaceResult {
  id: string;
  name: string;
  category: string;
}

export function TripForm({ tripId, defaultValues }: TripFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(defaultValues.title);
  const [days, setDays] = useState<TripDay[]>(defaultValues.days);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [pickerOpenForDay, setPickerOpenForDay] = useState<number | null>(null);

  async function runSearch(q: string) {
    setSearch(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const res = await fetch(`/api/places/search?q=${encodeURIComponent(q)}`);
    setResults(res.ok ? await res.json() : []);
  }

  function addDay() {
    const today = defaultValues.days[0]?.date ?? "";
    setDays((prev) => [...prev, { date: today, items: [] }]);
  }

  function removeDay(dayIndex: number) {
    setDays((prev) => prev.filter((_, i) => i !== dayIndex));
  }

  function setDayDate(dayIndex: number, date: string) {
    setDays((prev) => prev.map((d, i) => (i === dayIndex ? { ...d, date } : d)));
  }

  function addItem(dayIndex: number, place: PlaceResult) {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? { ...d, items: [...d.items, { placeId: place.id, time: "09:00", notes: "", name: place.name }] }
          : d
      )
    );
    setPickerOpenForDay(null);
    setSearch("");
    setResults([]);
  }

  function removeItem(dayIndex: number, itemIndex: number) {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex ? { ...d, items: d.items.filter((_, j) => j !== itemIndex) } : d
      )
    );
  }

  function setItem(dayIndex: number, itemIndex: number, patch: Partial<TripItem>) {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? {
              ...d,
              items: d.items.map((it, j) => (j === itemIndex ? { ...it, ...patch } : it)),
            }
          : d
      )
    );
  }

  async function save() {
    if (!title.trim()) {
      toast.error("Trip title is required");
      return;
    }
    setSaving(true);
    const body = {
      title: title.trim(),
      days: days.map((d) => ({
        date: d.date,
        items: d.items.map((it) => ({ placeId: it.placeId, time: it.time, notes: it.notes })),
      })),
    };
    const res = await fetch(`/api/trips/${tripId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Trip saved");
      router.push("/trips");
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed to save trip");
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="trip-title">Trip title</Label>
        <Input id="trip-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="space-y-6">
        {days.map((day, dayIndex) => (
          <div key={dayIndex} className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <Label htmlFor={`day-date-${dayIndex}`}>Date</Label>
                <Input
                  id={`day-date-${dayIndex}`}
                  type="date"
                  value={day.date}
                  onChange={(e) => setDayDate(dayIndex, e.target.value)}
                  className="w-40"
                />
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                title="Remove day"
                onClick={() => removeDay(dayIndex)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            <ul className="mt-4 space-y-3">
              {day.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex flex-wrap items-center gap-2">
                  <Input
                    type="time"
                    value={item.time}
                    onChange={(e) => setItem(dayIndex, itemIndex, { time: e.target.value })}
                    className="w-28"
                  />
                  <span className="min-w-32 text-sm font-medium">{item.name}</span>
                  <Input
                    placeholder="Notes"
                    value={item.notes ?? ""}
                    onChange={(e) => setItem(dayIndex, itemIndex, { notes: e.target.value })}
                    className="flex-1 min-w-40"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    title="Remove stop"
                    onClick={() => removeItem(dayIndex, itemIndex)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>

            <Popover
              open={pickerOpenForDay === dayIndex}
              onOpenChange={(open) => setPickerOpenForDay(open ? dayIndex : null)}
            >
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="mt-4">
                  <Plus className="size-4" />
                  Add stop
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search places…"
                    value={search}
                    onValueChange={runSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No places found.</CommandEmpty>
                    <CommandGroup>
                      {results.map((place) => (
                        <CommandItem
                          key={place.id}
                          value={place.id}
                          onSelect={() => addItem(dayIndex, place)}
                        >
                          {place.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={addDay}>
        <Plus className="size-4" />
        Add day
      </Button>

      <div className="flex gap-2 border-t border-border pt-6">
        <Button type="button" disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/trips")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Manual verify**

Run: `npm run dev`, sign in, go to `/en/trips`, click the edit (pencil) button on a trip.
Expected: lands on `/en/trips/<id>/edit` showing the trip's title and days with existing stops (time, name, notes editable). Rename the title, remove a stop, click "Add stop" on a day, type a search query, pick a result from the list, adjust its time, then click "Save changes". Expected: redirected to `/en/trips`, success toast, and the card now reflects the new title/stops (verify by expanding its accordion). Reload the page to confirm persistence. Also verify: visiting `/en/trips/<some-other-users-id>/edit` (or a made-up ObjectId) redirects to `/en/trips` instead of erroring.

- [ ] **Step 4: Commit**

```bash
git add src/app/\[locale\]/trips/\[id\]/edit/page.tsx src/components/trips/trip-form.tsx
git commit -m "feat(trips): add trip edit page for renaming and editing days/stops"
```

---

## Self-Review Notes

- **Spec coverage:** Task 1 covers the schema change; Task 2 covers the place-picker API; Task 3 covers the CRUD API; Task 4 covers inline expand (Accordion) + delete + edit navigation on `/trips`; Task 5 covers the dedicated edit page/form with title, day, and stop editing plus the searchable place picker. All spec sections are represented.
- **Placeholder scan:** no TBD/TODO; all steps show full code.
- **Type consistency:** `SavedItinerary`/`Place` types (Task 4) match `@/types` as already used by `trips/page.tsx`. `TripItem`/`TripDay`/`PlaceResult` (Task 5) are local to `trip-form.tsx` and match the shape produced by the edit page's `defaultValues` and consumed by the `PATCH` body sent to Task 3's route (`{ placeId, time, notes }`, dropping the display-only `name` field before sending).
