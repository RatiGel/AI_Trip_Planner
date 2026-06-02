# Admin Dashboard + Role-Based Auth — Design Spec

**Date:** 2026-06-02  
**Status:** Approved

---

## Overview

Add `role` field (`user` | `admin`) to users, gate the existing `/admin` section to admins only, and build two new admin pages: **Users CRUD** and **Media CRUD** (Cloudinary assets).

---

## Role System

### UserModel change
Add `role: { type: String, enum: ['user', 'admin'], default: 'user' }` to `src/lib/models/user.ts`.

### IUser interface change
Add `role?: 'user' | 'admin'` to the `IUser` interface.

### Promoting to admin
Admin promotes themselves (or others) by directly editing the `role` field in MongoDB. No UI self-promotion flow — by design.

### NextAuth integration
- `jwt` callback: after setting `token.id`, also set `token.role = dbUser.role ?? 'user'`  
- `session` callback: set `session.user.role = token.role`  
- TypeScript: extend `next-auth` module to include `role` on `Session["user"]` and `JWT`

---

## Admin Route Gate

`src/app/[locale]/admin/layout.tsx` becomes auth-aware:
1. Call `auth()` to get session
2. If `!session || session.user.role !== 'admin'` → `redirect({ href: '/', locale })`
3. Add **Users** and **Media** links to the sidebar `NAV` array

Non-admin users hitting any `/admin/*` URL are silently redirected to `/`.

---

## New Admin Pages

### `/admin/users`
**File:** `src/app/[locale]/admin/users/page.tsx`

Server component — fetches all users from MongoDB (`UserModel.find().lean()`), passes to client table.

**Client table** `src/components/admin/users-table.tsx`:
- Columns: Name, Email, Role, Joined
- Inline edit row: click Edit → name/email inputs + role `<Select>` become editable
- Save → `PATCH /api/admin/users/[id]` `{ name, email, role }`
- Delete → confirm dialog → `DELETE /api/admin/users/[id]`
- Toast on success/error

### `/admin/media`
**File:** `src/app/[locale]/admin/media/page.tsx`

Server component — calls Cloudinary Admin API to list all resources in `trip-planner/` folder, passes to client grid.

**Client grid** `src/components/admin/media-grid.tsx`:
- Thumbnail for images, video icon for videos
- Shows: filename, size (KB/MB), upload date
- Delete button → `DELETE /api/admin/media` with `{ publicId }` body → Cloudinary destroy
- Toast on success/error; card removed from grid on success

---

## New API Routes

All routes call `auth()` and return `403` if `session.user.role !== 'admin'`.

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/admin/users` | List all users (id, name, email, role, createdAt) |
| PATCH | `/api/admin/users/[id]` | Update name, email, role |
| DELETE | `/api/admin/users/[id]` | Delete user by id |
| GET | `/api/admin/media` | List Cloudinary resources in trip-planner/ |
| DELETE | `/api/admin/media` | Destroy Cloudinary asset by publicId |

---

## Error Handling

| Scenario | Response |
|----------|---------|
| Non-admin hits `/admin/*` page | Redirect to `/` |
| Non-admin hits admin API | 403 `{ error: "Forbidden" }` |
| PATCH with duplicate email | 409 `{ error: "Email already in use" }` |
| DELETE non-existent user | 404 `{ error: "Not found" }` |
| Cloudinary destroy fails | 500, toast error, asset stays in grid |
| Delete own account (admin self-delete) | 400 `{ error: "Cannot delete your own account" }` |

---

## File Map

| Action | Path |
|--------|------|
| Modify | `src/lib/models/user.ts` — add role field |
| Modify | `src/lib/auth.ts` — pass role through JWT/session |
| Create | `src/types/next-auth.d.ts` — extend Session/JWT types |
| Modify | `src/app/[locale]/admin/layout.tsx` — auth gate + new nav links |
| Create | `src/app/[locale]/admin/users/page.tsx` |
| Create | `src/components/admin/users-table.tsx` |
| Create | `src/app/[locale]/admin/media/page.tsx` |
| Create | `src/components/admin/media-grid.tsx` |
| Create | `src/app/api/admin/users/route.ts` (GET, POST) |
| Create | `src/app/api/admin/users/[id]/route.ts` (PATCH, DELETE) |
| Create | `src/app/api/admin/media/route.ts` (GET, DELETE) |
| Modify | `src/lib/cloudinary.ts` — add listResources + destroyResource helpers |

---

## Out of Scope

- Pagination for users or media list (deferred — low volume expected)
- Bulk delete
- Media upload from admin media page (done via place form / profile / trips)
- Email notifications on user deletion
