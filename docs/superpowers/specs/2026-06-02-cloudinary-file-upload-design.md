# Cloudinary File Upload — Design Spec

**Date:** 2026-06-02  
**Status:** Approved

---

## Overview

Allow authenticated users to upload images and videos (≤10MB images, ≤100MB videos) across three surfaces: place photos (admin), profile avatar, and trip/review media. Uploads use Cloudinary via the **signed direct upload** pattern — credentials never leave the server.

---

## Architecture

### Upload Flow

1. User selects file(s) in the `FileUploader` widget.
2. Client calls `POST /api/upload/sign` → server generates a Cloudinary signature using `CLOUDINARY_API_SECRET`. Requires an active session (401 if not logged in).
3. Client posts file directly to Cloudinary using the signed params.
4. Cloudinary returns `secure_url` + `public_id`.
5. Client saves URL to the DB via the parent form submit (or `POST /api/upload/save` for standalone saves).

### New Files

| Path | Purpose |
|------|---------|
| `src/lib/cloudinary.ts` | Sign helper, delete helper (uses `cloudinary` npm SDK, server-only) |
| `src/app/api/upload/sign/route.ts` | Generates signed upload params, auth-gated |
| `src/app/api/upload/save/route.ts` | Persists Cloudinary URL to correct model (place/user/trip) |
| `src/components/ui/file-uploader.tsx` | Reusable upload widget |

---

## Environment Variables

```
CLOUDINARY_CLOUD_NAME=dfrtelcry
CLOUDINARY_API_KEY=993391129945947
CLOUDINARY_API_SECRET=<secret>
```

Add to `.env.local` and Vercel project env vars.

---

## Database Changes

- **User model:** add `avatar: String` (Cloudinary URL)
- **Place model:** `images: [String]` already exists — no change
- **Reservation / Trip models:** add `media: [String]` for user-uploaded trip photos/videos

---

## `FileUploader` Component

**Props:**
```ts
interface FileUploaderProps {
  accept: "image/*" | "video/*" | "image/*,video/*"
  maxFiles?: number          // default 1
  onUpload: (urls: string[]) => void
}
```

**Behavior:**
- Drag-drop zone + click-to-browse
- Image: thumbnail preview; Video: filename + duration
- Per-file progress bar during upload
- No session → shows "Please log in to upload" (no upload attempted)
- Completes → calls `onUpload(urls)` callback

**Used in:**
- `src/components/admin/place-form.tsx` — replaces placeholder photo zone, `maxFiles=10`, `accept="image/*"`
- Profile page — `maxFiles=1`, `accept="image/*"` for avatar
- Review/trip form — `maxFiles=10`, `accept="image/*,video/*"`

---

## Error Handling

| Scenario | Handling |
|----------|---------|
| File too large | Client-side reject before upload, toast error |
| Wrong MIME type | Client-side reject, toast error |
| No session | `POST /api/upload/sign` returns 401, toast "Please log in" |
| Cloudinary upload fails | Toast error, file marked failed with retry button |
| DB save fails | Toast error; Cloudinary URL orphaned (acceptable scope) |
| Network drop mid-upload | 30s timeout, progress stalls, retry shown |

---

## Dependencies

Install:
```bash
npm install cloudinary
```

---

## Out of Scope

- Automatic cleanup of orphaned Cloudinary assets
- Video transcoding / streaming
- Image transformations at upload time
- CDN cache invalidation on delete
