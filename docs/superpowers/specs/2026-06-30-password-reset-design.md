# Password Reset via Email — Design

**Date:** 2026-06-30
**Status:** Approved

## Goal

Let a user who forgot their password set a new one via a time-limited, single-use link sent to their email.

## Decisions

| Decision | Choice |
|----------|--------|
| Email provider | Resend (SDK + react-email optional) |
| Token storage | Fields on User doc |
| Token lifetime | 1 hour, single-use |
| OAuth-only account (no password) | Generic 200, send no email (no enumeration leak) |
| FROM address | User's own verified domain via `RESEND_FROM` env |

## Flow

1. User visits `/{locale}/forgot-password`, enters email, submits.
2. `POST /api/auth/forgot-password` → look up user by lowercased email.
   - If user exists **and** has a `password` (not OAuth-only): generate raw token `crypto.randomBytes(32).toString("hex")`, store `sha256(token)` as `resetTokenHash` and `now + 1h` as `resetTokenExpiry` on the user doc, send email with link `${NEXT_PUBLIC_APP_URL}/{locale}/reset-password?token=RAW`.
   - In all cases (user missing, OAuth-only, or success): respond `200 { ok: true }` with a generic message. No enumeration.
3. User clicks link → `/{locale}/reset-password?token=...`, enters new password (min 8), submits.
4. `POST /api/auth/reset-password` with `{ token, password }`:
   - Compute `sha256(token)`, find user where `resetTokenHash` matches **and** `resetTokenExpiry > now`.
   - If none → `400 { error: "Invalid or expired link" }`.
   - Else → bcrypt-hash (cost 12) new password, set `password`, unset `resetTokenHash` + `resetTokenExpiry`. Respond `200 { ok: true }`.
5. Reset page on success → redirect to `/login` with a success flash.

## Schema changes (`src/lib/models/user.ts`)

Add to `IUser` and `UserSchema`:

```ts
resetTokenHash?: string;   // sha256 hex of raw token
resetTokenExpiry?: Date;
```

Index: `resetTokenHash` sparse (lookup field). No unique constraint.

## New / changed files

| File | Purpose |
|------|---------|
| `src/lib/email.ts` | Resend client + `sendPasswordResetEmail(to, link, locale)` |
| `src/app/api/auth/forgot-password/route.ts` | Request endpoint |
| `src/app/api/auth/reset-password/route.ts` | Reset endpoint |
| `src/app/[locale]/forgot-password/page.tsx` | Email entry form |
| `src/app/[locale]/reset-password/page.tsx` | New password form (reads `token` from searchParams) |
| `src/lib/models/user.ts` | Add reset fields |
| `src/app/[locale]/login/page.tsx` | Add "Forgot password?" link |
| `messages/{en,ka,ru}.json` | i18n keys for both pages + email |

## Security

- **No email enumeration:** forgot endpoint always returns generic 200.
- **Token hashed at rest:** store `sha256(rawToken)`. A DB leak yields hashes, not usable links.
- **Single-use:** reset fields cleared on successful reset.
- **Short TTL:** 1 hour.
- **OAuth-only accounts:** no password to reset → behave like missing user (generic 200, no mail).
- **Token entropy:** `crypto.randomBytes(32)` (256 bits).
- Token compared by hashed equality; expiry checked server-side in the query.

## Env vars (add to `.env.local`)

```
RESEND_API_KEY=...           # from Resend dashboard
RESEND_FROM=noreply@yourdomain.com   # verified-domain sender
```

`NEXT_PUBLIC_APP_URL` already present — used to build the link.

## i18n

next-intl 4. Add keys under e.g. `auth.forgot.*` and `auth.reset.*` to all three message files together. Pages are server components calling `setRequestLocale(locale)`; forms are client components.

## Out of scope (YAGNI)

- Rate limiting (note as a follow-up; not built now).
- Reset history / audit collection.
- Account-lockout on repeated requests.
