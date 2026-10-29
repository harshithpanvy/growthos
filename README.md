# GrowthOS — Full-Stack Student Acquisition, Referral, Learning-Resource & Campaign Analytics Platform

**GrowthOS** is a production-minded full-stack platform built with **Next.js App Router, TypeScript, React, Supabase Auth, and Supabase PostgreSQL (with Row Level Security)** for the workshop:

> **“Build Your First AI Project in 60 Minutes”**
> *Hero Headline: “60 Minutes. One AI Project. Your First Step.”*

The platform connects student acquisition, UTM & referral attribution, milestone-based learning resource unlocking, workshop preparation, project submissions, and administrator campaign measurement (targeting **500 final-year engineering student registrations in 7 days within a ₹2,000 budget cap**) into one coherent, database-backed system.

---

## 1. Architecture & Route Structure

### Public Routes
- `/` — Conversion-focused workshop landing page with UTM & `?ref=` capture, agenda, learning outcomes, milestone overview, FAQ, and trust/privacy commitments.
- `/workshop` — Detailed workshop curriculum, preparation checklist, and interactive 60-Minute AI Project Scoper preview.
- `/register` — Student registration preserving `?ref=` and UTM attribution, normalizing email addresses, and supporting Supabase email confirmation.
- `/login` — Student & administrator sign-in and password reset flow.
- `/auth/callback` — Supabase Auth code exchange & session cookie synchronization.
- `/privacy` — Privacy policy detailing data minimization and referral privacy masking.
- `/terms` — Terms of participation and referral anti-abuse policy.

### Protected Student Routes (`/dashboard/*`)
- `/dashboard` — Student overview: registration status, referral summary card, quick actions, and milestone progress.
- `/dashboard/profile` — View and update permitted profile fields (`full_name`, `college`, `graduation_year`) while protecting system-managed fields (`role`, `referral_code`, `email`).
- `/dashboard/referrals` — Personal referral link (`?ref=GROW-XXXXXX`), copy & 1-click WhatsApp share templates, qualified vs. pending referral counts, milestone progress bar (`0 → 1 → 3 → 5`), and privacy-masked referral history.
- `/dashboard/resources` — Immediate access to the Starter Kit (`0 referrals`) and server-verified unlocking for bonus resources (`1`, `3`, and `5` qualified referrals).
- `/dashboard/workshop` — Workshop date/time, live joining link (or honest empty state until published), agenda, and interactive preparation checklist.
- `/dashboard/projects` — Submit 60-minute workshop projects (`title`, `problem_statement`, `description`, `tech_stack`, `repo_url`, `demo_url`, `notes`) and track instructor review status.

### Protected Administrator Routes (`/admin/*`)
- `/admin` — Campaign analytics overview: real database counts for registrations, daily trends, source breakdown, referral conversions, reward unlocks, attendance, and project submissions—clearly separated from configured campaign targets and the interactive planning simulator.
- `/admin/students` — Server-paginated, searchable, filterable student management table with student record inspector and audited CSV export.
- `/admin/referrals` — Top referrers summary, attribution event inspection, suspicious velocity burst flags, and audited manual review (`Approve`, `Flag`, `Reject` with mandatory audit reason).
- `/admin/resources` — Create, edit, publish/unpublish, and archive learning resources; configure private Supabase Storage paths and reward milestone thresholds.
- `/admin/campaigns` — Configure campaign name, registration goal (`500`), start/end dates (`7 days`), budget cap (`₹2,000`), actual spend, UTM campaign identifier, and channel hypotheses.
- `/admin/workshop` — Configure workshop title, schedule, timezone, joining URL, and project submission window.
- `/admin/attendance` — Mark student attendance (`attended`, `absent`, `registered`) with recorded administrator actor and timestamp.
- `/admin/projects` — Review student project submissions (`approved`, `under_review`, `needs_work`) and provide instructor feedback.
- `/admin/audit-logs` — Paginated, immutable audit log viewer for all privileged administrator actions.
- `/admin/settings` — Security checklist and SQL instructions for granting/revoking administrator roles.

### Server API Route Handlers (`app/api/*`)
- `POST / DELETE /api/auth/session` — Synchronizes Supabase Auth tokens with `HttpOnly` server cookies (`gos-access-token`, `gos-refresh-token`).
- `POST /api/attribution` — Rate-limited funnel event recorder (`landing_view`, `registration_started`, `registration_completed`, `referral_shared`).
- `GET /api/student/overview` — Server-authorized student data loader; redacts locked resource markdown/links on the server.
- `PATCH /api/student/profile` — Server-authorized profile updater blocking privilege escalation fields.
- `GET /api/student/resources/[id]/download` — Verifies database referral count against `unlock_threshold`, logs access in `resource_access_events`, and generates short-lived signed URLs for private storage files.
- `GET / POST /api/student/projects` — Student project submission handler.
- `GET /api/admin/overview`, `/api/admin/students`, `/api/admin/referrals`, `/api/admin/resources`, `/api/admin/campaigns`, `/api/admin/workshop`, `/api/admin/projects`, `/api/admin/audit-logs` — Server-authorized administrator endpoints protected by `requireAdminAuth()`.

---

## 2. Prerequisites

- **Node.js** 20 LTS or newer
- **npm** 10+
- A **Supabase** project (free tier works out of the box)

---

## 3. Local Installation & Environment Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

3. Fill in your Supabase project values in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
   SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY_SERVER_ONLY
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   SUPABASE_RESOURCE_BUCKET=growthos-resources
   ```
   > **Security Rule:** Never expose `SUPABASE_SERVICE_ROLE_KEY` in a `NEXT_PUBLIC_` variable or client component.

---

## 4. Supabase Database & Storage Setup

1. Open your Supabase Dashboard → **SQL Editor → New query**.
2. Paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql) (also mirrored in [`supabase/migrations/20261029000000_growthos_full_schema.sql`](supabase/migrations/20261029000000_growthos_full_schema.sql)) and click **Run**.
3. This script idempotently creates all 11 tables (`profiles`, `campaigns`, `workshops`, `attribution_events`, `referral_attributions`, `reward_rules`, `resources`, `reward_unlocks`, `resource_access_events`, `attendance_records`, `project_submissions`, `admin_audit_logs`), foreign keys, unique/check constraints, indexes, triggers, RLS policies, and default configuration rows (with **zero** fabricated student or analytics rows).
4. *(Optional Private File Storage)*: In Supabase Dashboard → **Storage**, create a **Private** bucket named `growthos-resources`. Upload any downloadable PDFs or templates there and set their `storage_bucket` and `storage_path` in `/admin/resources`.

---

## 5. Email Authentication & Redirect Configuration

1. In Supabase Dashboard → **Authentication → URL Configuration**:
   - Set **Site URL** to `http://localhost:3000` for local development (or your production domain in production).
   - Add Redirect URLs:
     - `http://localhost:3000/auth/callback`
     - `https://your-production-domain.vercel.app/auth/callback`
2. **Delayed Email Confirmation & Referral Attribution Behavior:**
   - When a referred student signs up at `/register?ref=GROW-XXXXXX`, `create_growthos_profile()` immediately records the referral in `public.referral_attributions`.
   - If email confirmation is required on your Supabase project, the attribution starts in `status = 'pending'`.
   - As soon as the student clicks their confirmation link (`auth.users.email_confirmed_at` updates), the database trigger `handle_auth_user_email_confirmed()` transitions the referral to `status = 'qualified'` and runs `evaluate_and_unlock_rewards()` for the referrer.

---

## 6. Safe Administrator Bootstrap Procedure

GrowthOS does **not** make the first registered user an administrator and does **not** expose any public endpoint for role escalation.

### Grant Administrator Role
1. Register your account normally via `/register` and confirm your email.
2. In the **Supabase Dashboard → SQL Editor**, run:
   ```sql
   UPDATE public.profiles
   SET role = 'admin', updated_at = now()
   WHERE lower(email) = 'your-admin-email@example.com';
   ```
3. Sign in at `/login` and navigate to `/admin`.

### Revoke Administrator Role
```sql
UPDATE public.profiles
SET role = 'student', updated_at = now()
WHERE lower(email) = 'your-admin-email@example.com';
```

---

## 7. Running, Testing & Building

```bash
# Start local development server
npm run dev

# Run unit & integration tests (Referral engine, rewards, authorization, validation, analytics)
npm test

# Run TypeScript strict type checking
npm run typecheck

# Run ESLint
npm run lint

# Build production bundle
npm run build
```

---

## 8. Analytics & Growth Metric Formulas

| Metric | Formula | Denominator / Safeguard |
| :--- | :--- | :--- |
| **Unique Registrations** | `COUNT(DISTINCT profiles.id)` | Never double-counts a student across channels. |
| **Referral-Attributed Registrations** | `COUNT(profiles WHERE referred_by IS NOT NULL)` | Tracked separately from primary `acquisition_source`. |
| **Qualified Referrals** | `COUNT(referral_attributions WHERE status = 'qualified')` | Excludes `pending`, `flagged`, and `rejected` referrals. |
| **Referral Share Rate (%)** | `(Referral-Attributed Registrations / Total Registrations) * 100` | Returns `null` (`N/A`) when `Total Registrations = 0`. |
| **Qualified Referral Rate (%)** | `(Qualified Referrals / Referral-Attributed Registrations) * 100` | Returns `null` (`N/A`) when `Referral-Attributed = 0`. |
| **Landing Conversion Rate (%)** | `(Total Registrations / Landing Views) * 100` | Returns `null` (`N/A`) when `Landing Views = 0` (never invents visitor counts). |
| **Workshop Attendance Rate (%)** | `(Attended Records / Total Tracked Attendance Records) * 100` | Returns `null` (`N/A`) until attendance is marked for at least 1 student. |
| **Project Submission Rate (%)** | `(Project Submissions / Total Registrations) * 100` | Returns `null` (`N/A`) when `Total Registrations = 0`. |
| **Cost Per Registration (CPR)** | `Actual Recorded Spend (INR) / Total Registrations` | Returns `null` (`N/A`) when `Total Registrations = 0`. |

---

## 9. Security Checklist

- [x] **Row Level Security (RLS)** enabled on all 11 tables in `supabase/schema.sql`.
- [x] **No Privilege Escalation:** Both `validateProfileUpdateInput()` and the PostgreSQL `prevent_profile_privilege_escalation()` trigger block non-admins from changing `role`, `referral_code`, `referred_by`, or `email`.
- [x] **Server-Side Admin Verification:** Every `/api/admin/*` route verifies the user's JWT with Supabase Auth and checks `profiles.role === 'admin'` in PostgreSQL.
- [x] **Server-Side Resource Gating:** Locked resource markdown and signed download URLs are stripped on the server in `/api/student/overview` and verified in `/api/student/resources/[id]/download`.
- [x] **Referral Abuse Prevention:** Blocks self-referrals (by ID and normalized email), duplicate attributions (`UNIQUE(referred_user_id)`), 2-node referral loops, and flags high-velocity bursts (`>10 referrals in 10 minutes`).
- [x] **Privacy-Safe Referral History:** `get_my_referral_history()` masks referred students' names and never returns their email addresses.
- [x] **No Client Secrets:** `SUPABASE_SERVICE_ROLE_KEY` is server-only and never referenced in client components.

---

## 10. Resetting Test Data Safely

To clear test student activity in staging/development while keeping your configured Campaign, Workshop, Reward Rules, and Learning Resources intact, run [`supabase/seed_reset.sql`](supabase/seed_reset.sql) in the Supabase SQL Editor.

---

## 11. Known Limitations & Honest Scope Notes

- **WhatsApp Sharing:** Uses pre-filled `https://wa.me/?text=` peer share links and copyable templates for zero-cost student sharing; automated WhatsApp Business API pushing is not claimed or enabled without provider credentials.
- **Project Rubric Evaluation:** The immediate rubric score shown on project submissions is a deterministic text-based heuristic (`is_automated_heuristic: true`) that checks problem clarity and architecture documentation. It does not execute external repository code.
- **Rate Limiting:** API routes use an in-memory sliding-window rate limiter (`lib/rate-limit.ts`). For multi-instance serverless deployments at high scale, pair with Supabase Auth rate limits or an edge KV store.
