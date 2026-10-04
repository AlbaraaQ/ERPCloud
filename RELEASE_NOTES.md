# Release Notes — Wave 3, the deletions (RC-7, RC-9, item 13)

Date: 2026-10-04
Scope: `apps/staff`, `apps/api`.
Records: RC-7, RC-9, item 13. Decisions by the owner.

## What was removed, and why removal needed more than deleting a file

Three screens promised something the code could not deliver. The owner chose deletion for
two and a real form for the third.

**«عن البرنامج»** kept its first section (version, stack, API address, docs link) and
lost the other two: «حالة التنفيذ», which counted screens from the navigation tree and
told the operator nothing they could act on, and «تحديث البرنامج», which said "reload the
page" — a restatement of the word "cloud", not a feature.

**`report-designer`** (368 lines) made **zero** API calls. Every field lived in
`useState`, so it looked like a report designer and saved nothing. The four sibling
settings screens (`backup`, `restore`, `data-rotation`, `invoice-maintenance`) all call
the API and stay.

**Deleting is three edits, not one.** Both screens were entries in the navigation tree,
and the AI assistant keeps a *generated snapshot* of that tree — 272 help articles, each
pointing at a real screen. Removing the routes but leaving the snapshot would have made
the assistant open screens that no longer exist. And the "Update" nav entry was not a
route at all: it was an anchor to `#updates` inside the About page itself, so removing
the section without removing the entry would have left a menu item pointing at nothing.

## «طلب المساعدة» is now a form that actually sends

The page showed session details, a "copy" button and quick steps — and called no route.
Anyone reading "attach this information when contacting support" assumed a form or an
address existed behind it. There was neither.

It now posts to **`POST /public/leads`**, the door the marketing site already uses, which
is protected by three visible layers (honeypot · rate limit · a unique constraint on the
address) and writes the request into the platform console's leads list where it is
triaged.

**No new endpoint.** A support-specific route would have meant a table, its own
protection and another list in the console — all to do work `leads` already does.

The screen states plainly what happens: a `202` with a short reference, an
acknowledgement e-mail to the sender, and **no e-mail to the platform team**. The
request is read from the leads list. That is the honest version, and it replaces a
promise the old page never kept.

## A test-isolation defect that this work exposed

`platform-backups.spec.ts` replaced the global `fetch` with a stub and un-stubbed it at
the *end of each test*. When an assertion failed before that line, the stub survived into
whatever spec ran next in the same worker — so `ResendMailer`'s tests began failing with
`resend: 503 — nope`, a 503 invented by a different suite.

The fix is one `afterEach(() => vi.unstubAllGlobals())`: cleanup that only runs on
success is not cleanup. **The assertions in that file were not touched** — it fails on
exactly 9 tests / 16 passing both before and after this change, the same numbers as the
parent commit, and it is recorded as a known failure in
`docs/production-readiness/README.md`.

## Verification

lint exit 0 · staff/platform-admin/marketing builds clean · contracts 233/233 · staff
70/70 · `test:smoke` passed · `openapi:export` regenerated (596 → **769 paths**, the
parent artifact having been produced by a partial boot; the export is deterministic
across runs) · api **1538/1547**, the 9 failures confined to `platform-backups.spec.ts`
and identical to the parent commit.

---

# Release Notes — Mail provider and the AI key (Wave 3)

Date: 2026-10-04
Scope: `packages/config`, `packages/contracts`, `packages/database`, `apps/api`,
`apps/staff`, `apps/platform-admin`.
Records: RC-10, RC-11.

## RC-10 — a third mail provider

`email_settings.provider` offered `console` and `smtp` and nothing else, so an operator
who wanted a hosted API had to run a relay. `resend` is now a first-class choice.

**Three layers had to move together, and the third is the one that bites.**

1. The contract: `emailProviders` is now `['console','smtp','resend']`, and the schemas
   that derive from it follow.
2. The mailer: `ResendMailer` posts one request to `/emails` with the bearer key, and
   maps `from`/`to`/`subject`/`text` plus `html`, `reply_to` and RFC 8058 unsubscribe
   headers when present. It is built on `fetch` — **no new dependency**.
3. **The database.** Two `CHECK (provider IN ('console','smtp'))` constraints written in
   `0070_email_service.sql` — `email_settings_provider_check` and
   `email_messages_provider_check`. The Zod schema passed, the controller was happy, and
   the API still answered **500**, because the constraint is what actually rejected the
   row. Migration `0114` widens both; it does not drop them, and its `down` folds
   existing `resend` rows to `console` before narrowing.

Two rules the implementation keeps deliberately:

- **`resendConfigured` is a boolean, never the key.** It mirrors `smtpConfigured` /
  `smtpHost` so the settings screen can say "this provider will fail" without shipping a
  secret to the browser.
- **`assertResendEnv` throws where the value is used, not at boot.** An unconfigured
  optional integration must not stop the server from starting — the same rule object
  storage already follows. Without it the failure is a bare 401 from Resend that tells
  the operator nothing about what to change.

## RC-11 — the AI assistant was "on" with nothing behind it

`GET /ai/settings` answered `{"enabled":true,"provider":null}`. A tenant that had never
opened the AI screen looked configured, the gate accepted it, and chat answered from the
local engine as though somebody had set an assistant up.

The cause was one line: `tenant?.enabled !== false`. **Absence was read as consent.**
A tenant with no row at all is now reported as off, and an explicit switch with no
provider anywhere is not a working assistant either.

The platform plane already had a key field. What was missing was the tenant's own:

- **`ai_settings.api_key_enc`** (migration `0115`), sealed with the existing
  `secret-box.ts` envelope — the same `v1:<iv>:<tag>:<ciphertext>` format as the MFA
  secret and the e-invoicing credentials, so one `DATA_ENC_KEY` rotation covers all of
  them. It is nullable and absent for existing rows on purpose: an empty key must stay
  "no key", not "a key that fails to decrypt".
- **Precedence.** A tenant key overrides the platform key. This needed
  `openOwnKey` rather than reusing `openKey`, because `openKey` falls back to
  `AI_API_KEY` from the environment — with it, the tenant slot could never be empty and
  the platform key would never win. `openOwnKey` also fails closed: a key that cannot be
  opened is not a key, so the assistant degrades instead of signing a request with a
  value nobody could read.
- **`hasApiKey` / `hasPlatformKey`** are presence booleans. The key never crosses the
  wire, in either direction.
- **Absent means "leave it".** The switch, the provider and the key all now distinguish
  an omitted field from an explicit `null`, so a partial PUT that only rotates the key
  no longer wipes the provider or re-enables the assistant.

## What was removed rather than added

`updateSettings` first gained a guard rejecting "enable with no provider". It was dead
on arrival: `ai_platform_settings` is seeded with `provider NOT NULL DEFAULT 'local'`
and `updatePlatform` can never write `null`, so the condition could not be reached. A
validation that cannot fire is worse than none — it promises a check that does not
happen. The rule lives in the gate, which is the one place that actually decides.

## Verification

lint exit 0 across all packages · contracts/config/database/testing/api builds clean ·
**api 1547/1547** · `test:smoke` passed · `openapi:export` regenerated · migrations
114 and 115 applied (115 total, 0 skipped) · `resend-mailer.spec.ts` 8/8 ·
`platform-email.spec.ts` 22/22 · `tenant-ai-settings.spec.ts` 8/8.

---

# Release Notes — Password recovery (Wave 2)

Date: 2026-10-04
Scope: `apps/api`, `packages/database`, `packages/contracts`, `packages/config`, `apps/staff`.
Records: CR-014, ADR-032.

## Why this release exists

A user who forgot their password had no way back into the system. There was no
route for it in `AuthController` — not a broken one, none. This release adds the
whole path, verified against a running stack (embedded PostgreSQL 16, 113
migrations, API on `:3000`).

## What was added

| | Decision |
|---|---|
| **`password_reset_tokens`** (migration 0113) | stores `token_hash` (SHA-256 of a 256-bit random token), `expires_at`, `consumed_at`, `attempts`. The token itself is never written to the database, so a leaked table is not an account takeover |
| **`POST /api/v1/auth/forgot-password`** | body `{tenantCode,email}` → always **204**. It does not disclose whether the address exists |
| **`POST /api/v1/auth/reset-password`** | body `{tenantCode,token,new}` → **204**. Single-use: a second call with the same token is **400 `VALIDATION_FAILED` "Reset link is invalid or has expired"** |
| **Rate limit** | 3/min on the recovery route, so the tenant's own limit contains the quota risk |
| **`RecoverScreen`** | reached from `LoginScreen` through a `recovering` flag — no new public route. `step` is a derived const, not state |
| **Config** | `AUTH_PASSWORD_RESET_URL_BASE`, `AUTH_PASSWORD_RESET_TTL_MINUTES` (default 30) |

## The correction that mattered

The `password.reset` e-mail event was **already declared** in
`packages/contracts/src/platform/email.ts` — `scope: 'tenant'`,
`variables: ['name','link','expires']`, with ar/en templates seeded. What was
missing was only the endpoint that emits it.

This is recorded because it nearly went the other way: an initial attempt *added*
a second `password.reset` entry with a `company` variable the catalogue never
declared, which produced a 24-length/23-unique mismatch in the registry freeze test
and a `{{company}}` failure at render time. The fix was to `git checkout` the file
whole. `sendResetEmail` now sends exactly the three declared variables and nothing
else, because the template plane rejects any `{{var}}` outside the list.

## The proof

One full cycle against the rebuilt binary, harvesting the token from the newest
`email_messages` row:

```
forgot-password                204   → status=sent, fresh token
reset-password (weak, <12)     400   "String must contain at least 12 character(s)"
reset-password (same token)    204   ← the link survived the rejection
reset-password (replay)        400   "Reset link is invalid or has expired"
login  (old password)          401
login  (new password)          200
```

The third and fourth lines are the ones that matter. A password the tenant policy
rejects — `owner-owner-1234`, long enough for the schema but containing the owner's
own name — answers `400 "Password does not satisfy the tenant password policy"`, and
**the same link then still works**. That is the ordering fix from CR-014 §6 proving
itself: the token is not consumed until every other reason to reject has been ruled
out. Before the fix, that rejected attempt had already marked the link used, so the
retry would have answered `400 "Reset link is invalid or has expired"` and the user
would have had to wait for a whole new e-mail.

The demo owner credential was then restored through `POST /auth/change-password`
(200 → 401 on the recovered password).

## Gates

| Gate | Result |
|---|---|
| `pnpm -r run lint` | **exit 0** |
| `pnpm -r run build` | **0 TS errors** |
| `pnpm -r run test` | **1858 passed, 0 failed** |
| `pnpm --dir apps/api run test:smoke` | **passed** — AppModule boots, `/health/live` 200, guards emit problem+json 401 |
| `pnpm run openapi:export` | **clean** — the diff is exactly the two new endpoints |

Per package: `ui` 21 · `config` 10 · `contracts` 232 · `database` 53 ·
`testing` 12 · `api` 1530.

## The four red files, and what each one actually was

Four files in the wider `@erp/api` suite were failing when this release was cut.
All four are now green, and the whole workspace stands at **1858 tests, 0
failures** (`ui` 21, `config` 10, `contracts` 232, `database` 53, `testing` 12,
`api` 1530). What they turned out to be was not one problem but three different
ones, and only one of them was a defect in the code under test.

**1. `test/isolation.spec.ts` — a hardcoded list that had drifted 21 tables.**

The test asserted `rlsProtectedTablesProbe()` equalled a copy of
`rlsProtectedTables` pasted into the test file. The real list lives in
`packages/database/src/rls.ts`, and every phase since had added its tables there
and forgotten the test's copy — supplier portal, e-sign, dashboards, tenant
apps, CRM, comments, project tasks. The assertion had been red and meaningless
for months.

Before touching it I audited the database directly: **all 82 declared tables do
carry RLS and a policy** — the list was not lying about the schema, only the
test's copy was stale. I also checked the converse, because it is the shape of a
real leak: 170 tables have a `tenant_id` column and are *not* in the list. That
is not a gap. `rlsProtectedTables` is consumed by nothing but this harness — it
does not generate migrations — and the schema is deliberately hybrid: the listed
subset carries a database-level policy, the rest are isolated at the application
layer by `withTenantTx`. Adding RLS to 170 tables would be an architectural
change, not a test fix.

So the list is now asserted against the live database instead of against a copy:
every declared table must exist, have `relrowsecurity`, and have at least one
policy. That cannot drift, and it fails with a named table when a phase declares
protection without migrating it. A second test pins the design intent — the list
stays a curated subset, never claims `users`/`tenants`/`permissions`, and holds no
duplicates — so the hybrid model is not "fixed" by mistake later. Both were
verified to fail when the bug is reintroduced.

**2. `src/modules/ai/ai-help.spec.ts` — a generated file nobody regenerated.**

`NAVIGATION_SNAPSHOT` is derived from `apps/staff/lib/navigation.ts` by
`scripts/build-ai-navigation-snapshot.mjs`. Twelve screens had been added to
navigation and the snapshot was never rebuilt, so it was 12 behind. Running the
generator fixed it — the diff is 207 insertions and **zero deletions**, i.e.
purely additive, no existing entry changed.

The generator was referenced only in comments and wired into nothing, which is
why this recurs. It now runs in `pnpm verify` immediately after `typegen`, so the
derived artifact cannot drift again.

**3. `test/platform-usage.spec.ts` — a real test defect, and the only one.**

The storage-quota test drives `POST /files/presign` and expects the second,
within-limit request to answer 201. Without MinIO the real `S3ObjectStorage` is
unconfigured and answers **503 by design** — "a file endpoint must fail loudly
rather than hand out an unusable URL" (`env.ts`, PHASE_04 §5.3). The test never
overrode the provider, so half of it was asserting against an unconfigured
sandbox rather than against quotas.

Fixed the way `files.spec.ts` already does it:
`createTestApp(..., (b) => b.overrideProvider(OBJECT_STORAGE).useValue(new FakeObjectStorage()))`.
The quota check runs before the presign, so the refusal half stays fully covered.

**4. `test/platform-backups.spec.ts` — did not survive a clean rebuild.**

Nine failures here (404, 500, and backup runs reporting `failed`). I changed
nothing that touches backups, and after rebuilding the workspace from a clean
install the file passes 25/25 — reproducibly, with and without seed data and with
a live API server running alongside. I could not reproduce the original failure,
so I am not claiming a fix for it; the honest reading is that it was an artifact
of a stale build in the sandbox it was first run in. It is green now, and it is
the one of the four I would watch.

## What was wrong, and what changed

| | Root cause | Fix |
|---|---|---|
| **POS could not save an invoice** | `feature.pos = false` because nothing ever synced a plan's module entitlements into `tenant_settings`; plus `items` and `stock_balances` were empty in the seed | `applyEntitlements()` mirrors `kind='module'` rows on manual activation, Stripe webhook and seed (CR-010); the seed now ships 10 catalogue items and opening stock (CR-013) |
| **Licence screen showed nothing** | `BillingService` read `tenant_subscriptions` with no tenant GUC bound — `TenantGuard` publishes the request context but never sets `app.tenant_id`, and `setTenantContext` is transaction-local by design — so RLS matched NULL and returned zero rows | Wrapped in `withTenantTx` (CR-011) |
| **Licence screen answered 500** | `listActivationRequests` threw a bare `Error`, which `AllExceptionsFilter` turns into 500 instead of 403 | `DomainError('FORBIDDEN', …, 403)` (CR-012) |
| **No general customer or supplier** | `parties` was empty in the seed | Seeded, deliberately **without** a VAT number so the ZATCA rule already in the API classifies their invoices as simplified (CR-013) |
| **Activation review could not write** | Same missing-GUC bug, on the platform-admin plane | `withPlatformAdminTx` (CR-011) |

## The proof

One real `POST /pos/checkout`, after the fixes:

```json
{
  "number": "SI-000001",
  "subtotal": "130.0000",
  "taxTotal": "19.5000",
  "total": "149.5000",
  "paidTotal": "149.5000",
  "paymentStatus": "paid",
  "method": "cash",
  "tendered": "200.0000",
  "change": "50.5000"
}
```

2 x 65.00 = 130.00, +15% VAT = 19.50, total 149.50, tendered 200, change 50.50.

And the flags that were off: `feature.pos`, `feature.projects`, `feature.hrm` ->
`true`. And `GET /billing/subscription` -> the full `pro-monthly` subscription instead
of `null`. And `GET /billing/activation-requests` -> `403 {"code":"FORBIDDEN"}` instead
of `500`.

## What was deliberately NOT changed

- **`einvoicing.service.ts:492`** — `buyer?.vatNo ? 'standard' : 'simplified'`. The
  rule was correct from the start; what it lacked was a buyer to classify. General
  customer has no VAT number => simplified. A customer with one => standard. No user
  decision, no UI flag.
- **No endpoint, DTO, permission code, guard ordering or migration.** Nothing in
  `API_CONTRACT.md`, `SECURITY_ARCHITECTURE.md` or the guard chain moved.
- **No ceiling was raised** anywhere.

## Gates

| Gate | Result |
|---|---|
| `pnpm -r run lint` | **exit 0** |
| `tsc -p tsconfig.base.json --noEmit` | **363 errors - the base-commit count, unchanged** |
| `@erp/staff` build · lint · test | `✓ Compiled successfully in 42s` · clean · **70 / 70** |
| `apps/api` test | **1512 passed / 2 failed** — both failures pre-existing at the base commit (verified by stashing the whole change set and rebuilding) |
| `packages/*` tests | ui 21/21 · contracts 232/232 · config 10/10 · database 53/53 · testing 12/12 |
| `apps/platform-admin` · `apps/marketing` tests | **24 / 24** · **98 / 99** (the one marketing failure is the pre-existing P-M8) |

The two pre-existing API failures are stale snapshots, not logic: `ai-help.spec.ts`
expects 261 ready screens while `navigation.ts` lists 274, and `isolation.spec.ts`
expects 60 protected tables while the schema now has 81. Both fail identically on a
clean tree.

## Not delivered

- The rest of Wave 1: the browser-side visual pass of POS, the licence screen and the
  notifications screen. The API behaviour is verified by direct calls; a signed-in
  browser pass is Wave 4's job.
- Waves 2-5: password recovery, desktop-screen cleanup, browser-only checks, and the
  visual redesign. See `docs/production-readiness/03-PLAN.md`.
- **Open risk:** the missing-GUC pattern (RC-12) may exist in other services that call
  `db.execute` on tenant-scoped tables outside a transaction. The repo was not swept
  for it. It is declared in `docs/production-readiness/04-BACKLOG.md`.

# Release Notes — Design System v3, PR-1: the shared kit

Date: 2026-10-01
Status: READY candidate — gate matrix below
Scope: `packages/ui` (new), `apps/staff`, `apps/platform-admin`, `apps/marketing`.

## What this release is

One design system, shipped once, for all three surfaces. `packages/ui` now owns the
token set and the React kit, and all three apps import from it. The v2 per-app token
blocks and the two forked component kits are gone from the hot path; what remains in
`apps/*` is screen code, which is exactly what should remain.

This is the foundation of a seven-PR programme. It carries no endpoint, DTO,
permission-code or guard-ordering change, and no route was added, removed or renamed
— the only new paths are `/design`, which is `notFound()` in production.

## What is in it

**`packages/ui`** — 22 components with JSDoc, RTL/LTR auto behaviour, both themes and
a real `disabled` state (never hidden): Button, Card, Kpi, DataTable, Badge/StatusBadge,
Modal, Drawer, ConfirmDialog, Tabs, SegmentedTabs, Input, Select, Combobox,
DateRangePicker, MoneyField, Toast, Tooltip, Skeleton, EmptyState, FilterBar, Avatar,
ThemeToggle, Progress, Meter, chart wrappers (BarSeries, Donut, LineSeries,
ChartLegend), PrintSheet, KeyboardHint, PosKeyHints, Reveal, CountUp, Marquee.

**One token set, one theme mechanism.** `packages/ui/src/tokens/tokens.css` is the
single source; all three `globals.css` import it and nothing else declares the
contract. The theme key is exactly `erp.theme` ∈ `light|dark|system` in
`localStorage`, one blocking micro-script in `<head>` sets `html.dark` before
hydration, and there are no sub-keys. Dark mode is first-class: complete for
`staff` (toggle in the top bar), the default for `platform-admin`, and
`system`-default with a navbar toggle for `marketing`.

**Motion and print.** All motion is `framer-motion`, capped at 300 ms and disabled
under `prefers-reduced-motion`. `@media print` forces a white background and dark
type in both themes. No autoplay with sound.

**Colour discipline.** 1,359 raw Tailwind palette utility classes across 69 files and
58 inline `style`/`shadow` colour literals across 22 files were migrated onto
semantic tokens. Both migrations are re-runnable (`scripts/migrate-tokens-v3.py --check`
and `scripts/migrate-inline-tokens-v3.py --check`) and report zero remaining. The
survivors are the deliberate ones: the white-label brand defaults and two comment
references to desktop source files.

**The review page.** `app/design` in all three apps shows every component once, in
both themes, with a toggle — the page the programme is judged by.

**Bilingual shell for staff.** A `AR/EN` switch in the staff top bar flips
`<html dir>` through the existing `lib/i18n.tsx` provider (keys added only — nothing
removed), and the sidebar now carries a `تغطية الشاشات` card that counts how many
screens are `ready` vs `api` vs `planned` instead of implying that everything works.

## Verification matrix

| Gate | Result |
|---|---|
| `@erp/ui` `typecheck` | clean |
| `@erp/ui` `lint` | clean |
| `@erp/ui` `test` | **21 / 21** |
| `apps/staff` build | `✓ Compiled successfully in 19.7s` |
| `apps/staff` lint | clean |
| `apps/staff` test | **70 / 70** (10 files) |
| `apps/platform-admin` build | `✓ Compiled successfully`, 36/36 static pages |
| `apps/platform-admin` lint | clean |
| `apps/platform-admin` test | **24 / 24** (2 files) |
| `apps/marketing` build | `✓ Compiled successfully`, 15/15 static pages |
| `apps/marketing` lint | clean |
| `apps/marketing` test | **98 / 99** (1 pre-existing failure, below) |
| `packages/contracts` test | **232 / 232** |
| `packages/config` test | **10 / 10** |
| `packages/database` test | **53 / 53** (after `@erp/config` was built) |
| `packages/testing` test | **12 / 12** |
| Raw palette utilities remaining in the three apps | **0** |
| Inline colour literals remaining (excluding deliberate) | **0** |

### Known issues, stated plainly

1. **`apps/marketing/tests/verify.spec.ts` P-M8 fails** — 34 industry labels in
   `apps/marketing` do not match `apps/staff/lib/navigation.ts` at the recorded line
   numbers. This is **pre-existing at the branch's base commit** (confirmed by stashing
   the entire change set and re-running). Out of scope for this release.
2. **`tsc -p tsconfig.base.json --noEmit` is red with 363 errors across ~100 files** —
   also the base-commit state, also out of scope. Recorded as CR-006.
3. **`apps/marketing/tests/perf.spec.ts` P-M10 `/layout` was 1232.3 kB against a 680 kB
   ceiling** while the layout imported the `@erp/ui` barrel. Fixed by importing the
   `@erp/ui/theme` subpath and adding `sideEffects: ["*.css"]`; `/layout` is inside the
   ceiling again and `perf-budget.json` was **not** edited. The dev-only `/design` page
   is above the ceiling by construction and is excluded from *measurement* via
   `UNMEASURED_ROUTES` (CR-005).
4. **Incidental repair:** `reorderWidgets` in `apps/staff/lib/bi-dashboards.ts` is now
   generic. This was a red build on the base commit (CR-003).
5. **Not yet delivered from the programme's backlog:** the per-surface redesigns
   themselves (PR-2 … PR-7), Lighthouse runs, axe DevTools passes on the six model
   pages, and the reduced-motion / theme-switch-mid-session walkthroughs. Those are
   the next PRs' gates, not this one's.
6. **Light/Dark screenshots are not attached to this release.** This sandbox has no
   browser binary (no Playwright/Puppeteer/Chrome), so the gallery could not be
   captured as an image. What *is* verified mechanically: the built CSS contains the
   `.dark` variable block with every semantic token flipped; `bg-surface`, `text-ink`,
   `text-muted`, `border-line`, `bg-ok-soft`, `text-ok-ink`, `bg-inverse` and
   `text-on-accent` all resolve to `var(--color-…)`; and the blocking theme script is
   present in the served `<head>` of both the marketing and staff dev servers, writing
   `html.dark` before React hydrates. Capture the screenshots from the running dev
   servers (marketing :3002, staff :3001) before merging — `/design` is dev-gated and
   sits behind the normal `AuthGate`, so it needs a signed-in session.
7. **`/design` could not be rendered authenticated in this sandbox** — the API is not
   running here, so no session exists. The gallery is covered by `@erp/ui`'s 21 unit
   tests and by all three `next build`s (it typechecks and compiles in each app); the
   authenticated visual pass is part of PR-2's evidence, not this PR's.

## Follow-ups

- PR-2 will re-point the staff screens at the kit and retire `components/ui.tsx`.
- PR-3 … PR-6 follow the same pattern for `platform-admin` and `marketing`.
- PR-7 closes with the accessibility, performance and motion evidence for all three.

# Release Notes — v1.0.0

Date: 2026-09-07
Status: READY candidate

## Highlights

- Completed all 23 project phases for the cloud multi-tenant SaaS ERP.
- Core platform: tenancy, identity, RBAC, settings, audit, files, notifications, outbox and sequences.
- Domain modules: organization, catalog, accounting, parties, inventory, sales, purchases, treasury, e-invoicing, reporting and migration.
- Compatibility and surfaces: legacy desktop gateway, admin panel and customer portal.
- Vertical packs: restaurant POS, HRM/payroll, installments, contracting/projects, optics, tailoring, marina, fitment and Salla integration.
- Go-live hardening: Prometheus metrics, deeper readiness checks, retention plan, backup/restore and incident runbooks, UAT pack, security sweep and release operations documentation.

## Verification

Final Phase 23 verification command: `pnpm run verify` with exit code 0.

Known environment note: this sandbox logs an embedded PostgreSQL `libpq.so.5` loader error during API Vitest setup, but the repository verify script completes and exits 0.

## Security notes

- Runtime secrets are encrypted with AES-GCM.
- Tenant isolation is enforced by application guards and PostgreSQL RLS/FORCE RLS.
- Remaining dependency audit findings are waived by ADR-021 because they are isolated to build/test/dev-server surfaces and are not exposed by the production runbook.
