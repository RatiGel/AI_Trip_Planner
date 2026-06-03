# Phase 3: Super Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task.

**Goal:** Build the full Super Admin Dashboard — user management, business approval workflow, content moderation, platform reports, and audit log.

**Architecture:** All superadmin routes check `session.user.role === 'superadmin'` and return 403 otherwise. Mutating actions (approve/reject/delete/warn) write an entry to `AuditLogModel`. `ReportModel` tracks flagged content. `BusinessRequestModel` (Phase 1) drives the approval workflow.

**Tech Stack:** Next.js 16, MongoDB/Mongoose, NextAuth v5, Tailwind v4, shadcn/ui, recharts, TypeScript

---

## File Map

| Action | Path |
|--------|------|
| Create | `src/lib/models/report.ts` |
| Create | `src/lib/models/audit-log.ts` |
| Modify | `src/lib/models/user.ts` — add `warnings: Number` |
| Create | `src/app/api/superadmin/users/[id]/route.ts` — PATCH + DELETE |
| Create | `src/app/api/superadmin/businesses/[id]/approve/route.ts` |
| Create | `src/app/api/superadmin/businesses/[id]/reject/route.ts` |
| Create | `src/app/api/superadmin/content/[id]/route.ts` — PATCH resolve |
| Create | `src/app/api/superadmin/reports/route.ts` — GET stats |
| Create | `src/components/superadmin/users-table.tsx` |
| Create | `src/components/superadmin/businesses-approval.tsx` |
| Create | `src/components/superadmin/content-moderation.tsx` |
| Create | `src/components/superadmin/platform-charts.tsx` |
| Create | `src/components/superadmin/audit-log-table.tsx` |
| Modify | `src/app/[locale]/superadmin/page.tsx` — live stats |
| Create | `src/app/[locale]/superadmin/users/page.tsx` |
| Create | `src/app/[locale]/superadmin/businesses/page.tsx` |
| Create | `src/app/[locale]/superadmin/content/page.tsx` |
| Create | `src/app/[locale]/superadmin/reports/page.tsx` |
| Create | `src/app/[locale]/superadmin/security/page.tsx` |
