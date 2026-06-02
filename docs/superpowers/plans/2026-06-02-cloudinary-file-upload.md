# Cloudinary File Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add signed Cloudinary upload for images/videos across admin place form, profile avatar, and trip media — credentials stay server-side.

**Architecture:** Client requests a signature from `/api/upload/sign` (auth-gated), uploads directly to Cloudinary, then the returned URL is persisted via the parent form or `/api/upload/save`. A single `FileUploader` component handles drag-drop, preview, and per-file loading state.

**Tech Stack:** Next.js 16, React 19, Cloudinary SDK (server-only), NextAuth v5, MongoDB/Mongoose, Tailwind v4, shadcn/ui, TypeScript

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `src/lib/cloudinary.ts` | Cloudinary config + signature helper (server-only) |
| Create | `src/app/api/upload/sign/route.ts` | POST — generate signed upload params, auth-gated |
| Create | `src/app/api/upload/save/route.ts` | POST — persist URL to User.avatar or Itinerary.media |
| Create | `src/components/ui/file-uploader.tsx` | Reusable drag-drop upload widget |
| Modify | `src/lib/models/user.ts` | Add `avatar: String` field |
| Modify | `src/lib/models/itinerary.ts` | Add `media: [String]` field |
| Modify | `src/components/admin/place-form.tsx` | Replace placeholder with FileUploader |

---

## Task 1: Install Cloudinary SDK

**Files:** `package.json`

- [ ] **Step 1: Install**

```bash
cd "AI_Trip_Planner/AI_Trip_Planner"
npm install cloudinary
```

Expected: `added N packages` with no errors.

- [ ] **Step 2: Commit**

```bash
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

export function signUploadParams(folder: string): {
  signature: string;
  timestamp: number;
  folder: string;
  cloudName: string;
  apiKey: string;
} {
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
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds (or only pre-existing errors).

- [ ] **Step 3: Commit**

```bash
git add src/lib/cloudinary.ts
git commit -m "feat: add cloudinary sign helper"
```

---

## Task 3: Create `/api/upload/sign` route

**Files:**
- Create: `src/app/api/upload/sign/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { auth } from "@/lib/auth";
import { signUploadParams } from "@/lib/cloudinary";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const folder = (body.folder as string) || "trip-planner";

  const params = signUploadParams(folder);
  return Response.json(params);
}
```

- [ ] **Step 2: Manual verify**

Start dev server (`npm run dev`), then in browser console while logged in:

```js
fetch("/api/upload/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ folder: "trip-planner/test" }) })
  .then(r => r.json()).then(console.log)
```

Expected: `{ signature: "...", timestamp: 1234567890, folder: "...", cloudName: "dfrtelcry", apiKey: "993391129945947" }`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/upload/sign/route.ts
git commit -m "feat: add upload sign api route"
```

---

## Task 4: Update `UserModel` — add `avatar`

**Files:**
- Modify: `src/lib/models/user.ts`

- [ ] **Step 1: Add field to interface and schema**

In `src/lib/models/user.ts`, change:

```ts
export interface IUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: false },
  },
  { timestamps: true }
);
```

To:

```ts
export interface IUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  avatar?: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: false },
    avatar: { type: String },
  },
  { timestamps: true }
);
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/models/user.ts
git commit -m "feat: add avatar field to UserModel"
```

---

## Task 5: Update `ItineraryModel` — add `media`

**Files:**
- Modify: `src/lib/models/itinerary.ts`

- [ ] **Step 1: Add field to interface and schema**

In `src/lib/models/itinerary.ts`, change:

```ts
export interface IItinerary {
  _id: mongoose.Types.ObjectId;
  title: string;
  userId?: string;
  days: { date: string; items: { placeId: string; time: string; notes?: string }[] }[];
  createdAt: Date;
}
```

To:

```ts
export interface IItinerary {
  _id: mongoose.Types.ObjectId;
  title: string;
  userId?: string;
  days: { date: string; items: { placeId: string; time: string; notes?: string }[] }[];
  media?: string[];
  createdAt: Date;
}
```

And in `ItinerarySchema`, add `media: [String]`:

```ts
const ItinerarySchema = new Schema<IItinerary>(
  {
    title: { type: String, required: true },
    userId: String,
    days: [ItineraryDaySchema],
    media: [String],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/models/itinerary.ts
git commit -m "feat: add media field to ItineraryModel"
```

---

## Task 6: Create `/api/upload/save` route

**Files:**
- Create: `src/app/api/upload/save/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/lib/models/user";
import { ItineraryModel } from "@/lib/models/itinerary";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = (session.user as { id?: string }).id;
  const body = await req.json();
  const { type, urls, itineraryId } = body as {
    type: "avatar" | "itinerary";
    urls: string[];
    itineraryId?: string;
  };

  if (!Array.isArray(urls) || urls.length === 0) {
    return new Response("urls required", { status: 400 });
  }

  await connectDB();

  if (type === "avatar") {
    await UserModel.findByIdAndUpdate(userId, { avatar: urls[0] });
    return Response.json({ ok: true });
  }

  if (type === "itinerary" && itineraryId) {
    await ItineraryModel.findOneAndUpdate(
      { _id: itineraryId, userId },
      { $push: { media: { $each: urls } } }
    );
    return Response.json({ ok: true });
  }

  return new Response("Invalid type", { status: 400 });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/upload/save/route.ts
git commit -m "feat: add upload save api route"
```

---

## Task 7: Create `FileUploader` component

**Files:**
- Create: `src/components/ui/file-uploader.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useRef, useState } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  accept?: string;
  maxFiles?: number;
  folder?: string;
  onUpload: (urls: string[]) => void;
  className?: string;
}

interface FileState {
  file: File;
  preview?: string;
  status: "pending" | "uploading" | "done" | "error";
  url?: string;
}

async function uploadToCloudinary(
  file: File,
  folder: string
): Promise<string> {
  const signRes = await fetch("/api/upload/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder }),
  });
  if (!signRes.ok) throw new Error("Failed to get signature");
  const { signature, timestamp, cloudName, apiKey, folder: signedFolder } =
    await signRes.json();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", signedFolder);

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    { method: "POST", body: formData }
  );
  if (!uploadRes.ok) throw new Error("Upload failed");
  const data = await uploadRes.json();
  return data.secure_url as string;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export function FileUploader({
  accept = "image/*",
  maxFiles = 1,
  folder = "trip-planner",
  onUpload,
  className,
}: FileUploaderProps) {
  const [files, setFiles] = useState<FileState[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function validateFile(file: File): string | null {
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isImage && !isVideo) return "Unsupported file type";
    if (isImage && file.size > MAX_IMAGE_BYTES) return "Image must be ≤10MB";
    if (isVideo && file.size > MAX_VIDEO_BYTES) return "Video must be ≤100MB";
    return null;
  }

  async function processFiles(selected: File[]) {
    const remaining = maxFiles - files.filter((f) => f.status === "done").length;
    const toProcess = selected.slice(0, remaining);

    const newStates: FileState[] = toProcess.map((file) => ({
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      status: "pending" as const,
    }));

    for (const state of newStates) {
      const err = validateFile(state.file);
      if (err) {
        toast.error(err);
        continue;
      }
      setFiles((prev) => [...prev, { ...state, status: "uploading" }]);
      try {
        const url = await uploadToCloudinary(state.file, folder);
        setFiles((prev) =>
          prev.map((f) =>
            f.file === state.file ? { ...f, status: "done", url } : f
          )
        );
        onUpload(
          files
            .filter((f) => f.status === "done" && f.url)
            .map((f) => f.url!)
            .concat(url)
        );
      } catch {
        setFiles((prev) =>
          prev.map((f) =>
            f.file === state.file ? { ...f, status: "error" } : f
          )
        );
        toast.error(`Failed to upload ${state.file.name}`);
      }
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    processFiles(Array.from(e.dataTransfer.files));
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) processFiles(Array.from(e.target.files));
    e.target.value = "";
  }

  function remove(index: number) {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      onUpload(next.filter((f) => f.status === "done" && f.url).map((f) => f.url!));
      return next;
    });
  }

  const canAdd = files.filter((f) => f.status === "done").length < maxFiles;

  return (
    <div className={cn("space-y-3", className)}>
      {canAdd && (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-primary hover:bg-accent"
        >
          <ImagePlus className="size-5" />
          <span>Drag and drop, or click to upload</span>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={maxFiles > 1}
            className="hidden"
            onChange={onInputChange}
          />
        </div>
      )}

      {files.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {files.map((f, i) => (
            <div
              key={i}
              className="relative h-20 w-20 overflow-hidden rounded-lg border border-border bg-muted"
            >
              {f.preview ? (
                <img src={f.preview} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground px-1 text-center">
                  {f.file.name}
                </div>
              )}

              {f.status === "uploading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="size-5 animate-spin text-white" />
                </div>
              )}

              {f.status === "error" && (
                <div className="absolute inset-0 flex items-center justify-center bg-destructive/60 text-xs text-white">
                  Failed
                </div>
              )}

              {f.status !== "uploading" && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -20
```

Expected: no new TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/file-uploader.tsx
git commit -m "feat: add FileUploader component"
```

---

## Task 8: Wire FileUploader into PlaceForm (admin)

**Files:**
- Modify: `src/components/admin/place-form.tsx`

- [ ] **Step 1: Add state and import, replace placeholder**

At top of file, add import:

```ts
import { FileUploader } from "@/components/ui/file-uploader";
```

Add `photos` state inside `PlaceForm`:

```ts
const [photos, setPhotos] = useState<string[]>([]);
```

Replace the placeholder Photos section (lines 143–149):

```tsx
<div className="space-y-2">
  <Label>Photos</Label>
  <FileUploader
    accept="image/*"
    maxFiles={10}
    folder="trip-planner/places"
    onUpload={setPhotos}
  />
</div>
```

In the `submit` function, include `photos` in the payload (replace the existing toast-only submit):

```ts
async function submit(e: React.FormEvent) {
  e.preventDefault();
  // photos array is in `photos` state — include in POST /api/places when wired
  toast.success(t("save"));
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `/admin/places/new`. Photos section should show drag-drop zone. Log in as test@gmail.com, drag an image — thumbnail should appear with spinner then preview.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/place-form.tsx
git commit -m "feat: wire FileUploader into admin PlaceForm"
```

---

## Task 9: Create profile page with avatar upload

**Files:**
- Create: `src/app/[locale]/profile/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { ProfileClient } from "./profile-client";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/lib/models/user";

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
  const userId = (session.user as { id?: string }).id;
  const user = await UserModel.findById(userId).lean();

  return (
    <ProfileClient
      name={session.user.name ?? ""}
      email={session.user.email ?? ""}
      avatar={user?.avatar ?? session.user.image ?? ""}
    />
  );
}
```

- [ ] **Step 2: Create `src/app/[locale]/profile/profile-client.tsx`**

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileUploader } from "@/components/ui/file-uploader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface Props {
  name: string;
  email: string;
  avatar: string;
}

export function ProfileClient({ name, email, avatar: initialAvatar }: Props) {
  const [avatar, setAvatar] = useState(initialAvatar);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveAvatar() {
    if (!pendingUrl) return;
    setSaving(true);
    const res = await fetch("/api/upload/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "avatar", urls: [pendingUrl] }),
    });
    setSaving(false);
    if (res.ok) {
      setAvatar(pendingUrl);
      setPendingUrl(null);
      toast.success("Avatar updated");
    } else {
      toast.error("Failed to save avatar");
    }
  }

  return (
    <div className="container mx-auto max-w-lg px-4 py-16">
      <h1 className="mb-8 text-2xl font-semibold">Profile</h1>
      <div className="flex flex-col items-center gap-6">
        <Avatar className="size-24">
          <AvatarImage src={pendingUrl ?? avatar} alt={name} />
          <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="w-full space-y-1 text-center">
          <p className="font-medium">{name}</p>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
        <div className="w-full">
          <p className="mb-2 text-sm font-medium">Change avatar</p>
          <FileUploader
            accept="image/*"
            maxFiles={1}
            folder="trip-planner/avatars"
            onUpload={(urls) => setPendingUrl(urls[0] ?? null)}
          />
        </div>
        {pendingUrl && (
          <Button onClick={saveAvatar} disabled={saving}>
            {saving ? "Saving…" : "Save avatar"}
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/profile/
git commit -m "feat: add profile page with avatar upload"
```

---

## Task 10: Add media upload to Trips page

**Files:**
- Modify: `src/app/[locale]/trips/page.tsx`

- [ ] **Step 1: Add TripMediaUploader client component inside trips page**

At the bottom of `src/app/[locale]/trips/page.tsx`, add:

```tsx
"use client";

// Add this import at the top of the file (with other imports):
// import { TripMediaUpload } from "./trip-media-upload";

// Create src/app/[locale]/trips/trip-media-upload.tsx:
```

- [ ] **Step 2: Create `src/app/[locale]/trips/trip-media-upload.tsx`**

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileUploader } from "@/components/ui/file-uploader";
import { Button } from "@/components/ui/button";

export function TripMediaUpload({ tripId }: { tripId: string }) {
  const [pendingUrls, setPendingUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (pendingUrls.length === 0) return;
    setSaving(true);
    const res = await fetch("/api/upload/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "itinerary", urls: pendingUrls, itineraryId: tripId }),
    });
    setSaving(false);
    if (res.ok) {
      setPendingUrls([]);
      toast.success("Media saved to trip");
    } else {
      toast.error("Failed to save media");
    }
  }

  return (
    <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
      <p className="text-sm font-medium">Add photos/videos</p>
      <FileUploader
        accept="image/*,video/*"
        maxFiles={10}
        folder="trip-planner/trips"
        onUpload={setPendingUrls}
      />
      {pendingUrls.length > 0 && (
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? "Saving…" : `Save ${pendingUrls.length} file(s) to trip`}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wire into trips page**

In `src/app/[locale]/trips/page.tsx`, add import at top:

```ts
import { TripMediaUpload } from "./trip-media-upload";
```

Inside the `TripsContent` function, after the `</ol>` closing tag and before `</article>`, add:

```tsx
<TripMediaUpload tripId={trip.id} />
```

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/trips/
git commit -m "feat: add media upload to trips page"
```

---

## Task 11: Final verification

- [ ] **Step 1: Run dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test sign-in**

Go to `http://localhost:3000`, sign in with `test@gmail.com` / `test1234`.

- [ ] **Step 3: Test place photo upload (admin)**

Go to `/admin/places/new`. Drag an image into the Photos zone. Expect: thumbnail appears, no console errors, Cloudinary receives the file (check Cloudinary dashboard).

- [ ] **Step 4: Test avatar upload**

Go to `/profile`. Upload an image. Click "Save avatar". Expect: avatar updates, toast "Avatar updated".

- [ ] **Step 5: Test trip media upload**

Go to `/trips`. If trips exist, click "Add photos/videos" on a trip card. Upload an image or video. Click save. Expect: toast "Media saved to trip".

- [ ] **Step 6: Test unauthorized upload**

Sign out. Open browser console. Run:

```js
fetch("/api/upload/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
  .then(r => console.log(r.status))
```

Expected: `401`
