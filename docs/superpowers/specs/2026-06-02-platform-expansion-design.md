# Platform Expansion — RBAC + Business + Super Admin Design Spec

**Date:** 2026-06-02  
**Status:** Approved

---

## Overview

Expand the existing AI Trip Planner into a full SaaS platform with three distinct dashboard types, four user roles, and complete role-based access control. Keep existing stack: Next.js 16, MongoDB/Mongoose, NextAuth v5, Tailwind v4, shadcn/ui.

---

## Phase 1: RBAC + Roles

### User Roles

| Role | Description | Default |
|------|-------------|---------|
| `tourist` | Regular end user. Browses, plans trips, makes reservations. | ✓ yes |
| `business` | Business owner. Manages listings, views analytics. | no |
| `admin` | Platform moderator. Manages places, cities, reservations. | no |
| `superadmin` | Full platform control. Manages users, approvals, reports. | no |

### UserModel Changes

Replace the existing `role: 'user' | 'admin'` (from previous plan) with:

```
role: { type: String, enum: ['tourist','business','admin','superadmin'], default: 'tourist' }
```

All existing functionality treating `'user'` maps to `'tourist'`. Existing `'admin'` maps to `'superadmin'` for the make-admin script.

### JWT + Session

NextAuth JWT callback: on sign-in, fetch `dbUser.role` from DB, set `token.role`. Session callback: expose `session.user.role`. Type declaration in `src/types/next-auth.d.ts` covers this.

### Route Protection Matrix

| Route Group | Allowed | Redirect if not |
|-------------|---------|----------------|
| `/[locale]/*` (public) | everyone | — |
| `/[locale]/dashboard/*` | tourist, business, admin, superadmin (logged in) | `/login` |
| `/[locale]/business/*` | business, admin, superadmin | `/` |
| `/[locale]/admin/*` | admin, superadmin | `/` |
| `/[locale]/superadmin/*` | superadmin only | `/` |

Each route group's `layout.tsx` calls `auth()` and redirects on mismatch.

### Business Role Upgrade Flow

1. Tourist clicks "Become a Business Owner" on profile page
2. Form: business name, type, description → creates `BusinessRequestModel` doc with `status: 'pending'`
3. Superadmin sees pending requests in `/superadmin/businesses` → Approve / Reject
4. Approve: updates `UserModel.role = 'business'`, `BusinessRequestModel.status = 'approved'`
5. Reject: sets `status: 'rejected'` with optional reason, user notified via toast on next login

### Header Navigation (role-adaptive)

- **tourist/unauthenticated:** Home, Cities, Map, AI Planner, Trips, Tickets
- **business:** same + "My Business" → `/business`
- **admin:** same + "Admin" → `/admin`
- **superadmin:** same + "Admin" → `/admin` + "Super Admin" → `/superadmin`

---

## Phase 2: Business Owner Dashboard (`/business`)

### Route Group

`src/app/[locale]/business/` — own layout with sidebar. Protected: `business | admin | superadmin`.

### Sidebar Navigation

Overview · Listings · Reviews · Media · Analytics · Billing

### PlaceModel Changes

Add fields to existing `PlaceModel`:
- `ownerId: String` — userId of the business owner
- `status: { type: String, enum: ['pending','active','rejected'], default: 'pending' }`
- `featured: { type: Boolean, default: false }`
- `rejectionReason: String`

Existing places (seeded data) get `status: 'active'`, `ownerId: null`.

### Pages

#### `/business` — Overview
Server component. Aggregates:
- Total listings count
- Total views (sum of `Place.viewCount` — new field)
- Average rating across listings
- Recent reviews (last 5)

KPI cards + recent activity list.

#### `/business/listings` — Listings Table
Server component fetches `PlaceModel.find({ ownerId: session.user.id })`.  
Client table: Name · Status badge · Views · Rating · Actions (Edit / Delete).  
"Add New Listing" button → `/business/listings/new`.

#### `/business/listings/new` and `/business/listings/[id]/edit` — Listing Form
Same fields as admin `PlaceForm` + `FileUploader` for photos/videos.  
On submit: `POST /api/business/listings` (new) or `PATCH /api/business/listings/[id]`.  
New listing created with `status: 'pending'` — awaits superadmin approval.

#### `/business/reviews` — Reviews
Lists all `ReviewModel` docs where `placeId` in owner's places.  
Columns: Place · Reviewer · Rating · Text · Date · Actions.  
"Reply" → inline textarea → `PATCH /api/business/reviews/[id]/reply`.  
"Flag" → creates `ReportModel` doc.

#### `/business/media` — Media Gallery
Cloudinary grid of files in `trip-planner/business/{userId}/` folder.  
Uses `FileUploader` + `MediaGrid` components.

#### `/business/analytics` — Analytics
Line chart: listing views over last 30 days (from `ViewModel` or aggregated from place stats).  
Bar chart: top 5 listings by views.  
Simple stat cards: total bookings, avg rating.  
Charts via `recharts`.

#### `/business/billing` — Billing
Static page showing current plan (Free). "Upgrade to Pro" CTA — Stripe deferred.

### New API Routes (business prefix)

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/business/listings` | List owner's listings |
| POST | `/api/business/listings` | Create listing (status: pending) |
| PATCH | `/api/business/listings/[id]` | Update listing (own only) |
| DELETE | `/api/business/listings/[id]` | Delete listing (own only) |
| PATCH | `/api/business/reviews/[id]/reply` | Add reply to review |

All routes: `session.user.role` must be `business | admin | superadmin` and `ownerId === session.user.id` (except admin/superadmin bypass ownership check).

---

## Phase 3: Super Admin Dashboard (`/superadmin`)

### Route Group

`src/app/[locale]/superadmin/` — own layout with sidebar. Protected: `superadmin` only.

### Sidebar Navigation

Overview · Users · Businesses · Content · Reports · Security

### Pages

#### `/superadmin` — Executive Overview
KPI cards: total users, total businesses, total listings, pending approvals.  
Sparkline charts: user signups last 30 days, new listings last 30 days.  
Quick actions: "View pending businesses", "View reported content".

#### `/superadmin/users` — User Management
Table of all users (from `UserModel`): Name · Email · Role · Joined · Status.  
Inline edit: name, email, role (dropdown: tourist/business/admin/superadmin).  
Suspend: sets `UserModel.suspended: Boolean = true` — suspended users get 403 on login.  
Delete: `DELETE /api/superadmin/users/[id]`.  
Uses extended `UsersTable` component from admin plan.

#### `/superadmin/businesses` — Business Approval
Two tabs: **Pending** | **Active** | **Rejected**.  
Pending: lists `BusinessRequestModel.status = 'pending'` + associated place listings.  
Approve → `PATCH /api/superadmin/businesses/[id]/approve` → sets role + listing status.  
Reject → modal with reason field → `PATCH /api/superadmin/businesses/[id]/reject`.

#### `/superadmin/content` — Content Moderation
Lists `ReportModel` docs with `status: 'pending'`.  
Columns: Type (review/listing) · Reporter · Reason · Date · Actions.  
"Remove content" → deletes the reported item.  
"Dismiss" → marks report resolved without action.  
"Warn user" → sets `UserModel.warnings += 1`.

#### `/superadmin/reports` — Analytics & Reports
Line chart: user signups over time.  
Bar chart: listings by category.  
Bar chart: listings by city.  
All data from MongoDB aggregations — no external analytics service.

#### `/superadmin/security` — Audit Log
Table of `AuditLogModel` entries: Admin · Action · Target · Timestamp.  
Read-only. Logged automatically by all superadmin API routes that mutate data.

### New API Routes (superadmin prefix)

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/superadmin/users` | List all users |
| PATCH | `/api/superadmin/users/[id]` | Update role/name/email/suspended |
| DELETE | `/api/superadmin/users/[id]` | Delete user |
| GET | `/api/superadmin/businesses` | List business requests |
| PATCH | `/api/superadmin/businesses/[id]/approve` | Approve business request |
| PATCH | `/api/superadmin/businesses/[id]/reject` | Reject with reason |
| GET | `/api/superadmin/content` | List reports |
| PATCH | `/api/superadmin/content/[id]` | Resolve report (remove/dismiss/warn) |
| GET | `/api/superadmin/reports` | Aggregated platform stats |
| GET | `/api/superadmin/security` | Audit log entries |

All routes check `session.user.role === 'superadmin'` → 403 otherwise. Mutating actions write to `AuditLogModel`.

---

## New Models

### `ReviewModel` (`src/lib/models/review.ts`)
```
placeId: String (required)
userId: String (required)
userName: String
rating: Number (1-5, required)
text: String
reply: String
flagged: Boolean (default: false)
createdAt: Date
```

### `ReportModel` (`src/lib/models/report.ts`)
```
reporterId: String (required)
targetType: String (enum: ['review','listing'])
targetId: String (required)
reason: String (required)
status: String (enum: ['pending','resolved','dismissed'], default: 'pending')
createdAt: Date
```

### `AuditLogModel` (`src/lib/models/audit-log.ts`)
```
adminId: String (required)
adminEmail: String
action: String (required) — e.g. 'DELETE_USER', 'APPROVE_BUSINESS'
targetType: String
targetId: String
metadata: Mixed
createdAt: Date
```

### `BusinessRequestModel` (`src/lib/models/business-request.ts`)
```
userId: String (required, unique)
businessName: String (required)
businessType: String
description: String
status: String (enum: ['pending','approved','rejected'], default: 'pending')
rejectionReason: String
createdAt: Date
```

### PlaceModel additions
```
ownerId: String
status: String (enum: ['pending','active','rejected'], default: 'active')
featured: Boolean (default: false)
rejectionReason: String
viewCount: Number (default: 0)
```

---

## File Map

| Action | Path |
|--------|------|
| Modify | `src/lib/models/user.ts` — expand role enum, add `suspended` |
| Create | `src/lib/models/review.ts` |
| Create | `src/lib/models/report.ts` |
| Create | `src/lib/models/audit-log.ts` |
| Create | `src/lib/models/business-request.ts` |
| Modify | `src/lib/models/place.ts` — add ownerId, status, featured, viewCount |
| Modify | `src/lib/auth.ts` — role in JWT/session (updated enum) |
| Modify | `src/components/site/site-header.tsx` — role-adaptive nav |
| Create | `src/app/[locale]/business/layout.tsx` |
| Create | `src/app/[locale]/business/page.tsx` |
| Create | `src/app/[locale]/business/listings/page.tsx` |
| Create | `src/app/[locale]/business/listings/new/page.tsx` |
| Create | `src/app/[locale]/business/listings/[id]/edit/page.tsx` |
| Create | `src/app/[locale]/business/reviews/page.tsx` |
| Create | `src/app/[locale]/business/media/page.tsx` |
| Create | `src/app/[locale]/business/analytics/page.tsx` |
| Create | `src/app/[locale]/business/billing/page.tsx` |
| Create | `src/app/[locale]/superadmin/layout.tsx` |
| Create | `src/app/[locale]/superadmin/page.tsx` |
| Create | `src/app/[locale]/superadmin/users/page.tsx` |
| Create | `src/app/[locale]/superadmin/businesses/page.tsx` |
| Create | `src/app/[locale]/superadmin/content/page.tsx` |
| Create | `src/app/[locale]/superadmin/reports/page.tsx` |
| Create | `src/app/[locale]/superadmin/security/page.tsx` |
| Create | `src/components/business/listings-table.tsx` |
| Create | `src/components/business/business-overview.tsx` |
| Create | `src/components/business/reviews-table.tsx` |
| Create | `src/components/business/analytics-charts.tsx` |
| Create | `src/components/superadmin/businesses-approval.tsx` |
| Create | `src/components/superadmin/content-moderation.tsx` |
| Create | `src/components/superadmin/audit-log-table.tsx` |
| Create | `src/components/superadmin/platform-stats.tsx` |
| Create | `src/app/api/business/listings/route.ts` |
| Create | `src/app/api/business/listings/[id]/route.ts` |
| Create | `src/app/api/business/reviews/[id]/reply/route.ts` |
| Create | `src/app/api/superadmin/users/[id]/route.ts` |
| Create | `src/app/api/superadmin/businesses/[id]/approve/route.ts` |
| Create | `src/app/api/superadmin/businesses/[id]/reject/route.ts` |
| Create | `src/app/api/superadmin/content/[id]/route.ts` |
| Create | `src/app/api/superadmin/reports/route.ts` |
| Create | `src/app/api/superadmin/security/route.ts` |
| Install | `recharts` — charts for analytics |

---

## Out of Scope (future phases)

- Stripe subscriptions (Phase 7)
- Real AI integration / Claude API (Phase 4)
- Mapbox maps (Phase 6)
- Email notifications / Resend (Phase 8)
- Reviews by tourists on public place pages (Phase 5)
- Weather widget
- Budget tracker
