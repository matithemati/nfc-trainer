# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # ESLint
```

There is no test suite configured.

To add shadcn/ui components:
```bash
npx shadcn@latest add <component-name>
```

## Architecture Overview

NFC Trainer is a Next.js 16 App Router application with MongoDB. It enables personal trainers to manage clients via NFC tags — scanning an NFC tag opens the trainer or client panel directly in a browser without authentication.

### User Roles

Three roles with distinct access patterns:
- **Admin**: manages trainers and their memberships via `/[lang]/admin/*`
- **Trainer**: authenticated dashboard at `/[lang]/trainer/` (Google OAuth required)
- **Client**: unauthenticated panel accessed by NFC scan at `/[lang]/c/[clientId]/`

### Route Structure

```
app/[lang]/                    # Language-prefixed root (pl or en)
  c/[clientId]/page.tsx        # Public client view (NFC scan entry point)
  trainer/page.tsx             # Authenticated trainer dashboard
  admin/                       # Admin panel (requires admin session)
  auth/signin/page.tsx         # Trainer/admin Google sign-in

app/api/
  admin/*                      # Admin-only CRUD for trainers/clients + logs
  trainer/*                    # Authenticated trainer operations (own data)
  clients/[clientId]/*         # Public read/write for NFC-accessed client pages
  auth/[...nextauth]/          # NextAuth handler
```

All API routes set `export const runtime = "nodejs"`.

### Authentication

Defined in `auth.ts` (root). Uses NextAuth v5 (beta) with Google OAuth and JWT sessions. Only pre-created trainers/admins can sign in — no self-registration. The JWT stores `trainerId` or `adminId` to avoid per-request DB lookups.

Helper functions in `lib/auth.ts` and `lib/admin.ts`:
- `requireTrainer()` — throws if not authenticated as a trainer
- `requireAdmin()` — throws if not authenticated as an admin
- `verifyClientOwnership(clientId)` — validates trainer owns the client
- `logAdminOperation(...)` — writes to `admin-logs` collection with before/after snapshots

Auth errors thrown as `"Unauthorized: ..."` messages are caught and returned as 401 responses.

### Database

`lib/db.ts` exports `getDb()` — a singleton MongoDB connection. All collections are accessed directly by name (no ODM):
- `trainers` — name, email, maxClients, expirationDate, exerciseNames[], notes[]
- `clients` — trainerId (ObjectId ref), name, workoutPlan, dietPlan
- `admin` — email, username, disabled
- `workout-logs` — clientId, date (ISO string), exercises[]
- `weight-logs` — clientId, date (ISO string), weight (number)
- `admin-logs` — audit trail for all admin CRUD operations

**Soft delete pattern**: records are not physically deleted; they get `deletedAt` and `deletedBy` fields. Queries exclude deleted records with `{ deletedAt: { $exists: false } }`.

**Trainer membership**: `expirationDate` (ISO date string or null). Null means no expiration (always active). The client panel blocks all content when the trainer's membership is expired.

### Internationalisation

All user-facing routes are prefixed with `[lang]` (either `pl` or `en`, defaulting to `pl`). `lib/i18n.ts` exports `getMessages(lang)` returning `{ t, lang }`. The `t(key)` function returns the translation string or the key itself if missing. All translation strings live in `lib/translations.ts`.

### UI

shadcn/ui (new-york style) with Tailwind CSS v4. UI primitives are in `components/ui/`. Feature components are in `components/client/` (trainer and client views) and `components/admin/`. `components/providers/` contains `SessionProvider` and `ThemeProvider` wrappers.

The large `TrainerView` and `ClientView` components are client components (`"use client"`) that fetch data from the API on mount and manage all state locally.

### Environment Variables Required

```
MONGODB_URI
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
NEXTAUTH_SECRET
```