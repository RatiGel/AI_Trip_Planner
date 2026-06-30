# Password Reset via Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user who forgot their password set a new one via a time-limited, single-use link emailed to them.

**Architecture:** Two API routes (`forgot-password`, `reset-password`) plus two `[locale]` pages. Raw token (`crypto.randomBytes(32)`) is emailed; its `sha256` hash + a 1-hour expiry are stored on the User doc. Reset looks the user up by token hash + unexpired, sets a new bcrypt password, clears the reset fields. Email sent via Resend.

**Tech Stack:** Next.js 16 (App Router, async `params`), next-intl 4, Mongoose, NextAuth v5, bcryptjs, Node `crypto`, Resend.

## Global Constraints

- Next.js 16: `params`/`searchParams` are **Promises** — always `await`.
- Import `Link`, `useRouter` from `@/i18n/navigation`, never `next/navigation`.
- Server components call `setRequestLocale(locale)` before rendering.
- i18n keys added to **all three** message files (`en`, `ka`, `ru`) together.
- User model lives at `src/lib/models/user.ts`; import `{ UserModel }`.
- `connectDB()` from `@/lib/db` before any model query.
- bcrypt hash cost = **12** (match register route).
- Email is **lowercased + trimmed** for all lookups (model has `lowercase:true`).
- No test runner configured — each task verified manually (DB query / curl / browser). Do **not** add vitest/jest.
- Forgot endpoint **always** returns generic `200 { ok: true }` — no email enumeration.

## File Structure

| File | Responsibility |
|------|----------------|
| `src/lib/models/user.ts` (modify) | Add `resetTokenHash`, `resetTokenExpiry` fields |
| `src/lib/email.ts` (create) | Resend client + `sendPasswordResetEmail` |
| `src/app/api/auth/forgot-password/route.ts` (create) | Generate token, store hash, send mail, generic 200 |
| `src/app/api/auth/reset-password/route.ts` (create) | Validate token, set new password, clear fields |
| `src/app/[locale]/forgot-password/page.tsx` (create) | Server page → renders `ForgotPasswordForm` |
| `src/components/site/forgot-password-form.tsx` (create) | Client email-entry form |
| `src/app/[locale]/reset-password/page.tsx` (create) | Server page, awaits `searchParams.token` → renders form |
| `src/components/site/reset-password-form.tsx` (create) | Client new-password form |
| `src/components/site/auth-card.tsx` (modify) | Add "Forgot password?" link in signin mode |
| `messages/{en,ka,ru}.json` (modify) | `auth.forgot.*`, `auth.reset.*` keys |
| `.env.local` (modify) | `RESEND_API_KEY`, `RESEND_FROM` |

---

### Task 1: Add reset fields to User model + install Resend

**Files:**
- Modify: `src/lib/models/user.ts`
- Modify: `.env.local`
- Modify: `package.json` (via npm install)

**Interfaces:**
- Produces: `IUser.resetTokenHash?: string`, `IUser.resetTokenExpiry?: Date`; same two fields on the Mongoose schema. Used by Tasks 3 and 4.

- [ ] **Step 1: Install Resend**

```bash
npm install resend
```

- [ ] **Step 2: Add env vars to `.env.local`**

Append these lines (fill real values; `RESEND_FROM` must be a verified-domain sender):

```
RESEND_API_KEY=re_replace_me
RESEND_FROM=noreply@yourdomain.com
```

- [ ] **Step 3: Add fields to `IUser` interface**

In `src/lib/models/user.ts`, inside `interface IUser`, after the `createdAt: Date;` line add:

```ts
  resetTokenHash?: string;
  resetTokenExpiry?: Date;
```

- [ ] **Step 4: Add fields to the schema**

In the same file, inside the `UserSchema` field object, after `feeExempt: { type: Boolean, default: false },` add:

```ts
    resetTokenHash: { type: String, index: true, sparse: true },
    resetTokenExpiry: { type: Date },
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors referencing `user.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/models/user.ts package.json package-lock.json
git commit -m "feat(auth): add reset token fields to User, install resend"
```

> Note: `.env.local` is gitignored — do not commit it.

---

### Task 2: Email helper

**Files:**
- Create: `src/lib/email.ts`

**Interfaces:**
- Consumes: `RESEND_API_KEY`, `RESEND_FROM` from env.
- Produces: `sendPasswordResetEmail(to: string, link: string, locale: string): Promise<void>`. Used by Task 3.

- [ ] **Step 1: Write `src/lib/email.ts`**

```ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const SUBJECTS: Record<string, string> = {
  en: "Reset your password",
  ka: "პაროლის აღდგენა",
  ru: "Сброс пароля",
};

const BODY: Record<string, (link: string) => string> = {
  en: (link) =>
    `<p>We received a request to reset your password.</p>
     <p><a href="${link}">Click here to set a new password</a>. This link expires in 1 hour.</p>
     <p>If you didn't request this, ignore this email.</p>`,
  ka: (link) =>
    `<p>მივიღეთ პაროლის აღდგენის მოთხოვნა.</p>
     <p><a href="${link}">დააჭირეთ აქ ახალი პაროლის დასაყენებლად</a>. ბმული მოქმედებს 1 საათის განმავლობაში.</p>
     <p>თუ ეს თქვენ არ მოგითხოვიათ, უგულებელყავით ეს წერილი.</p>`,
  ru: (link) =>
    `<p>Мы получили запрос на сброс пароля.</p>
     <p><a href="${link}">Нажмите здесь, чтобы задать новый пароль</a>. Ссылка действует 1 час.</p>
     <p>Если вы не запрашивали это, проигнорируйте письмо.</p>`,
};

export async function sendPasswordResetEmail(to: string, link: string, locale: string) {
  const lang = SUBJECTS[locale] ? locale : "en";
  await resend.emails.send({
    from: process.env.RESEND_FROM!,
    to,
    subject: SUBJECTS[lang],
    html: BODY[lang](link),
  });
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat(auth): add password reset email helper (resend)"
```

---

### Task 3: Forgot-password API route

**Files:**
- Create: `src/app/api/auth/forgot-password/route.ts`

**Interfaces:**
- Consumes: `sendPasswordResetEmail` (Task 2); `resetTokenHash`/`resetTokenExpiry` (Task 1).
- Accepts `POST` JSON `{ email: string, locale?: string }`. Always responds `200 { ok: true }`.
- Produces: a stored `resetTokenHash` = `sha256(rawToken)` and `resetTokenExpiry` = now+1h on the matched user; emailed link `${NEXT_PUBLIC_APP_URL}/${locale}/reset-password?token=${rawToken}`.

- [ ] **Step 1: Write the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/lib/models/user";
import { sendPasswordResetEmail } from "@/lib/email";

const TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const { email, locale } = await req.json();
    const generic = NextResponse.json({ ok: true });

    if (!email || typeof email !== "string") return generic;

    await connectDB();
    const normalized = email.toLowerCase().trim();
    const user = await UserModel.findOne({ email: normalized });

    // Only users with a password (not OAuth-only) can reset. No enumeration: always generic.
    if (!user || !user.password) return generic;

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.resetTokenHash = hashToken(rawToken);
    user.resetTokenExpiry = new Date(Date.now() + TTL_MS);
    await user.save();

    const lang = ["en", "ka", "ru"].includes(locale) ? locale : "en";
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const link = `${base}/${lang}/reset-password?token=${rawToken}`;

    try {
      await sendPasswordResetEmail(normalized, link, lang);
    } catch (err) {
      console.error("Password reset email failed:", err);
      // Still return generic 200 — do not leak send failures.
    }

    return generic;
  } catch {
    return NextResponse.json({ ok: true });
  }
}
```

- [ ] **Step 2: Start dev server**

Run: `npm run dev` (leave running in another terminal).

- [ ] **Step 3: Manually verify generic response for unknown email**

Run:
```bash
curl -s -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"nobody@example.com","locale":"en"}'
```
Expected: `{"ok":true}` and **no** token written (unknown user).

- [ ] **Step 4: Manually verify token is written for a real user**

Use a real password-account email from your DB (e.g. one created via `/register`). Run the same curl with that email, then check Mongo:
```bash
npx tsx --env-file=.env.local -e "import('./src/lib/db.js').catch(()=>{}); " 2>/dev/null || true
```
Simpler: query in mongosh or Compass — confirm that user doc now has `resetTokenHash` (64 hex chars) and a future `resetTokenExpiry`. Note the raw token from the email (or temporarily `console.log(link)` in the route) for Task 4 testing.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/forgot-password/route.ts
git commit -m "feat(auth): forgot-password route — issue hashed reset token, email link"
```

---

### Task 4: Reset-password API route

**Files:**
- Create: `src/app/api/auth/reset-password/route.ts`

**Interfaces:**
- Consumes: `resetTokenHash`/`resetTokenExpiry` (Task 1).
- Accepts `POST` JSON `{ token: string, password: string }`.
- Returns `200 { ok: true }` on success; `400 { error }` on invalid/expired token or short password.
- Produces: new bcrypt `password` set, `resetTokenHash`/`resetTokenExpiry` unset.

- [ ] **Step 1: Write the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/lib/models/user";

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    await connectDB();
    const user = await UserModel.findOne({
      resetTokenHash: hashToken(token),
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
    }

    user.password = await bcrypt.hash(password, 12);
    user.resetTokenHash = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify rejects bad token**

Run:
```bash
curl -s -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"deadbeef","password":"newpass123"}'
```
Expected: `{"error":"Invalid or expired link"}` (HTTP 400).

- [ ] **Step 3: Verify rejects short password**

```bash
curl -s -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"deadbeef","password":"short"}'
```
Expected: `{"error":"Password must be at least 8 characters"}`.

- [ ] **Step 4: Verify happy path with the raw token from Task 3**

Use the raw token captured in Task 3 Step 4:
```bash
curl -s -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"<RAW_TOKEN>","password":"brandNewPass123"}'
```
Expected: `{"ok":true}`. Then confirm in DB the user's `resetTokenHash`/`resetTokenExpiry` are gone, and sign in at `/login` with `brandNewPass123` succeeds.

- [ ] **Step 5: Verify token is single-use**

Re-run the Step 4 curl with the same now-used token.
Expected: `{"error":"Invalid or expired link"}`.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/auth/reset-password/route.ts
git commit -m "feat(auth): reset-password route — validate token, set new password"
```

---

### Task 5: i18n keys

**Files:**
- Modify: `messages/en.json`, `messages/ka.json`, `messages/ru.json`

**Interfaces:**
- Produces: keys `auth.forgot.*` and `auth.reset.*` plus `auth.forgotLink`. Consumed by Tasks 6–8.

- [ ] **Step 1: Add to `messages/en.json`** — inside the existing `"auth": { ... }` object, after the last key:

```json
    "forgotLink": "Forgot password?",
    "forgot": {
      "title": "Reset your password",
      "subtitle": "Enter your email and we'll send you a reset link.",
      "button": "Send reset link",
      "sent": "If that email is registered, a reset link is on its way.",
      "backToLogin": "Back to sign in"
    },
    "reset": {
      "title": "Set a new password",
      "subtitle": "Choose a new password for your account.",
      "password": "New password",
      "button": "Update password",
      "success": "Password updated. You can now sign in.",
      "invalid": "This reset link is invalid or has expired.",
      "missingToken": "No reset token found. Request a new link."
    }
```

- [ ] **Step 2: Add to `messages/ka.json`** — same structure:

```json
    "forgotLink": "დაგავიწყდათ პაროლი?",
    "forgot": {
      "title": "პაროლის აღდგენა",
      "subtitle": "შეიყვანეთ ელფოსტა და გამოგიგზავნით აღდგენის ბმულს.",
      "button": "ბმულის გაგზავნა",
      "sent": "თუ ეს ელფოსტა რეგისტრირებულია, აღდგენის ბმული გზაშია.",
      "backToLogin": "უკან ავტორიზაციაში"
    },
    "reset": {
      "title": "ახალი პაროლის დაყენება",
      "subtitle": "აირჩიეთ ახალი პაროლი თქვენი ანგარიშისთვის.",
      "password": "ახალი პაროლი",
      "button": "პაროლის განახლება",
      "success": "პაროლი განახლდა. ახლა შეგიძლიათ შეხვიდეთ.",
      "invalid": "ეს ბმული არასწორია ან ვადაგასულია.",
      "missingToken": "აღდგენის ტოკენი ვერ მოიძებნა. მოითხოვეთ ახალი ბმული."
    }
```

- [ ] **Step 3: Add to `messages/ru.json`** — same structure:

```json
    "forgotLink": "Забыли пароль?",
    "forgot": {
      "title": "Сброс пароля",
      "subtitle": "Введите email — мы отправим ссылку для сброса.",
      "button": "Отправить ссылку",
      "sent": "Если этот email зарегистрирован, ссылка для сброса уже в пути.",
      "backToLogin": "Назад ко входу"
    },
    "reset": {
      "title": "Новый пароль",
      "subtitle": "Выберите новый пароль для вашего аккаунта.",
      "password": "Новый пароль",
      "button": "Обновить пароль",
      "success": "Пароль обновлён. Теперь вы можете войти.",
      "invalid": "Эта ссылка недействительна или устарела.",
      "missingToken": "Токен сброса не найден. Запросите новую ссылку."
    }
```

- [ ] **Step 4: Verify all three parse as valid JSON**

Run:
```bash
node -e "['en','ka','ru'].forEach(l=>{const m=require('./messages/'+l+'.json'); if(!m.auth.forgot||!m.auth.reset||!m.auth.forgotLink) throw new Error('missing keys in '+l); }); console.log('ok')"
```
Expected: `ok`.

- [ ] **Step 5: Commit**

```bash
git add messages/en.json messages/ka.json messages/ru.json
git commit -m "i18n(auth): add forgot/reset password keys (en, ka, ru)"
```

---

### Task 6: Forgot-password page + form

**Files:**
- Create: `src/components/site/forgot-password-form.tsx`
- Create: `src/app/[locale]/forgot-password/page.tsx`

**Interfaces:**
- Consumes: `auth.forgot.*` keys (Task 5); `POST /api/auth/forgot-password` (Task 3); `useLocale` for the `locale` field.
- Produces: route `/{locale}/forgot-password`.

- [ ] **Step 1: Write `src/components/site/forgot-password-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, locale }),
    });
    setLoading(false);
    setSent(true);
    toast.success(t("forgot.sent"));
  }

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">{t("forgot.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("forgot.subtitle")}</p>

        {sent ? (
          <p className="mt-6 text-sm text-muted-foreground">{t("forgot.sent")}</p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "…" : t("forgot.button")}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">
            {t("forgot.backToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `src/app/[locale]/forgot-password/page.tsx`**

```tsx
import { setRequestLocale } from "next-intl/server";
import { ForgotPasswordForm } from "@/components/site/forgot-password-form";

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ForgotPasswordForm />;
}
```

- [ ] **Step 3: Verify in browser**

Open `http://localhost:3000/en/forgot-password`. Expected: card with title "Reset your password", email field, "Send reset link" button, "Back to sign in" link. Submit with any email → success message shows, no error.

- [ ] **Step 4: Commit**

```bash
git add src/components/site/forgot-password-form.tsx src/app/[locale]/forgot-password/page.tsx
git commit -m "feat(auth): forgot-password page and form"
```

---

### Task 7: Reset-password page + form

**Files:**
- Create: `src/components/site/reset-password-form.tsx`
- Create: `src/app/[locale]/reset-password/page.tsx`

**Interfaces:**
- Consumes: `auth.reset.*` keys (Task 5); `POST /api/auth/reset-password` (Task 4); `token` prop from the page.
- Produces: route `/{locale}/reset-password?token=...`.

- [ ] **Step 1: Write `src/components/site/reset-password-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="container mx-auto flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">{t("reset.title")}</h1>
          <p className="mt-4 text-sm text-destructive">{t("reset.missingToken")}</p>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/forgot-password" className="font-medium text-primary hover:underline">
              {t("forgot.title")}
            </Link>
          </p>
        </div>
      </div>
    );
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error ?? t("reset.invalid"));
      return;
    }
    toast.success(t("reset.success"));
    router.push("/login");
  }

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">{t("reset.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("reset.subtitle")}</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t("reset.password")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "…" : t("reset.button")}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `src/app/[locale]/reset-password/page.tsx`**

```tsx
import { setRequestLocale } from "next-intl/server";
import { ResetPasswordForm } from "@/components/site/reset-password-form";

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  const { token } = await searchParams;
  setRequestLocale(locale);
  return <ResetPasswordForm token={token ?? ""} />;
}
```

- [ ] **Step 3: Verify missing-token state**

Open `http://localhost:3000/en/reset-password` (no query). Expected: card shows "This reset link..." missing-token message + link to forgot page.

- [ ] **Step 4: Verify full happy path in browser**

1. Go to `/en/forgot-password`, submit a real password-account email.
2. Grab the link from the received email (or server console if you logged it).
3. Open that link → set a new password (≥8 chars) → submit.
4. Expected: success toast, redirect to `/login`. Sign in with the new password works.

- [ ] **Step 5: Commit**

```bash
git add src/components/site/reset-password-form.tsx src/app/[locale]/reset-password/page.tsx
git commit -m "feat(auth): reset-password page and form"
```

---

### Task 8: Link from login page

**Files:**
- Modify: `src/components/site/auth-card.tsx`

**Interfaces:**
- Consumes: `auth.forgotLink` key (Task 5).
- Produces: a "Forgot password?" link visible only in signin mode, routing to `/forgot-password`.

- [ ] **Step 1: Add the link under the password field**

In `src/components/site/auth-card.tsx`, the password field block currently ends with `</div>` after the password `<Input>`. Immediately **after** that closing `</div>` (still inside the `<form>`), add a signin-only link:

```tsx
          {!isSignup && (
            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-primary hover:underline"
              >
                {t("forgotLink")}
              </Link>
            </div>
          )}
```

(`Link` is already imported from `@/i18n/navigation` in this file; `isSignup` and `t` are already in scope.)

- [ ] **Step 2: Verify in browser**

Open `/en/login`. Expected: "Forgot password?" link under the password field, links to `/en/forgot-password`. Open `/en/register` → link is **not** shown.

- [ ] **Step 3: Commit**

```bash
git add src/components/site/auth-card.tsx
git commit -m "feat(auth): add forgot-password link to login form"
```

---

## Final verification

- [ ] `npx tsc --noEmit` clean.
- [ ] `npm run lint` clean for touched files.
- [ ] End-to-end: request reset → email arrives → link sets new password → sign in works → reused link rejected.
- [ ] Unknown email + OAuth-only email both return generic success, send no usable link.
