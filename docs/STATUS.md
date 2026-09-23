# Status Ledger

| Phase | Date | State | Notes |
|---|---|---|---|
| PHASE_01 | 2026-08-23 | COMPLETE | Repository and engineering standards bootstrap. Re-audited on 2026-09-04: the phase was **present but over-claimed** — `.prettierrc.json`, `.prettierignore`, `.lintstagedrc.json`, `.gitleaksignore`, `.github/workflows/ci.yml` and every `.env.example` were missing from the commit and have since been created. |
| PHASE_02 | 2026-09-04 | COMPLETE | Backend platform core (NestJS bootstrap, request pipeline, contracts/config/database packages, health probes). Originally reported `IN_PROGRESS` on 2026-09-01; the phase **failed its own acceptance bar** (`npm run verify` never reached lint/unit/integration/build) and was completed during the Phase 03 pass. See `PHASE_02_IMPLEMENTATION_REPORT.md`. |
| PHASE_03 | 2026-09-04 | COMPLETE | Tenancy, Identity & Access: 9-table platform/tenancy schema with reversible idempotent migration, RLS on all tenant-scoped tables, `api`/`migrator` database roles, auth (login/refresh/logout/change-password), RBAC, typed tenant settings, guard pipeline, isolation harness. `pnpm run verify` exits 0. See `PHASE_03_IMPLEMENTATION_REPORT.md`. |
| PHASE_04 | 2026-09-04 | COMPLETE | Platform Services: audit trail (interceptor + service API, append-only at the privilege level), files (presign/finalize/app-signed download, MIME+size allow-lists, orphan GC), notifications (membership inbox + settings-updated demo subscription), BullMQ queues with a transactional outbox and a `WORKER=1` bootstrap, `Sequences.next` (64-parallel, no duplicates), DB-backed idempotency keys replacing the Phase-02 in-memory map. 6 new tables, all under FORCE RLS. `pnpm run verify` exits 0 (148 tests). See `PHASE_04_IMPLEMENTATION_REPORT.md`. |
| PHASE_05 | 2026-09-05 | COMPLETE | Organization Structure: 10 tables (`company_profiles, branches, warehouses, cash_locations, cash_location_balances, currencies, fx_rates, price_lists, price_list_items, branch_posting_profiles`) under `ENABLE`+`FORCE` RLS, applied by `0002_organization.sql` with a reversible down file; CRUD for every `API_CONTRACT §3` resource with soft delete, single-default invariants held by partial unique indexes + an advisory lock, branch-scope-aware reads, IBAN masking, explicit before/after audit on cash locations, posting profiles and the company profile; `resolveFx` (identity/direct/inverse/triangulated, decimal.js) and `resolvePostProfile` (4-rung fallback, `ACCOUNT_PROFILE_MISSING`); idempotent `provisionOrgDefaults`. Deferred FK `document_sequences.branch_id → branches.id` added. `pnpm run verify` exits 0 (268 tests). See `PHASE_05_IMPLEMENTATION_REPORT.md`. |
| PHASE_06 | 2026-09-05 | COMPLETE | Catalog foundation: 10 tenant-scoped catalog tables with `ENABLE`+`FORCE` RLS, reversible migration `0003_catalog.sql`, Drizzle schema exports, tenant-scoped catalog service and API routes for item/category listing and item creation, composite item-kind validation, and Arabic-name search. Catalog contract tests and package/API validation passed. See `PHASE_06_IMPLEMENTATION_REPORT.md`. |
| PHASE_07 | 2026-09-07 | COMPLETE | Accounting foundation completed: sequence-backed journal numbering, module lock/unlock enforcement for fiscal periods, party subledger foreign keys after PHASE_08, Decimal-safe balancing, journal posting/reversal, period close/reopen, trial balance, general ledger, and invariant/API verification. `pnpm run verify` exits 0. See `PHASE_07_IMPLEMENTATION_REPORT.md`. |
| PHASE_08 | 2026-09-06 | COMPLETE | Party and subledger foundation: tenant-scoped parties, contacts, payment allocations, credit-limit checks, balance/statement routes, reversible migration `0005_parties.sql`, RLS, Decimal-safe financial comparisons, and API integration proofs for tenant isolation, contact lifecycle, allocation limits, and permission enforcement. `pnpm run verify` passes: 36 API test files and 223 tests. See `PHASE_08_IMPLEMENTATION_REPORT.md`. |
| PHASE_09 | 2026-09-07 | COMPLETE | Inventory ledger completed: balance rows are locked with `FOR UPDATE` for live database concurrency safety, transfer lifecycle persists draft/send/partial receipt/receipt/cancel, approved adjustment deltas require journal references, lot and serial lifecycle endpoints are available, moving-average valuation/recompute APIs and parity helpers are verified. `pnpm run verify` exits 0. See `PHASE_09_IMPLEMENTATION_REPORT.md`. |
| PHASE_10 | 2026-09-07 | COMPLETE | Sales completed: deterministic invoice totals, draft/update/post/void/payment flows, sequence-backed sales numbering, atomic posting transaction that combines inventory movements, accounting journal entries, and invoice status update, reference-linked returns with remaining-quantity enforcement, adjustment-note posting, offer evaluation, print data, tenant-scoped routes, and verification through `pnpm run verify`. See `PHASE_10_IMPLEMENTATION_REPORT.md`. |
| PHASE_11 | 2026-09-07 | COMPLETE | Purchases completed: tenant-scoped purchase invoices, lines, and additional-cost tables with RLS; supplier-required validation; draft/update/post/void/payment hooks; landed-cost preview and costs management; qty/value landed-cost allocation with deterministic largest-line remainder; stock-in/return posting to inventory; accounting journal integration inside the posting transaction; purchase permissions and OpenAPI export. `pnpm run verify` exits 0. See `PHASE_11_IMPLEMENTATION_REPORT.md`. |
| PHASE_12 | 2026-09-07 | COMPLETE | Treasury completed: unified receipt/payment vouchers, cheque state transitions, cash transfers, expense types, cashier shift close/count lines, cash-location balance writers, one-open-shift invariant, tenant-scoped RLS migration `0011_treasury.sql`, module README, updated permissions and OpenAPI export. `pnpm run verify` exits 0. See `PHASE_12_IMPLEMENTATION_REPORT.md`. |
| PHASE_13 | 2026-09-07 | COMPLETE | E-invoicing completed: credential vault with encrypted secrets/masked reads, tenant-scoped credentials/submissions/hash-chain tables, ZATCA UBL/hash/QR fixture builders, submission ledger, invoice ZATCA status sync, ETA explicit stub, endpoints, README, permissions, tests, and OpenAPI export. `pnpm run verify` exits 0. See `PHASE_13_IMPLEMENTATION_REPORT.md`. |
| PHASE_14 | 2026-09-07 | COMPLETE | Reporting completed: registry for all v1 report keys, tenant-bound report readers, export token endpoint, invoice/shift print HTML shells, README recipe, registry tests, and OpenAPI export. `pnpm run verify` exits 0. See `PHASE_14_IMPLEMENTATION_REPORT.md`. |
| PHASE_15 | 2026-09-07 | COMPLETE | Migration engine completed: apps/migrator CLI/library, W1-W10 registry plus W13/W14 artifacts, anonymized fixture source, analyze/dry_run/import/reconcile/rollback modes, idempotent legacy-id loader, R1-R7 reconciliation, rollback order, engine persistence tables with RLS, API run-management endpoints, runbook, and tests. `pnpm run verify` exits 0. See `PHASE_15_IMPLEMENTATION_REPORT.md`. |
| PHASE_16 | 2026-09-07 | COMPLETE | Legacy desktop compat gateway completed: compat device table/RLS, hashed API keys, admin device management, device auth, scoped compat tokens, master pulls with cursor watermarks/tombstones, sales/voucher push mappers with GlobalID idempotency, cursor/status endpoints, wire doc, permissions, tests, and OpenAPI export. `pnpm run verify` exits 0. See `PHASE_16_IMPLEMENTATION_REPORT.md`. |
| PHASE_17 | 2026-09-07 | COMPLETE | Admin panel completed: Next.js App Router shell, Arabic RTL default, module routes for master sections 1-12, permission-aware navigation, UI kits, report runner, migration/compat console pages, print CSS, CSP headers, README, and tests. `pnpm --filter @erp/admin build` and `pnpm run verify` exit 0. See `PHASE_17_IMPLEMENTATION_REPORT.md`. |
| PHASE_18 | 2026-09-07 | COMPLETE | Customer UI completed: Next.js mobile-first RTL portal, marketing/contact/pricing pages, auth/forced-reset/tenant-picker pages, public invoice verification, portal dashboard/invoices/statement/payments/profile requests/notifications, quick-sale/stock/tasks screens, onboarding wizard, route permission/flag metadata, README, tests, and build verification. `pnpm --filter @erp/customer build` and `pnpm run verify` exit 0. See `PHASE_18_IMPLEMENTATION_REPORT.md`. |
| PHASE_19 | 2026-09-07 | COMPLETE | Restaurant POS pack completed: tenant-flag gated POS tables/categories/order-events schema with RLS, sales invoice POS fields and line modifiers, POS permissions, `/pos/*` APIs for floor/table/order/void/merge/split/send/close, daily order sequences, sales-by-ordertype reporting hook, admin `/pos` screen, docs, tests, and OpenAPI export. `pnpm run verify` exits 0. See `PHASE_19_IMPLEMENTATION_REPORT.md`. |
| PHASE_20 | 2026-09-07 | COMPLETE | HRM & Payroll pack completed: tenant-flag gated departments/jobs/employees/attendance/adjustments/payroll schema with RLS, HRM permissions, `/hrm/*` APIs, idempotent attendance CSV import, payroll calculator/preview/run/post/pay/reverse lifecycle, salary voucher integration, payslip HTML, admin `/hrm` screen, docs, tests, and OpenAPI export. `pnpm run verify` exits 0. See `PHASE_20_IMPLEMENTATION_REPORT.md`. |
| PHASE_21 | 2026-09-07 | COMPLETE | Installments and contracting/projects packs completed: tenant-flag gated installment contract/schedule and project/BOQ/stage/progress-bill/requirement schema with FORCE RLS, sequencing for installment contracts/progress bills, `/installments/*` and `/projects/*` APIs, oldest-due collection allocation, progress bill retention/net-due calculations, sales-invoice posting/release hooks, permissions, admin routes, docs, tests and OpenAPI export. `pnpm run verify` exits 0. See `PHASE_21_IMPLEMENTATION_REPORT.md`. |
| PHASE_22 | 2026-09-07 | COMPLETE | Niche verticals and Salla integration completed: optics prescriptions, tailoring measurements, marina vessels/bookings/rental invoices, vehicle fitment and Salla OAuth/sync/webhook tables under FORCE RLS; feature-flagged `/optics`, `/tailoring`, `/marina`, `/fitment`, `/integrations/salla` APIs, encrypted Salla tokens, HMAC webhook verification, admin pages, docs, tests and OpenAPI export. `pnpm run verify` exits 0. See `PHASE_22_IMPLEMENTATION_REPORT.md`. |
| PHASE_23 | 2026-09-07 | COMPLETE (READINESS PACK) | Hardening and go-live readiness artifacts completed: `/metrics`, deeper readiness checks, retention-plan service/tests, dependency/secret security sweep with ADR-021 waivers, operations runbooks, backup/restore drill template, perf report, endpoint inventory, UAT pack, program acceptance matrix and `RELEASE_NOTES.md` v1.0.0. Repository verification exits 0, but staging, real API DB/E2E evidence, backup/PITR drill, performance numbers and UAT signatures remain environment-owner gates; this is not production sign-off. See `PHASE_23_IMPLEMENTATION_REPORT.md` and `POST_PHASE_23_GAPS_AND_NOTES.md`. |

| P-C1 (لوحة المنصة) | 2026-09-17 | COMPLETE | الجزء الأول من خطة لوحة تحكم المنصة (`docs/roadmap/PLATFORM_CONSOLE_PLAN.md` §4): **ترميم الصلاحيات** — كل مسار `/platform/*` (17 مساراً قائماً + 4 جديد) صار يحمل `@RequiresPlatformRole('console.…')`؛ لم يبقَ مسارٌ يُدار بادّعاء `pam` وحده، ويُثبته فحصٌ في `apps/api/src/permission-codes.spec.ts`. جديد: تدقيق عابر للمستأجرين (`GET /platform/audit`)، إعدادات منصة مكتوبة (`GET/PUT /platform/settings` بشاشة `/settings`)، بحث `Ctrl+K` (`GET /platform/tenants/search`)، وصندوق أحداث عبر كل العملاء (`GET /platform/jobs/outbox`). ترحيل `0066_platform_settings.sql` (جدول `platform_settings` بـ`ENABLE`+`FORCE` RLS وسياسة `tenant_id` + سياسة `platform_admin_plane` + سياسة قراءة عابرة على `audit_log`) وملف تراجع. رمز جديد واحد `console.settings.manage` (إعلان + إدراج idempotent + اختبار). قشرة جديدة بأربع مجموعات (العملاء · المال · التشغيل · المنصة) مع جرس تنبيهات وشارة بيئة وفتات خبز. الأرقام: API **975** (كان 951) في 127 ملفاً · platform-admin **12** (كان 3) · staff 36 · contracts 71 · 28 سكربت تحقّق حيّ (`scripts/verify-platform-console.mjs` = **70 نقطة في 10 أقسام**، أُعيد تشغيله مرتين: 70/70). `docs/PLATFORM_CONSOLE_P_C1_IMPLEMENTATION_REPORT.md`. |
| P-C2 (لوحة المنصة) | 2026-09-17 | COMPLETE | الجزء الثاني من خطة لوحة تحكم المنصة (`docs/roadmap/PLATFORM_CONSOLE_PLAN.md` §4): **العملاء في العمق** — بطاقة العميل `/tenants/[id]` بثمانية تبويبات (نظرة عامة · الاشتراك · المستخدمون · الاستخدام · الرايات · الصحة · التدقيق · الملاحظات) و**15** مساراً جديداً تحت `/platform/tenants/:id/*`: البطاقة والاستخدام والصحة والملاحظات والإعدادات والرايات والهوية (قراءةً بـ`console.tenants.view`)، وتعديل بيانات العميل و`POST …/status` **بسبب إلزامي** ونقل الملكية وإنشاء/حذف الملاحظة (`console.tenants.manage`)، وكتابة الإعدادات والرايات والهوية (`console.settings.manage`) — بلا رمزٍ جديد. تقاعد مسار `PATCH …/status` القديم بلا سبب. ترحيل `0067_tenant_card.sql` (§1 جدول `tenant_notes` بـENABLE+FORCE وسياسة مستأجر وسياسة منصة · §2 `WITH CHECK` على `platform_admin_plane` لـ`audit_log` · §3–4 سياسات المنصة الناقصة على `tenant_settings`/`sales_invoices`/`outbox_jobs` · §5 ترميم **155 سياسة** تكتب `current_setting('app.tenant_id', true)::uuid` بلا `nullif` — علّة كانت تُفشل قراءة المنصة على أي اتصال سبقته معاملة مستأجر) + ملف تراجع. الأرقام: API **998** (كان 975) في 128 ملفاً · platform-admin **16** (كان 12) · `platform-tenants.spec.ts` **23** · contracts 71 · staff 36 · `scripts/verify-platform-console.mjs` = **121 نقطة في 16 قسماً** (كان 70/10، أُعيد ثلاث مرات على بيئةٍ أُعيد بناؤها: 121/121، والتشغيل الثاني لا يغيّر شيئاً — باستثناء تطبيع صفوف الرايات التي تكرّر الافتراضي، وهو مصرَّح به على عميل التجربة). `docs/PLATFORM_CONSOLE_P_C2_IMPLEMENTATION_REPORT.md`. |
| P-C3 (لوحة المنصة) | 2026-09-17 | COMPLETE | الجزء الثالث من خطة لوحة تحكم المنصة (`docs/roadmap/PLATFORM_CONSOLE_PLAN.md` §4): **الهوية والوصول على المنصة** — الصلاحيات صارت تُقرأ **في كل طلب** لا من الرمز: `PlatformAdminGuard` يدمج `platformRoles` مع تجاوزات `console.role_permissions` المخزّنة في `platform_settings`، فالسحب والتضييق يقعان فوراً على رمزٍ صادر سلفاً (اختبار في `platform-identity.spec.ts` + اختبار حرس). **10 مسارات**: `GET /platform/users/:id` و`GET/DELETE /platform/sessions/:id` و`POST /platform/users/:id/mfa/reset` و`POST /platform/operators/invite` و`PUT /platform/roles/:code/permissions` جديدة، و`GET /platform/users` و`GET /platform/roles` مُعمَّقان (دليل عبر المنشآت + مصفوفة بالفهرس/الفعل/الحائزين)، و`POST/DELETE /platform/users/:id/roles` منقولان بلا تغيير مسار أو جواب. القراءة `console.users.view` والكتابة `console.users.manage` — بلا رمزٍ جديد (كليهما من P-C1). **ثلاثة قرارات مصرَّح بها**: (1) الدعوة تربط الحساب بمنشأة المشغّلين (`PLATFORM_TENANT_CODE`) وإلّا لم يستطع المدعوّ الحصول على رمز أصلاً، وبكلمة مرور مؤقّتة تُكتب `must_change_password = true`؛ (2) كل فعل على إنسان (إبطال جلسة · إبطال الكل · إعادة تعيين 2FA) يحمل **سبباً إلزامياً** وصفّ تدقيق (`session.revoke` · `operator.mfa_reset` · `operator.invite` · `platform_role.grant|revoke|permissions_update`)؛ (3) `GET /platform/users` غيّر شكل صفّه إلى عرضٍ موصوف (`platformRoles` · `tenants` · `lastLoginAt` · `mfaEnabled` · `activeSessionCount`) بدل صفّ SQL خام — أثره الوحيد `test/surface-isolation.spec.ts`. **بلا ترحيل**. شاشات: `/users` (بحث · منشأة · أدوار · آخر دخول · 2FA · جلسات) · `/users/[id]` جديدة (تعرّف · أدوار · عضويات · جلسات بالإبطال · إعادة تعيين 2FA) · `/roles` مصفوفة حيّة بكتابة سبب ومحوا للتجاوز. الأرقام: API **1020** (كان 998) في 129 ملفاً · `platform-identity.spec.ts` **21** · platform-admin **20** (كان 16) · contracts 71 · staff 36 · `scripts/verify-platform-console.mjs` = **159 نقطة في 17 قسماً** (كان 121/16؛ مرّتان 159/159، والأثر الوحيد المصرَّح به حساب تحقّق يُعاد استخدامه). `docs/PLATFORM_CONSOLE_P_C3_IMPLEMENTATION_REPORT.md`. |
| P-C4 (لوحة المنصة) | 2026-09-17 | COMPLETE | الجزء الرابع من خطة لوحة تحكم المنصة (`docs/roadmap/PLATFORM_CONSOLE_PLAN.md` §4): **الباقات والتراخيص والفوترة** — ترحيل `0068_platform_billing.sql` (ستة جداول RLS+FORCE: `billing_plan_entitlements` · `platform_invoice_sequences` · `platform_invoices` · `platform_invoice_lines` · `platform_payments` · `dunning_attempts`، وتوسعة دورة حياة على `tenant_subscriptions` مع فهرسٍ فريد جزئي يمنع ترخيصين حيّين لعميلٍ واحد). **21 مساراً** في `PlatformBillingController` — 5 منقولة بمساراتها من `PlatformAdminController` و16 جديدة (`plans/entitlement-keys` · `PUT plans/:id/entitlements` · `change-plan` · `pause`/`resume` · `invoices` + `issue`/`pay`/`void`/`print` · `dunning` + `run` · `revenue`) — والرموز الثلاثة المعلَّقة من P-C1 صارت مستعملة (`console.plans.manage` · `console.subscriptions.manage` · `console.billing.manage`). **قرارات مصرَّح بها**: (1) التناسب = رصيد الأيام غير المستهلكة من الباقة القديمة، مقابلٌ كامل للجديدة، والصافي `charge − credit` (فاتورة إن موجب، إشعار دائن بسلسلة `PCN-` إن سالب)؛ (2) **التجربة لا رصيد فيها** — من غيّر باقته وهو يُجرّب يبدأ فترته المدفوعة اليوم؛ (3) المسودّة بلا رقم، والرقم المتسلسل يُخصَّص عند الإصدار من `platform_invoice_sequences` **داخل معاملة المستند**، والملغاة تحفظ رقمها؛ (4) المدفوعة لا تُلغى (تُردّ دفعاتها)، والتحصيل الزائد يُرفض 422 بالمتبقّي في الردّ (منع التحصيل المزدوج)، وفاتورةٌ واحدة لكل مدة لكل ترخيص؛ (5) الضريبة (15٪) والمهلة وهوية البائع من ستة مفاتيح `billing.*` في `platform_settings` **تُنسخ على المستند** لحظة إنشائه؛ (6) ورقة A4 مكتفية بذاتها برمز ZATCA (باني `buildQrPayload` نفسه) وتفقيط بالحروف؛ (7) المتابعة تُسجَّل `مجدولة` (لا خدمة بريد بعد — P-C6) واليدوية `sent`، وسقف ثلاث محاولات والرابعة تُتجاوَز بسببها. **شاشات**: `/plans` (حقوق: وحدة · حدّ · راية) · `/subscriptions` (دورة الحياة) · `/invoices` جديدة · `/invoices/[id]/print` جديدة · `/dunning` جديدة · `/revenue` جديدة — **18** صفحة (كانت 14) و**57** مساراً تحت `/platform/*` (كانت 40). الأرقام: API **1043** (كان 1020) في 130 ملفاً · `platform-billing.spec.ts` **23** (طُلِب ≥ 14) · platform-admin **24** (كان 20) · contracts **81** (كان 71) · staff 36 · `scripts/verify-platform-billing.mjs` **147 نقطة في 12 قسماً** (طُلِب ≈ 50؛ مرّتان 147/147 وExit 0)، و`scripts/verify-platform-console.mjs` أُعيد تشغيله بعد تحديث سجلّ الإعدادات إلى 14 صار **160/160** في 17 قسماً (كان 159) — فمجموع التحقّق الحيّ للوحة **307** نقطة في **29** قسماً. أُصلح خللان اكتشفهما الاختبار: قيد `platform_invoices_number_check` كان يمنع إلغاء مسودّة، و`ANY(${…}::text[])` في drizzle يفشل كاستعلام. `docs/PLATFORM_CONSOLE_P_C4_IMPLEMENTATION_REPORT.md`. |
| P-C5 (لوحة المنصة) | 2026-09-17 | COMPLETE | الجزء الخامس من خطة لوحة تحكم المنصة (`docs/roadmap/PLATFORM_CONSOLE_PLAN.md` §4): **الاستخدام والحصص** — محرّك واحد (`UsageService`) يقيس ثمانية مقاييس (مستخدمون · فروع · فواتير/شهر · أصناف · تخزين MB · استدعاءات API/يوم · واتساب/شهر · إرسالات بريد/شهر) ويُسقط عليها حدود `limits.*`: تنبيه ناعم عند 80٪ (إشعار + راية + سطر تدقيق) ورفض صلب عند 100٪ بـ`409 USAGE_LIMIT_REACHED` برسالة عربية تحمل (المستهلك من الحدّ) و`errors[0].metric`. ثلاثة أسطح: تاب «الاستخدام» في بطاقة العميل (**إسقاط على المحرّك** لا حسابٌ ثانٍ — `snapshotForPlatform` + `invoicesPerDay` رسم البطاقة) · `/usage` في اللوحة (إجماليات · شبكة الأشدّ أولاً · رسوم يومية · تصدير CSV بـBOM ورأس عربي) · `/settings/usage` في staff للمستأجر. ترحيل `0069_usage_metering.sql` (جدول `usage_counters` بـENABLE+FORCE RLS وسياسة مستأجر وسياسة منصة، وصلاحيات SELECT/INSERT/UPDATE بلا DELETE) + ملف تراجع، و**§3 ترميم `platform_admin_plane` على `items`/`files`/`whatsapp_messages`** — بلاها كان يُقرأ صفرٌ صامت على مستوى المنصة (كشفه اختبار عدّاد، لا مراجعة). **أربعة قرارات مصرَّح بها**: (1) **حدود الافتراضي تُبلَّغ ولا تُطبَّق** — التطبيق لا يبدأ إلا على حدٍّ مصدره `tenant` أو `platform`، وكل مقياس يحمل `enforced` (تطبيق الافتراضي `max_branches=1` كان يمنع كل عميل من فرعٍ ثانٍ لحظة النشر)؛ (2) `api_calls_per_day` بالزيادة-ثم-الفحص (ذرّي)، والبقية فحص-ثم-كتابة بتفاوت ±1 معلَن؛ (3) قراءة الحدّ تعبر إلى مستوى المنصة بـ`withPlatformAdminTx` **قراءةً فقط** — الموضع الوحيد الذي يعبر فيه سطح العميل إلى مستوى المنصة (RLS 0066 يخفي `tenant_id IS NULL`)؛ (4) `null` ليس إعادة تعيين ولا صفراً — مُدقِّق `integer` كان يخزّن حدّاً صفرياً صامتاً، صار يُرفض 422، وسكربتات التحقّق لم تعد تكتب `limits.*` (سياسة رواسب مصرَّح بها). الأرقام: API **1056** (كان 1043) في 131 ملفاً · `platform-usage.spec.ts` **13** (طُلِب ≥ 8) · platform-admin **24** (المسارات 19) · staff **37** (كان 36) · contracts **88** (كان 81) · tsc/eslint/بناء للوحة وstaff Exit 0 · `scripts/verify-platform-usage.mjs` **85 نقطة في 11 قسماً** (85/85، بُني لأن الخطة لم تسمِّ سكربتاً)، و`scripts/verify-platform-console.mjs` **162/162** في 17 قسماً (كان 160) — فمجموع التحقّق الحيّ للوحة **394** نقطة في **40** قسماً. مسارات `/platform/*` **59** (كانت 57) وشاشات اللوحة **19** (كانت 18). `docs/PLATFORM_CONSOLE_P_C5_IMPLEMENTATION_REPORT.md`. |
| P-C6 (لوحة المنصة) | 2026-09-17 | COMPLETE | الجزء السادس من خطة لوحة تحكم المنصة (`docs/roadmap/PLATFORM_CONSOLE_PLAN.md` §4 وتفصيله §7): **خدمة البريد** — فهرس **17 حدثاً** ثابتاً في الكود (`packages/contracts/src/platform/email.ts`) × لغتان (`ar`/`en`) = **34 بذرة**، لكلٍّ `scope` ومتغيّرات معلَنة (`name` · `invoice_no` · `amount` · `link` …)، ومعه **قوالب** بنصٍّ في الجدول: صفٌّ عامّ للمنصة وصفُّ تجاوزٍ لكل مستأجر (النصّ وحده، بلا كود) باللغة مفتاحاً، `version` يزيد مع كل حفظ وسببٌ إلزامي، و`effective()` بترتيب تجاوز العميل ← نصّ المنصة ← بذرة الكود مع وسم `source`. **السجلّ** `email_messages` يحفظ النصّ كما ذهب (تعديل قالبٍ غداً لا يغيّر ما قيل أمس) بخمس حالات (`queued` · `sent` · `failed` · `suppressed` · `bounced`) و`delivery_mode` (`queue`/`inline`) و`attempts`/`max_attempts` و`lastError` و`providerMessageId` و`isTest`. **المزوّدون** `console`/`smtp` بتبديلٍ من الشاشة بلا إعادة نشر (واعتمادات SMTP في البيئة لا في جدول) + `POST …/settings/test`. **الحجر** بنطاقين (عامّ/مستأجر) يمنع **قبل الطابور** ويُسجَّل `suppressed` بسببه، والارتداد/الشكوى يوسم آخر `sent` `bounced`. **حصّتان**: حصّة P-C5 المطبَّقة تُرفض **409** وتُدقَّق، وسقفا `email_settings` اليومي/الشهري يُرفضان **429**، ورسائل الاختبار لا تُحتسب. **الطابور**: مهمّة `email.send` على `notifications` في **نفس معاملة** صفّ الرسالة، وسلّم تراجع **1د · 5د · 30د** حتى 3 ثم `failed`، وإعادة يدوية بسببٍ إلزامي. **التسليم** `inline` بعد الالتزام (الطابور شبكة أمان لا شرط خروج — فلا يتوقّف البريد في تثبيتٍ بلا Redis أو `WORKER=0`)، والرسالة المؤجَّلة تبقى `queue`. **18 مساراً كما نصّت الخطة**: 13 منصة (`/platform/email/*` بقوالبها وسجلّها وإعداداتها وحجرها) + 5 مستأجر (`/email/templates` قراءةً وتجاوزاً · `/email/messages` · `/email/settings` قراءةً وتحريراً). ترحيل `0070_email_service.sql` (أربعة جداول بـENABLE+FORCE RLS وسياسة مستأجر وسياسة منصة **بـ`WITH CHECK` صريحة**، ومنح erp_api بلا DELETE للقوالب/الرسائل/الإعدادات ومعه للحجر) + ملف تراجع. **4 رموز جديدة**: `console.email.view` · `console.email.manage` · `tenant.email.template.manage` · `tenant.email.log.view` (المنصّة 13→15، الإجمالي 156→160، ومنحٌ في rbac). شاشتان: `/email` في اللوحة (القوالب · السجلّ · الإعدادات · الحجر) و`/settings/email` في staff (قوالبي · سجلّي · هويّة المُرسِل). الأرقام: API **1077** (كان 1056) في 132 ملفاً · `platform-email.spec.ts` **21** (طُلِب ≥ 16) · contracts **104** (كان 88) · platform-admin **24** (المسارات 20) · staff **37** (الشاشات 231) · tsc×3/eslint/بناء اللوحة وstaff Exit 0 · `scripts/verify-platform-email.mjs` **73 نقطة في 9 أقسام** (73/73؛ لا يُرسل بريداً حقيقياً أبداً والإعدادات تُصوَّر وتُعاد)، و`scripts/verify-platform-console.mjs` **162/162** (سجلّ الرموز 13→15)، و`verify-platform-billing` **147/147**، و`verify-platform-usage` **85/85** — فمجموع التحقّق الحيّ للوحة **467** نقطة في **49** قسماً. مسارات `/platform/*` **72** (كانت 59) وشاشات اللوحة **20** (كانت 19). `docs/PLATFORM_CONSOLE_P_C6_IMPLEMENTATION_REPORT.md`. |
| P-C7 (لوحة المنصة) | 2026-09-17 | COMPLETE | الجزء السابع من خطة لوحة تحكم المنصة (`docs/roadmap/PLATFORM_CONSOLE_PLAN.md` §4): **الإعلانات والإشعارات** — «أن تصل رسالة المنصة إلى كل مستخدم، في التطبيق وبالبريد». **خمسة مسارات كما نصّت الخطة بالحرف** تحت `/platform/announcements` (`GET` · `POST` · `PATCH /:id` · `POST /:id/publish` · `GET /:id/reads`) برمزٍ جديد واحد **`console.notifications.manage`** (المنصّة 15→16 والإجمالي 160→161، ومنحٌ في `rbac` للمالك والتشغيل وحدهما — لا الدعم ولا المدقّق). ترحيل `0071_announcements.sql` (الرقم صُحِّح: 0070 أخذه البريد): `announcements` صفُّ المنصة **بلا `tenant_id` إطلاقاً** (ENABLE+FORCE وسياسة `platform_admin_plane` وحدها) و`announcement_reads` دفتر التوزيع (سياستان · فهرسٌ فريد على `(announcement_id,tenant_id,membership_id,channel)` يجعل التوزيع idempotent · فهرسٌ جزئي لغير المقروء) مع منح erp_api/erp_migrator بلا DELETE وNOBYPASSRLS. **أربعة قرارات مصرَّح بها**: (1) **الجمهور snapshot لحظة النشر** — من دخل بعدها لا يُشمل، وإعادة النشر تُكمل الناقص ولا تُضاعف (حجزٌ بـ`INSERT … ON CONFLICT DO NOTHING RETURNING`)؛ (2) **الجدولة زمنية والنشر idempotent** — مهمّة `announcement.publish` بـ`runAt` في **نفس معاملة** الكتابة، **ومسحٌ** من `GET /platform/announcements` (دفعة ≤ 20) فلا يعتمد النشر على العامل (المستودع يعمل بـ`WORKER=0`)؛ (3) **بريدُ المالك وحده وإشعارُ كل عضو نشط** — الإشعار إبلاغٌ لكل عضوية `active` من نوع `staff`، والبريد تمثيلٌ لأصحاب `is_owner`، ومنشأة المشغّلين تُستثنى فلا تُعلن لنفسها؛ (4) **القراءة مصدرٌ واحد** — `POST /notifications/:id/read` يوسم صفّ التسليم في نفس المعاملة، فلا عدّادٌ ثانٍ، وإعادة الوسم لا تُغيّر الوقت. **واستدراكٌ على P-C6**: تجاوز نصّ العميل كان مفتوحاً لكل حدث فأُقفل على أحداث النطاق `tenant` (422) — إعلان المنصة ليس كلام العميل؛ حدثٌ بلا مُنتِج لا يُظهر الخلل وأول إعلانٍ يُظهره. **شاشتان**: `/announcements` في اللوحة (كتابةٌ بنصّين ar/en · استهدافٌ بالجميع/الباقة/الحالة · جدولة · معاينة بالاتجاهين · قراءات لكل عميل) ومركز الإشعارات في staff (`/notifications` + **جرس** في الشريط يقرأ `meta.unread` من `/notifications` نفسه كل 60 ثانية) — **بلا نقاط نهاية جديدة** كما نصّت §4. أُضيف `runAt` إلى صفّ `/platform/jobs/outbox` في اللوحة (مهمّةٌ بلا وقتها لا تُثبت جدولة). الأرقام: API **1088** (كان 1077) في 133 ملفاً · `platform-announcements.spec.ts` **11** (طُلِب ≥ 8) · contracts **111** (كان 104؛ +7 لعقود الإعلانات) · platform-admin **24** (المسارات 21) · staff **37** (الشجرة **232**: 228/3/1) · tsc×3/eslint/بناء اللوحة وstaff Exit 0 · `scripts/verify-platform-announcements.mjs` **47 نقطة في 7 أقسام** (47/47؛ نشرٌ فعليّ على عملاء حقيقيين ووسمُ قراءةٍ يرفع العدّاد، ولا بريد حقيقي لأن المزوّد `console`)، و`scripts/verify-platform-console.mjs` **169/169** في 18 قسماً (كان 162/17؛ §17 جديد وسجلّ الرموز 15→16)، وأُصلح فحص العزل في `verify-platform-email.mjs` §8 (كان يقارن بمعرّفٍ من أوّل صفّ قالب — صار يسأل `/me` عن هوية المنشأة) فعاد **73/73**، والفوترة **147/147**، والاستخدام **85/85** — فالمجموع الحيّ للوحة **521** نقطة في **57** قسماً (كان 467/49). مسارات `/platform/*` **77** (كانت 72) وشاشات اللوحة **21** (كانت 20). `docs/PLATFORM_CONSOLE_P_C7_IMPLEMENTATION_REPORT.md`. |
| P-C8 (لوحة المنصة) | 2026-09-17 | COMPLETE | الجزء التاسع من خطة لوحة تحكم المنصة (`docs/roadmap/PLATFORM_CONSOLE_PLAN.md` §4): **مكتب الدعم والدخول المؤقّت** — «تذكرة واحدة لكل مشكلة، ودخولٌ مؤقّت مضبوط حين يلزم النظر بعين العميل». **تسعة مسارات** بنفس أسماء الخطة (`GET/POST /platform/tickets` · `GET/PATCH /platform/tickets/:id` · `POST /platform/tickets/:id/reply` · `POST /platform/impersonate` · `GET /platform/impersonate/sessions` · `DELETE /platform/impersonate/:id`) **زائد مسارٍ عاشر لم تذكره الخطة** `GET /platform/tenants/:tenantId/tickets` (يحتاجه سطح العميل وبطاقة المنشأة)، ورمزها الوحيد **`console.support.manage`** (من P-C1 — صار آخر رمز `console.*` يدخل الخدمة، فصار عدّ الرموز غير المستعملة **صفراً**). ترحيل `0072_support_desk.sql` (رقم الخطة 0071 أخذه الإعلان في P-C7): ثلاثة جداول بـENABLE+FORCE RLS وسياستين لكلٍّ (`tenant_isolation` + `platform_admin_plane`) — `support_tickets` (مهلة `sla_due_at` من الأولوية 1/4/24/72 ساعة تُكتب لحظة الفتح، وقيدٌ يجعل `closed_at` ملازماً لحالة الإغلاق) و`ticket_messages` (تنسخ `tenant_id` ليُعزل بلا انضمام، و`is_internal` وسمُ الملاحظة) و`support_sessions` (قيدُ **سقف 60 دقيقة في القاعدة أيضاً** لا في Zod وحده) — مع منح `erp_api` بلا **DELETE** على الثلاثة، فـ«ما قيل للعميل» و«من دخل باسمه» أثرٌ لا يُمحى، و`ALTER ROLE erp_api NOBYPASSRLS` في آخر الترحيل. **أربعة قرارات مصرَّح بها**: (1) **`imp` ادّعاءٌ في رمز الوصول** (`TokenService` يضمّنه في sign+verify، و`ttlSeconds` جديدة تقصّ عمر الرمز عند ما تبقّى من الجلسة) — فالرمز قصير العمر بطبيعته ولا يُجدَّد؛ (2) **`ImpersonationGuard` عالميّ** (`APP_GUARD` بعد `AuthGuard` مباشرةً، وهو إضافةٌ في موضعٍ معلَن لا إعادةُ ترتيب): يرفض **كل `DELETE`** (`403 IMPERSONATION_NO_DELETE`) و**كل `/auth/*` غير-`GET`** (`403 IMPERSONATION_AUTH_BLOCKED` — لا كلمة مرور جديدة ولا رمزٌ جديد باسم العميل)، ويقرأ صفّ الجلسة **بمعاملة منصة** في كل طلب فيسقط الرمز فور الإنهاء (`401 IMPERSONATION_ENDED`) لا عند انتهاء صلاحيته، ولا يعترض المسارات العامة (`tryGetAuthContext`)؛ (3) **الملاحظة الداخلية صفٌّ بعلامة لا قناة سرّية** — `is_internal` تُفلتر صراحةً عند العرض للعميل، والردّ الداخلي **لا يوقف** عدّاد أول استجابة (المقياس ما وصل العميل فعلاً)؛ (4) **الإنهاء لا الحذف** — `DELETE /platform/impersonate/:id` يكتب `ended_at`، والصفّ يبقى في سجلّ الجلسات. `GET /me` صار يحمل `impersonation` (من دخل · لماذا · إلى متى) فيُعلن الجلسة من الرمز نفسه. **ثلاث شاشات في اللوحة**: `/tickets` (صندوق بمرشّحات حالة/أولوية/بلا إسناد ومهلةً متبقّية معلَنة وسالبها بلون التجاوز، وتبويب «تذكرة جديدة») · `/tickets/[id]` (محادثةٌ بوسم الملاحظة الداخلية · **أربع ردود جاهزة** · ردٌّ عام/داخلي · حالة/أولوية/سحب إسناد) · `/impersonation` (نموذج منشأة+مدّة+سبب · بطاقة الرمز مع رابط فتح منشأة العميل · سجلّ الجلسات بزرّ إنهاء) — ومجموعات الشريط الأربع كما فرضها P-C1 (بندَي الدعم في «التشغيل»). وفي staff: **لافتة حمراء** (`components/impersonation-banner.tsx`) تعلو كل شاشة ما دام `imp` في الرمز، مع عدّادٍ تنازلي وزرّ خروج، واستقبال الرمز في **جزء العنوان** (`#support=…`) لأنه لا يُرسل إلى أي خادم (`consumeSupportFragment` ينظّف العنوان فوراً)، و`readSession` يفهم «جلسة نظر» بلا رمز تحديث فلا يجرّب تجديداً. **الأرقام**: API **1102** (كان 1088) في 134 ملفاً · `platform-support.spec.ts` **14** (طُلب ≥ 10) · contracts **120** (كان 111؛ +9 لعقود الدعم `support.spec.ts`) · platform-admin **24** (المسارات 24) · staff **37** (الشجرة 232) · tsc×3/eslint/بناء اللوحة وstaff Exit 0 · `scripts/verify-platform-support.mjs` **63 نقطة في 9 أقسام** (63/63 من أول تشغيل؛ يفكّ `imp` و`exp−iat ≤ 300`، ويقيس المهل والأدوار والحدود)، و`scripts/verify-platform-console.mjs` **176/176** في 19 قسماً (كان 169/18؛ §18 جديد)، و`verify-platform-announcements` أُعيد تشغيله **47/47** بعد تغيير خطّ الحُرّاس — فالمجموع الحيّ **591** نقطة في **66** قسماً (كان 521/57). مسارات `/platform/*` **86** (كانت 77) وشاشات اللوحة **24** (كانت 21) والترحيلات **73**. **كشف التشغيل الحيّ خطأين أُصلحا**: حارس الدخول كان يكسر المسارات العامة (`POST /auth/login` ⟵ 401) فصار يسأل السياق بـ`tryGetAuthContext`، و`/auth/*` كان يفلت من المقارنة بسبب بادئة `/api/v1` فصارت المقارنة على ثلاثة أشكال للعنوان. و**استدراكٌ على P-C4**: اختبار مهلة الدفع في `platform-billing.spec.ts` كان يقيس `dueDate − Date.now()` (جزءَ يومٍ لا عددَ أيام) فيسقط بعد الظهر بتوقيت UTC؛ القياس صار فرقاً بين تاريخين كما في اختبار الإصدار نفسه — سطرٌ واحد في اختبار، ولا مسّ بمنطقٍ إنتاجي ولا ترحيل. و**مؤجَّلٌ صراحةً**: مرفقات التذاكر عبر وحدة `files` (وحدتها في P-C9). `docs/PLATFORM_CONSOLE_P_C8_IMPLEMENTATION_REPORT.md`. |
| P-C9 (لوحة المنصة) | 2026-09-17 | COMPLETE | الجزء العاشر من خطة لوحة تحكم المنصة (`docs/roadmap/PLATFORM_CONSOLE_PLAN.md` §4): **العمليات** — «تشغيل الخدمة يومياً من شاشة واحدة». **ثمانية مسارات** بأسماء الخطة (`GET /platform/jobs` · `GET /platform/jobs/heartbeat` · `POST /platform/jobs/:id/retry` · `POST /platform/jobs/:id/cancel` · `GET /platform/health/detailed` · `GET /platform/files` · `POST /platform/files/:id/scan` · `DELETE /platform/files/:id`) ورمزٌ **جديد واحد**: `console.jobs.manage` الذي فصل **الفعل عن القراءة** — المدقّق يحمل `console.jobs.view` فيقرأ الطابور ولا يشغّله، والدعم لا يراه، والمالك والتشغيل يملكانه (`rbac.ts`)، وهو أيضاً رمز مدير الملفات (حجرٌ وفحصٌ فعلٌ لا عرض). وترحيل `0073_jobs_manage_permission.sql` **بلا جدول ولا عمود** (الخطة قالت «ترحيل: —» وهي محقّة): صفٌّ واحد في `permissions` + `ALTER ROLE erp_api NOBYPASSRLS`، لأن القاعدة الملزمة أن كل رمز `console.*` يُعلَن في `permissions.ts` **ويُدرَج في ترحيل**. **أربعة قرارات مصرَّح بها**: (1) **حكم فحص الفيروسات يُقرأ من مسار التدقيق لا يُخترع في اللوحة** — `files` جدولٌ بلا drizzle schema، والحكم مكتوبٌ فعلاً في `audit_log` عند `finalize` (`entity='files'` · `meta.scan`)، فالخدمة تقرأ آخر سطرٍ لكل ملف بـ`DISTINCT ON (entity_id)` وتُظهر `clean/infected/skipped` كما كتبه الماسح؛ (2) **«لم يُفحص» ≠ «لم يُفحص فعلياً»** — الأول `scan = null` (ملفٌّ لم يمرّ على الماسح)، والثاني `skipped` (مرّ عليه فقال الماسح المُهيّأ إنه لا يفحص)، وترجمة `skipped` إلى «سليم» هي الكذبة التي تُخفي الحاجة إلى ماسحٍ حقيقي؛ (3) **الإلغاء وسمٌ `dead` بسببه لا حذف** — الصفّ يبقى (مَن ألغى · لماذا · متى) ويقبل الإعادة، و`retry` يصفّر المحاولات ويمحو `lastError` و`processedAt`، والإعادة المنفَّذة/المعلَّقة `422`؛ (4) **المجسّات الستّة تقيس ما تستطيع قياسه ولا تكذب** — قاعدة · Redis · تخزين · بريد · طابور · عامل، و`not_configured` حالةٌ مستقلّة ليست عطلاً، و`p95Ms` من دلوٍ تراكمي في العملية (`MetricsService.requestSummary()`) لا من تخزينٍ ثانٍ، ولافتة الحادث من `platform.maintenance*` في الإعدادات لا نصٌّ في الشاشة. **وحمولة المهام لا تُعرض**: `payloadKeys` (أسماء المفاتيح) بدل `payload` لأنها قد تحمل محتوى العميل. **الشاشات**: `/jobs` أُعيدت كتابتها (بطاقة نبض العامل · أعمدة الاستحقاق والخطأ ومفاتيح الحمولة · زرّا إعادة/إلغاء بشرط الصلاحية وسببٍ ≥ 5 وتأكيد، ويُعطَّلان على الصفّ المنفَّذ) · `/health` أُعيدت كتابتها على `detailed` (ستّة مجسّات بأزمنة استجابة · بطاقة طلبات · بطاقة طابور · لافتة حادثة) · `/files` **جديدة** (بحث · حالتان · حكم الفحص بشارته · افحص الآن · حجر، وقسم توضيحي يفرّق بين الحالتين) · `/audit` صار فيه **عارض فرق**: كل صفّ يُفتح إلى جدول حقول (قبل · بعد · أُضيف/حُذف/تغيّر) فالفرق الذي كان مخفياً منذ P-C1 صار معروضاً. **الأرقام**: API **1114** (كان 1102) في 135 ملفاً · `platform-operations.spec.ts` **12** (طُلب ≥ 10) · contracts **128** (كان 120؛ +8 لعقود `operations.ts`) · platform-admin **24** · staff **37** · tsc×3/eslint/البناء Exit 0 · `scripts/verify-platform-operations.mjs` **76/76 في 9 أقسام** (يمرّ بدورة حياة مهمّةٍ حقيقية: إلغاء ثم إعادة، ويرفع ملفاً حقيقياً عبر واجهة العميل فيقيس أن اللوحة تعرض حكم الماسح المكتوب في التدقيق: `skipped · noop`) · `verify-platform-console.mjs` **187/187** في 20 قسماً (كان 176/19؛ §19 جديد وتصحيح عدّاد الرموز 16 → 17) — فالمجموع الحيّ **679** نقطة في **76** قسماً (كان 591/66). مسارات `/platform/*` **94** (كانت 86) وشاشات اللوحة **25** (كانت 24) والترحيلات **74**. **كشف التشغيل الحيّ خطأين حقيقيين أُصلحا**: 500 على `GET /platform/files` سببه (أ) أن `audit_log.entity_id` **نصّي** فاحتاج الانضمام `f.id::text`، ثم (ب) `RangeError: Invalid time value` لأن `tx.execute` يردّ التواقيت بصيغة postgres (`2026-09-17 13:51:09.259+00`) و`new Date` يرفضها ⇒ أُعيدت كتابة `iso()` لتُطبّع الصيغة (مسافة→`T` · `+HH`→`+HH:00` · غياب منطقة→`Z`) وترمي `DomainError` عند الفراغ. وسُجِّل **اهتزازٌ واحد غير قابل لإعادة الإنتاج** (`idempotency.spec.ts` في أول تشغيلٍ كامل، مرّ في العُزلة ثم في إعادة التشغيل 1114/1114) ولم يمسّ الجزء مساراً من مساراته. **وتصحيحٌ متقاطع**: شكّ سكربت البريد كان يشترط أن تكون كل مهمّة `email.send` معلَّقة أو منفَّذة — صحيحٌ قبل P-C9، وباطلٌ بعده لأن اللوحة صارت تُلغي (وسمٌ `dead` بسببه) ⇒ صار يقيس «حالات معلومة» + «الملغاة تحمل سبب من ألغاها» (73 → 74 نقطة). **مؤجَّل صراحةً**: محو بايتات الكائن عند الحجر (سياسة احتفاظ — نطاق P-C10)، والتحكّم في العامل من اللوحة، ومرفقات التذاكر. `docs/PLATFORM_CONSOLE_P_C9_IMPLEMENTATION_REPORT.md`. |
| P-C10 (لوحة المنصة) | 2026-09-17 | COMPLETE | الجزء الحادي عشر من خطة لوحة تحكم المنصة (`docs/roadmap/PLATFORM_CONSOLE_PLAN.md` §4): **البيانات والاسترجاع** — «نسخة تُغادر القاعدة فعلاً، وسياسة احتفاظ، وحقّ نسيان». **ثلاثة عشر مساراً** بأسماء الخطة الخمسة (`POST /platform/backups/run` · `GET /platform/backups` · `GET /platform/backups/:id/download` · `POST /platform/backups/:id/verify` · `GET/PUT /platform/retention`) + ثمانيةٌ لازمة لها (`GET /platform/backups/:id/content` للرابط الموقّع · `POST /platform/retention/apply` · `GET/POST /platform/data-requests` · `POST /platform/data-requests/:id/decide` · `POST /platform/data-requests/:id/execute` · `GET /platform/data-requests/exports/:artifactId`)، ورمزها الوحيد **`console.backups.manage`** (المجموع 18، والمنح للمالك والتشغيل وحدهما). ترحيل `0074_platform_backups.sql` (+ملف تراجع): `backup_artifacts` (الملف: مخزن · مفتاح · صيغة · خوارزمية · iv · حجم · **بصمة النصّ الصريح** · `pruned_at`) · `backup_jobs` (المحاولة: نطاق · حالة · عدّادات · مدة · `verified_at` · سبب الفشل) · `data_requests` (الطلب: نوع · حالة · `subject_email` يبقى إيصالاً · `decision_note` · `result jsonb`) بقيدين `data_requests_{decision,execution}_check` وRLS بسياسة `platform_admin_plane`، و`REVOKE UPDATE, DELETE ON audit_log FROM erp_api`، و`NOBYPASSRLS`. **ستّة قرارات مصرَّح بها**: (1) **النسخة تُبنى من الكتالوج الحيّ لا من قائمةٍ في الكود** (لا `pg_dump` في البيئة): جداول المنصّة في سياقها **مرّةً واحدة** ثم مرورٌ على كل مستأجر في سياقه — لأن RLS هو من يعرف ما يخصّ مَن، وقراءةُ جدولٍ مستأجريّ من سياق المنصّة تُخرج «صفراً صامتاً»؛ (2) **نسخةُ المستأجر تُعلن ما أسقطته** في `skippedTables` بذيل الملف (نسخةٌ تبدو كاملةً وهي ناقصة أخطر من نسخةٍ تقول ما نقص)؛ (3) **التشفير دائم لا اختياري** — AES-256-GCM بمفتاح `DATA_ENC_KEY` وإلا `FILE_URL_SIGNING_SECRET`، والملف يبدأ بترويسة `ERP-BACKUP/1` فلا يُقرأ بلا مفتاح؛ (4) **الوجهة تُعلَن**: `S3ArtifactStore` عند `isConfigured()` وإلا بديلٌ على القرص يظهر في `store`، مع مفتاح `BACKUP_STORE` (`auto`/`s3`/`filesystem`) — و**فشلُ الرفع لا يُحوَّل إلى نجاحٍ على القرص بصمت**؛ (5) **الاستعادة التجريبية تقارن ولا تكتب** — فكّ الملف ومسحه سطراً سطراً ومقارنة جداوله بالكتالوج الحيّ ⇒ `ready`/`drifted`/`unreadable`، والكتابة فوق بياناتٍ حيّة تحتاج نافذة صيانة؛ (6) **المحو إخفاءُ هويةٍ لا حذف**: تسعة حقول في `users` (بريدٌ مُجزَّأ · هاتف · كلمة مرور · سرّ MFA · حالة…) + عضويات `suspended` + جلساتٍ مُبطلة، **وسجلّ التدقيق يبقى** ويُعاد عدّه في النتيجة (`retainedAuditRows`) — ومحوُه يمحو الحقوق نفسها. والتنفيذ لا يُقبل قبل قرارٍ بسببٍ ≥ 5 (422 ثانياً) **والمحو يطلب كتابة بريد صاحب البيانات نفسه** (422 بدونه وبه خطأً). **الاحتفاظ يُنفَّذ لا يُوصف**: نوافذ في `platform_settings` (`retention.policy` بخمس نوافذ وversion يزيد مع كل حفظ) و`dry_run` يقيس بلا مسّ، و`apply` يحذف بايتات النسخ المنتهية ومفاتيح `idempotency` ومهامّ الطابور والملفات اليتيمة — **و`audit` مستثنى في المخطّط نفسه** (400) و`auditHardDeleteAllowed:false` مُعلَن. **شاشتان**: `/backups` (تشغيلٌ بنطاقٍ وملاحظة · جدولٌ بحجمٍ وبصمةٍ ومخزنٍ وفحص · بطاقة تحقّقٍ بحكمها · بطاقة احتفاظٍ بنوافذها وعدّاداتها) و`/data-requests` (فتحٌ · قرار · تنفيذ · نتيجةٌ تقول كم أُخفي وكم سُحب وكم بقي). **الأرقام**: API **1139** (كان 1114) في 136 ملفاً · `platform-backups.spec.ts` **25** (طُلب ≥ 8) · contracts **139** (كان 128؛ +11 لعقود النسخ) · platform-admin **24** (المسارات 26) · staff **37** · tsc×3/eslint/بناء الـAPI واللوحة Exit 0 · `scripts/verify-platform-backups.mjs` **87/87 في 9 أقسام** (يقيس حجم الملف **من القرص** ويقلب بايتاً فيه فيفشل التحقّق، وينزّل برابطٍ منتهٍ/مزوَّر، ويقيس الاحتفاظ بلا حذف، ثم يُنشئ صاحب بياناتٍ حقيقيّاً لمحوِ هويته) · `verify-platform-console.mjs` **200/200** في 21 قسماً (كان 187/20) — فالمجموع الحيّ **780** نقطة في **87** قسماً (كان 679/76). مسارات `/platform/*` **107** (كانت 94) وشاشات اللوحة **27** (كانت 25) والترحيلات **75**. **كشف التشغيل الحيّ سبعة أخطاء حقيقية أُصلحت**: ترويسة `sealArtifact` قُسمت خمس كلماتٍ وهي أربع (أفشل كل تحقّق) · عمودٌ غير موجود (`email_messages.template` وفي الحقيقة `event`) كان يُسقط نسخة المنصّة بـ500 · عدّاد الجداول كان يُقرأ من متغيّرٍ عارض فظهر 13 بدل 130+ · `skippedTables` كانت مُرشَّحة بقائمةٍ خفيّة فتُخفي جداول المنصّة المُسقطة · مستأجرٌ بمعرّفٍ غير موجود أعطى 500 بدل 404 لأن الإدراج يسبق التحقّق (مفتاح أجنبي) · تسمية قيدٍ اصطدمت بالاسم الذي تولّده PostgreSQL لقيد العمود نفسه (`backup_jobs_scope_check`) فصار `backup_jobs_tenant_scope_check` · وبوابة P-C1 أسقطت نهايتي المحتوى العامّتين فأُضيف الاستثناء **بالاسم** مع التحقّق من أن التوقيع هو الحارس (`verifyDownloadToken`). `docs/PLATFORM_CONSOLE_P_C10_IMPLEMENTATION_REPORT.md`. |
| P-C11 (لوحة المنصة) | 2026-09-17 | COMPLETE | الجزء الثاني عشر من خطة لوحة تحكم المنصة (`docs/roadmap/PLATFORM_CONSOLE_PLAN.md` §4): **بوابة المطوّر** — «تكامل رسمي بدل الأبواب الخلفية». **اثنا عشر مساراً** في اللوحة بأسماء الخطة (`GET/POST/DELETE /platform/tenants/:id/api-keys` · `GET/POST/PATCH/DELETE /platform/tenants/:id/webhooks` · `POST /platform/webhooks/:id/test` · `GET /platform/webhooks/:id/deliveries`) + ثلاثةٌ لازمة (تدوير المفتاح في معاملةٍ واحدة · إعادة إرسال تسليمٍ بعينه · `GET /platform/developer/catalogue` يقرأ الشاشة منه) و**سطحٌ ثالث جديد `GET /integration/v1/{me,invoices,signature}`** يُصادَق عليه بمفتاح الـAPI وحده (`ApiKeyGuard`: بادئة + بصمة SHA-256 + `timingSafeEqual` + نطاقٌ مطلوب لكل مسار)، ومعه رمزان جديدان **`console.apikeys.manage`** و**`console.webhooks.manage`** (المجموع 20؛ للمالك والتشغيل وحدهما — الدعم يتكلّم مع العميل ولا يُنشئ له اعتماداً). ترحيل `0075_developer_platform.sql` (+تراجع): أربعة جداول (`api_keys` **بلا عمودٍ للنصّ الصريح** · `webhook_endpoints` بسرٍّ **مشفَّر** لا مُجزَّأ لأنه يُقرأ لحظة التوقيع · `webhook_deliveries` بصفٍّ يُكتب **قبل** الـPOST · `api_key_uses`) بـRLS مُفعَّل ومفروض وسياسة `platform_admin_plane`، ومنح `erp_api` بلا `DELETE` على المفاتيح (الإبطال وسمٌ لا حذف) وبـ`DELETE` على العناوين وحدها، **ومنحٌ صريح على `api_key_uses_id_seq`** (تفصيله أدناه)، وصفّا صلاحيات، و`NOBYPASSRLS`. **ثمانية قرارات مصرَّح بها**: (1) **المفتاح لا يُخزَّن نصّاً** — `erp_live_<24B base64url>` يُعاد مرّةً واحدة، والمحفوظ بادئةٌ وبصمة، ومن نسيه يُدوّر ولا ينتظر إعادة عرض؛ (2) **السرّ مشفَّر لأننا نقرؤه** بخلاف المفتاح الذي يُقارَن — الفرقان في المخطّط لا في تعليق؛ (3) **التوقيع بنافذة**: `x-erp-signature: t=…,v1=…` على `HMAC-SHA256("<t>.<body>")` ونافذة 300 ثانية، **والطابع داخل المُوقَّع** فلا يصحّ توقيعٌ إلى الأبد؛ (4) **التسليم يسبق الطلب** بتراجع 60/300/1800 ومن نفس ماسح المهامّ (`scanPending ≤ 20`)، فانقطاعٌ في منتصف الإرسال لا يمحو واقعة؛ (5) **زرّ الاختبار يمرّ من مسار الإرسال نفسه** (يوقّع · يُرسل · يقيس) ولا يوجد زرٌّ يوهم بالسلامة؛ (6) **الإيقاف يمنع التلقائي لا اليدوي** (صفر صفّ لحدثٍ حقيقي والعنوان موقوف — يُقاس في السبيك — ويبقى الاختبار لمن أصلح مستقبِلَه للتوّ)؛ (7) **حمولة التسليم تُعرض بمفاتيحها لا بقيمها** (نفس قرار P-C9: بيانات العميل تُقرأ عنده)؛ (8) **الكتالوج من الخادم** فلا تتخلّف الشاشة عن العقد. **خمسة مُنتِجين حقيقيين**: sales (`invoice.posted` · `invoice.voided` · `invoice.paid`) · treasury (`shift.closed`) · einvoicing (`einvoice.submission_failed`) · inventory (`stock.below_reorder` لكل صنفٍ ومخزن، ويتجاهل `minQty ≤ 0`) · platform-billing (`subscription.activated`/`plan_changed`/`suspended`) — عبر `WebhookPublisher.emit` الذي **لا يرمي أبداً** فلا يسقط فعلٌ تجاري لأن ويب هوك عميلٍ تعطّل. **ثلاث شاشات**: `/api-keys` (نطاقات من الكتالوج الحيّ · تدوير · إبطالٌ بسببٍ يُكتب في التدقيق · آخر استخدام وعدد الطلبات) · `/webhooks` (الأحداث · بطاقة السرّ مرّةً واحدة بصيغة التوقيع · حصيلة التسليمات وآخر ردّ · سجلٌّ بالرمز والزمن ومفاتيح الحمولة وإعادة الإرسال) · `/api-explorer` (يقرأ `/api/docs/openapi.json` من أصل اللوحة — لا CORS ولا نسخة ثانية من الوثيقة تُكتب في الواجهة). **الأرقام**: API **1155** (كان 1139) في 137 ملفاً · `platform-developer.spec.ts` **16** (طُلب ≥ 10) · contracts **151** (كان 139؛ منها **12** لعقود المطوّر) · platform-admin **24** (المسارات 14) · staff **37** · tsc×2/eslint×3/بناء packages+api+platform-admin **Exit 0** (29/29 صفحة) · `scripts/verify-platform-developer.mjs` **63/63 في 9 أقسام** (مستقبِل HTTP حقيقي يتحقّق من التوقيع داخل السكربت، ثم يُعطَّل 500 فيُقاس الفشل والإعادة) · `verify-platform-console.mjs` **218/218** في 22 قسماً (كان 200/21؛ §21 جديد بـ18 نقطة) — فالمجموع الحيّ للوحة **861** نقطة في **97** قسماً (كان 780/87). مسارات `/platform/*` **119** (كانت 107) وشاشات اللوحة **30** (كانت 27) والترحيلات **76**. **كشف التشغيل الحيّ ثلاثة أخطاء**: (أ) **500 على كل طلبٍ بمفتاح** — تسلسل `api_key_uses_id_seq` بلا منح، لأن `0000_platform_identity.sql` منح التسلسلات القائمة يومها وضبط الافتراضيات للجداول فقط (خطأٌ لا يظهر إلا في تشغيلٍ حقيقي) ⇒ أُضيف المنح داخل 0075 وأُعيد تطبيقه فصار `/integration/v1/me` **200**؛ (ب) **حدث الاختبار لم يحمل اسمه** في الحمولة (وصل وموقّعاً وقياسه فشل) ⇒ صارت الحمولة `{ event, tenantId, endpointId, at, via }` كما تفعل الأحداث الحقيقية؛ (ج) **28 خطأ eslint** أُصلحت كلها (16 استيراداً بالـ`--fix`، و11 من حارس المال **بإعادة تسمية** `matched`/`collected`/`billed` لا بتعطيل القاعدة، و`operations` غير المستعمل **صار يُقاس**: دور التشغيل يقرأ مفاتيح المنشأة والكتالوج) مع **7 مخالفاتٍ قائمة في HEAD** فُحصت بنسخ `git show HEAD:` وأُصلحت (فصار eslint نظيفاً في الحزم الثلاث). و**حقيقةٌ سلوكية قِيست**: أدوار المنصة تُقرأ **من الرمز لا من القاعدة** — جلسةٌ أُصدرت قبل المنح تُردّ 403 وإن كان `/me` يقول إنها تحمله. و**مؤجَّلٌ صراحةً**: المستأجر التجريبي (sandbox) — نطاقٌ قائم بذاته لم يُنفَّذ بدل تنفيذٍ «شبه» يكسر بياناتٍ حقيقية. `docs/PLATFORM_CONSOLE_P_C11_IMPLEMENTATION_REPORT.md`. |
| P-C12 (لوحة المنصة) | 2026-09-17 | COMPLETE | الجزء الثالث عشر والأخير من خطة لوحة تحكم المنصة (`docs/roadmap/PLATFORM_CONSOLE_PLAN.md` §4): **التحليلات** — «أن ترى المنصة نفسها كما يراها عملاؤها». **لا حساب ثانٍ ولا رقم مُخترع**: `mrr` و`arr` والتحصيل تُقرأ من `PlatformBillingService.revenue()` (P-C4) نفسها — ويقيس السبيك التطابق مع `/platform/revenue` حرفاً بحرف — والاستخدام وحدوده من `UsageService.grid()` (P-C5) مع `limitSource` و`enforced` يسافران مع الرقم فلا يدّعي التقرير سقفاً غير مُطبَّق. **أربعة مسارات قراءة**: `GET /platform/analytics/{overview,funnel,cohorts,export.csv}` برمزٍ واحد جديد **`console.analytics.view`** (المجموع **21**؛ `view` لا `manage` لأن الوحدة كلها `GET` — ولا مسار يكتب صفًّا) يُمنح لأربعة أدوار: المالك · التشغيل · الفوترة · المدقّق (قراءةٌ خالصة) — **ولا يُمنح للدعم**. **التسرّب يُقاس مرّتين** (بالشعارات وبالمال) ولكلٍّ **مقامُه معلَناً** (عدد المتعاقدين أوّل الشهر وقيمتهم)، و**النسبة بلا مقام `null` لا `0٪`** — والصفر هنا كذبةٌ صغيرة تُتّخذ قراراً. **القمع** أربع خطوات (`signed_up → activated → first_invoice → first_einvoice`) بالمهل لا بالأعداد (وسيط الأيام والمئين ٩٠ من التسجيل)، وخطوتاه الأخيرتان تُقاسان بفعل العميل (`sales_invoices` و`zatca_status IN reported|cleared`) لا بفاتورتنا عليه — وإلا لقِسنا تحصيلنا وسمّيناه تفعيله. **الأفواج** خليّة برقمين: من بقي **متعاقداً** ومن **استعمل** فعلاً (فاتورة مبيعاتٍ مرحَّلة في الشهر) — والفارق بينهما هو ما يُقرأ. **ستة أنواع تنبيه** كلٌّ لها مصدرٌ في القاعدة (`trial_ends_at` · فاتورة منصةٍ متأخّرة · شبكة الاستخدام ٩٠٪+ · منشأة بلا ترخيص بعد ٣٠ يوماً · عميل متعاقد صامت ٣٠ يوماً · تسليمات ويب هوك فاشلة) و`href` إلزاميّ وخمسة أمثلة بالأسماء حدًّا أعلى — **وتنبيهٌ بعددٍ صفر لا يُعرض**. **ملف CSV** أربعة عشر عموداً (تُبنى في الذاكرة وتُرسل نصّاً: لا ملفٌّ على القرص ولا رابطٌ يُشارَك) تُقارَن ترويسته بأعمدة العقد حرفاً بحرف في التحقّق الحيّ، والبحث عن `NaN`/`undefined` فيه أصدق اختبارٍ لتنسيق المال. ترحيل `0076_analytics_permission.sql` (+تراجع) **بلا جدول** — إدراج الرمز و`NOBYPASSRLS` فقط، كما قالت الخطة («ترحيل: — يقرأ القائم + عدّادات P-C5»). شاشة `/analytics` (أربع بطاقات · تنبيهاتٌ بروابطها · منحنى الإيراد · التسرّب بالوجهين · القمع بنافذته · الأفواج بمبدّل أساسها · الاستخدام لكل باقة · تصدير CSV). **الأرقام**: API **1165** في 138 ملفاً (كان 1155/137) · `platform-analytics.spec.ts` **10** (طُلب ≥ 8) · contracts **167** في 19 ملفاً (كان 151/18؛ منها **16** لعقود التحليلات) · platform-admin **24** · staff **37** · tsc×2/eslint×3/بناء packages+api+platform-admin **Exit 0** (‏30 صفحة · `/analytics` 6.21 kB) · `scripts/verify-platform-analytics.mjs` (جديد) **49/49 في 9 أقسام** — للقراءة فقط بلا تنظيف · `verify-platform-console.mjs` **218/218** · `verify-platform-developer.mjs` **63/63** — فالمجموع الحيّ للوحة **910** نقطة في **106** قسماً (كان 861/97). مسارات `/platform/*` **123** (كانت 119) ومسارات OAS **546** وشاشات اللوحة **31** (كانت 30) والترحيلات **77** حتى 0076. **ثمانية أخطاء حقيقية كشفها التشغيل والاختبار**: (أ) **400 على كل نداءٍ بلا معاملات** — `ZodValidationPipe` يمرّر `undefined` والمخطط بلا `.optional()` ⇒ أُصلح على نوافذ الاختيار وبـ`shape.days` للمخطّط الكائن؛ (ب) **نافذة التجربة كانت تُخمَّن** من `created_at + 14` بدل `trial_ends_at` ⇒ صفرٌ دائماً، فصارت تُقرأ من المحفوظ بدالّةٍ واحدة يستعملها العرض والتنبيه؛ (ج) **كذبة الصفر في التسرّب** ⇒ `null` في العقد والشاشة والسبيك يقيس الحالتين؛ (د) تعارض قيد `branches_tenant_default_key` في تهيئة السبيك ⇒ يُعاد استعمال الفرع الافتراضي؛ (هـ) **ترويسة CSV بلا مقابلٍ في العقد** (١٥ عموداً مقابل ١٤) ⇒ وُحِّدت ويقيسها التحقّق الحيّ؛ (و) `http.ts` لم يكن يُرجع النصّ ⇒ أُضيف `text` إلى `ApiCall`؛ (ز) **قاعدة المال في eslint اصطادت عارض الشاشة** (`const amount`) ⇒ إعادة تسمية إلى `parsed` بلا تعطيل القاعدة؛ (ح) **عدّادات سكربت اللوحة كانت مثبَّتة** (٢٠ رمزاً و٥ للمدقّق) ⇒ ٢١ و٦ — ورمزٌ يُضاف إلى الفهرس ولا يبلغ الأدوار يجب أن يسقط في التحقّق لا في يد المشغّل. و**مؤجَّلٌ صراحةً**: التقرير الأسبوعي بالبريد (كل ما يُحسب ويُقرأ نُفِّذ؛ وبقي التسليم الدوري: قالب P-C6 + مجدول) · وأفواج الإيراد (تحتاج تخصيصاً شهرياً للترخيص) · وتصدير Excel/PDF. وبإتمامه **اكتملت أجزاء خطة لوحة المنصة الاثنا عشر كلها** بلا استثناء. `docs/PLATFORM_CONSOLE_P_C12_IMPLEMENTATION_REPORT.md`. |
| P-M1+M2+M5 (الموقع التسويقي) | 2026-09-18 | COMPLETE | الأجزاء الأولى من خطة الموقع التسويقي (`docs/roadmap/MARKETING_SITE_PLAN.md` §5 و§6): **الأساس والتصميم وSEO** · **الرئيسية والوحدات** · **نظام إدارة المحتوى** كاملاً. **الموقع**: قشرةٌ (رأس بتسمياتٍ من `content_menus` · مبدّل لغة · تذييل · لافتة) ونظام تصميم في `globals.css` بلغتين (RTL/LTR) — 27 ملفّ صفحة: 12 مساراً عربياً و10 إنجليزية (`/` · `/features` · `/features/einvoicing` · `/blog` · `/cases` · `/help` · `/legal/[slug]` بأدواته، والأسطح التشغيلية القائمة)، و`generateMetadata` لكل صفحة و`hreflang` ثلاثي و`canonical` من `contentPathOf` دالّةً واحدة مع `sitemap.ts`/`robots.ts`، و**JSON-LD** لأربعة أنواع (Organization · SoftwareApplication · Article · FAQPage) **بلا `aggregateRating` مُخترع**. و**زيادةٌ فوق الخطة**: **404 بحالة 404 فعّالة** — Next 15 لا يُصدرها من صفحةٍ ديناميكية (أُثبت بمجسّ)، فالوسيط يسأل `/public/content/:slug` و`rewrite` إلى `/not-found-view/{ar|en}` بحالة 404 مع وسم `noindex`. **المحتوى**: ترحيل `0077_content.sql` (+تراجع) بخمسة جداول (`content_pages` · `content_blocks` · `content_menus` · `content_banners` · `content_versions`) وRLS مُفعَّل ومفروض وقيودٍ مكتوبة (نافذة اللافتة · slug ASCII · حدّ النصّ)، وستّة أنواع محتوى وأحد عشر نوع كتلة (لا HTML حرّاً) بمخطّطات Zod تُحقَّق في العقد والسبيك **وفي الشاشة قبل الإرسال**، و**أربعة عشر مساراً** في اللوحة (`GET /platform/content/{pages,categories,menus,banners}` · `POST/PATCH banners` · `PUT menus/:position` · `POST pages` · `GET/PATCH pages/:id` · `publish` · `retract` · `versions` · `restore`) و**سبعة مسارات عامّة** (`/public/{site,sitemap,posts,help,faq,banners,content/:slug}`). ورحما صلاحية جديدان **`console.content.view`** و**`console.content.manage`** (المجموع 23؛ المالك والتشغيل بالرمزين، والدعم والمدقّق بـ`view`) وترحيل `0078_content_permissions.sql` (+تراجع). **محرّك النشر المجدول**: الجدولة مهمّة `content.publish` على `maintenance` بوقتها، **ومسح `publishDue` idempotent** يُنادى قبل كل قراءةٍ عامّة فينشر ما استحقّ حتى بلا عامل، و`publishNow` بفاعلٍ `null` واسم «نظام الجدولة» في التدقيق. **والسحب لا الحذف**: لا مسار `DELETE` أصلاً؛ الصفحة تعود مسوّدةً بسببٍ مكتوب (3..300) ويبقى الرابط محجوزاً. و**شاشة `/content`** أربعة تبويبات (الصفحات بفلاتر ومحرّر أحد عشر حقلاً وجدولةٍ بإزاحةٍ صريحة ونسخٍ واستعادة · الكتل بمحرّرٍ بلغتين وتحقّقٍ محليّ وترتيبٍ وأحد عشر قالباً · القوائم الخمس · اللافتات بنافذةٍ وجمهورٍ ووسم `live` من الخدمة). **وأخطاءٌ حقيقية أُصلحت**: (أ) `kind` في `/public/posts` كان ثابتاً `'post'` ⇒ **`/cases` فارغة أبداً**، صار معاملاً (افتراضيه `post`)؛ (ب) **`PATCH` لافتةٍ بـ`endsAt` وحده ⇒ 500 INTERNAL** من قيد `content_banners_window_check` ⇒ مدقّقة `.refine` في العقد + فحص النافذة **الفعّالة** في الخدمة (مع `starts_at` المخزّن) ⇒ 400/422 بوصفٍ عربي؛ (ج) ميتاداتا 404 خرجت بلغةٍ واحدة ⇒ `app/not-found.tsx` + لغة المسار؛ (د) عدّادات مثبَّتة في السبك والسكربتات (19→27 مفتاحاً · 21→23 رمزاً)؛ (هـ) `rows[0].next` ومسار استيرادٍ خاطئ في الخدمة؛ (و) استيراداتٌ ميتّة في المتحكّمين؛ (ز) قاعدة المال في eslint اصطادت `total`/`tenantCount` ⇒ إعادة تسمية بلا تعطيل القاعدة. **الأرقام**: API **1191** في **140** ملفاً (كان 1165/138؛ `public-content.spec.ts` 10 و`platform-content.spec.ts` 16) · contracts **167**/19 · platform-admin **24** (و**32** صفحة، أُضيف `/content`) · staff **37** · marketing **18** في 3 ملفات · tsc×4/eslint×4/بناء packages+api+platform-admin+**marketing الإنتاجي** (بـ`NEXT_DIST_DIR`) كلها **Exit 0** · `scripts/verify-content.mjs` (جديد) **62/62 في 7 أقسام** (يعيد التشغيل بلا أثر) · `scripts/verify-marketing-site.mjs` (جديد) **37/37 في 4 أقسام** · `verify-platform-console.mjs` **224/224** (كان 218) · OAS **564 مساراً / 738 عملية** · الترحيلات **79**. **مؤجَّلٌ صراحةً**: P-M3 · P-M4 · P-M6…P-M10 · ونقطة `/public/testimonials` (الشهادات من `cases` عمداً) · و**التقرير الأسبوعي بالبريد** (المؤجَّل من P-C12). `docs/MARKETING_SITE_CMS_P_M1_M2_M5_IMPLEMENTATION_REPORT.md`. |
| P-C12-التسليم (التقرير الأسبوعي) | 2026-09-18 | COMPLETE | **التسليم الدوري المؤجَّل من P-C12** (`docs/roadmap/PLATFORM_CONSOLE_PLAN.md` §4: «تقرير أسبوعي بالبريد … يبني على P-C6»): تقريرُ المنصّة يُرسل نفسه في يومه وساعته إلى عناوين يضبطها المشغّل. **لا حساب ثانٍ**: الأرقام من `PlatformAnalyticsService.overview()` (P-C12) نفسه، والمنضمّ/المغادر بتعريفه بنافذة أسبوع. **القرارات الأربعة محسومة ومكتوبة**: المستلم `report.weekly_recipients` (إعداد منصّة، وتفريغُه يعني «لا تقرير» لا «أرسل إلى أحد») · اليوم/الساعة `report.weekly_{day,hour}` بتوقيت الخادم مع تسمياتٍ عربية · الفشل نتيجةٌ لكل مستلم (`sent`/`skipped`/`failed`) لا يُسقط بقيّة العناوين وإعادةُ المحاولة من سلّم P-C6 نفسه · والتكرار يمنعه **سجلّ البريد**: رسالةٌ بالعنوان نفسه أُنشئت **بعد إغلاق النافذة** تمنع إرسالاً ثانياً و`force` يتجاوزه صراحةً. **حدث بريد جديد** `report.weekly` بنطاق `platform` (فلا يُحتسب على حصّة عميل) ببذرة قالبٍ عربية وإنجليزية، **ونوع مهمّة** `report.weekly` على طابور «الصيانة» يُسجّله `WeeklyReportModule` بنمط `ContentModule`. **مجدول**: نبضة كل دقيقة + **لحاق الإقلاع** (خادمٌ أُعيد تشغيله بعد الموعد لا يفقد أسبوعاً) + `QueuePort.ping()` لأن `isEnabled()` تقول «مُعلَن» لا «حيّ» — فالبيئة بلا Redis (هذه) تُشغّله. **مساران**: `GET /platform/reports/weekly` (`console.analytics.view`) و`POST …/run` (`console.email.manage`). **بلا ترحيل** (79 كما هي): المفاتيح من كتالوج الإعدادات والحدث نصٌّ لا enum. **وبطاقة في `/analytics`** (الحالة · الموعد · المستلمون · أُرسل لهذه النافذة · ما سيقوله · زرّ الإرسال). **وأخطاءٌ حقيقية**: (أ) `Authentication required` من مهمّةٍ خلفية في `PlatformBillingService.revenue` ⇒ سياق نظام `runAsSystem` بلا جلسةٍ مُصطنعة؛ (ب) الحجر ببداية النافذة كان يُسقط تقرير الأسبوع التالي ⇒ القياس على **نهايتها**؛ (ج) «آخر موعد مرّ» كان يُرسل قبل الساعة بساعة ⇒ `occurrenceForWindow`؛ (د) `select` يُكتب بالرقم يُرفض 422، والشاشة كانت تعرضه نصّاً حرّاً ⇒ خياراتٌ نصّية بتسميات، ونشر `options/optionLabels/min/max` في العقد؛ (هـ) سكربت التحقّق كان يعدّ عدّاً مطلقاً فيفشل في التشغيل الثاني ⇒ العدّ بالفرق. **الأرقام**: api **1204** في **141** ملفاً (كان 1191/140؛ `weekly-report.spec.ts` **13**) · contracts **167**/19 · platform-admin **24** · staff **37** · OAS **566 مساراً / 740 عملية** (كان 564/738) · مفاتيح الإعدادات **31** (كانت 27) · أحداث البريد **18** وبذورها **36** · tsc×3/eslint×3/بناء api وplatform-admin **Exit 0** (‏32 صفحة · `/analytics` 4.9 kB) · `scripts/verify-weekly-report.mjs` (جديد) **35/35** (تشغيلان) · `verify-platform-console.mjs` **225/225** (كان 224) · `verify-content.mjs` **62/62** · `verify-marketing-site.mjs` **37/37**. و**مؤجَّلٌ صراحةً**: أفواج الإيراد وتصدير Excel/PDF · المستأجر التجريبي · P-M3/P-M4/P-M6…P-M10 · بريد SMTP حقيقي (البيئة على `console`). `docs/WEEKLY_REPORT_IMPLEMENTATION_REPORT.md`. |
| P-M3 (الموقع التسويقي) | 2026-09-18 | COMPLETE | الجزء الثالث من خطة الموقع التسويقي (`docs/roadmap/MARKETING_SITE_PLAN.md` §5): **الباقات والأسعار** — «تسعير حقيقي من المنصة، بمقارنة تُقنع». **مسارٌ عامٌّ ثالث لا إعادة استعمال مسارٍ قائم**: `/billing/plans` (P-C1) يقرأ الأسعار بلا حقوق، و`/platform/plans` (P-C4) يجلس خلف `console.plans.manage` ويعرض الموقوفة ومعرّف مزوّد الدفع — فأُضيف `GET /public/plans` (`PublicPlansController` + `PublicPlansService`، `@Public()`، `GET` وحدها) يقرأ `billing_plans ⋈ billing_plan_entitlements` **للنشطة وحدها**، ويُرجع `{data, meta}`: كل باقة بمعرّفها ورمزها واسمها ودورتها وسعرها النصّي بمنزلتين ومكافئها الشهري (`platformMonthlyAmount`) وما يُدفع في السنة (`annualAmount`: مبلغ السنوية أو الشهرية × 12) وحقوقها — **والترتيب بالمكافئ الشهري قرارٌ في الكود لا مصادفةٌ في `ORDER BY`** (الباقة السنوية بـ415.83 شهريًّا تسبق الشهرية بـ499). **والحقوق بلغتين من سجلّ المنتج**: أُضيف `labelEn` إلى `tenantFlagLabels` (الحزم الأربع: «نقطة البيع / Point of sale» · «المشاريع / Projects» · «الرواتب والموظفون / Payroll & HR» · «الأنشطة المتخصصة / Specialised activities») وإلى `PlatformEntitlementKey` و`platformPlanEntitlementSchema` (والاسم من `labelEn` في `platformSettingDefinitions` للحدود)، ومفتاحٌ جديد لم تُكتب تسميته يسقط إلى وصف السجلّ بدل الفراغ. **وملاحظة الضريبة رقمٌ لا نصّ**: `meta.vatRatePercent` من `platform_settings.billing.tax_rate` (قراءةٌ عبر `withPlatformAdminTx` بلا كتابة ولا تدقيق) — والتحقّق الحيّ يكتب 6 ثم يعيد 15 فيتحرّك الرقم في الـAPI وفي الصفحة. **والصفحة `/pricing` أُعيد بناؤها**: مبدّل الدورة **رابطان لا زرّان** (`/pricing` و`/pricing?interval=year`) لأن بالحالة يبقى جدول السنة في المتصفح وحده — فلا مكوّن عميل في صفحة الأسعار أصلاً؛ وبطاقات الباقات بمكافئها الشهري وشارة توفيرٍ **مقيسة** (`(499×12 − 4990) ÷ 5988 = 17٪` بـ`decimal.js`، وتُسكت إن لم تكن السنوية أرخص)؛ **وجدول مقارنة** يُبنى من **اتّحاد الحقوق المعلنة فعلاً** (8 حدود + 4 حزم في بذرة العرض) بأسماء الأعمدة القصيرة من نصّ P-M3، وصفّ **بوابات الدفع** كـ**قدرةٍ في المنتج** لا مفتاحَ حقٍّ مُخترعاً (`apps/api/src/modules/payments/gateways/index.ts:14` — جيديا · NeoLeap) بمصدرٍ مكتوب أسفل الجدول؛ وثمانية أسئلة تسعير أجوبتها من قواعد المستودع (تناسب الترقية · `USAGE_LIMIT_REACHED` · الفاتورة الضريبية · التجربة · التصدير) بلا رقم مُخترع؛ وبيانات منظَّمة `Product`+`Offer` لكل باقة (`billingIncrement` 12 للسنوية) مع `FAQPage`. **والبذرة تحمل حقوق الباقات الثلاث** (32 حقًّا: 8 للأساسية و12 لكلٍّ من الاحترافية الشهرية والسنوية) بكتابةٍ تحت مشغّل المنصة (RLS مفروض على الجدول) وبمسحٍ لما شُطب — «باقةٌ بلا حقوقها سعرٌ بلا مقابل». **ولا رقم مكتوب في الصفحة**: تعديل السعر من اللوحة يظهر في `/public/plans` وفي HTML بلا نشرة (زمن إعادة التحقّق صفر في التطوير). **الأرقام**: API **1213** في **142** ملفاً (كان 1204/141؛ `public-plans.spec.ts` **9**: النشطة فقط · الحقوق بلغتين · SAR والمكافئات · بلا `stripePriceId` · القراءة عامة والكتابة غير موجودة والإداري محروس · الترتيب · الضريبة من الإعدادات · RLS) · contracts **169**/19 (كان 167؛ منها اختباران لاسم الحقّ الإنجليزي ولشكل الباقة العامة) · marketing **29** في 4 ملفات (كان 18/3؛ `tests/pricing.spec.ts` **11**) · platform-admin **24** · staff **37** · OAS **567 مساراً / 741 عملية** (كان 566/740) · tsc×3/eslint×4/بناء marketing الإنتاجي **Exit 0** (25 مساراً · `/pricing` 219 B) · `scripts/verify-pricing.mjs` (جديد) **53/53 في 5 أقسام** (ثلاثة تشغيلات، ويعيد الحالة: باقة التحقّق تُوقف لا تُحذف والنسبة تعود). **وأخطاءٌ حقيقية أُصلحت**: (أ) قاعدة المال في eslint اصطادت `amount` و`rate` في الخدمة وفي الواجهة ⇒ إعادة تسمية بلا تعطيل القاعدة و`decimal.js` للحساب؛ (ب) شارة التوفير وملاحظة الضريبة كانتا عقدتين في React (`17` ثم `%`) ⇒ نصٌّ واحد يُبنى في سلسلة فيُقرأ في HTML وفي الفحص؛ (ج) الوجه السنوي كان في متصفح الزائر وحده ⇒ صار مساراً على الخادم. **مؤجَّلٌ صراحةً**: `/en/pricing` (الخريطة §4 تسمّي `/pricing` وحدها، والنصوص الإنجليزية جاهزة في القاموس) · دمج `/public/faq` المنشورة في أسئلة التسعير (لا كتلة FAQ منشورة اليوم) · توحيد `/signup/plans` مع `/public/plans` في P-M4 · وP-M4 · P-M6…P-M10. `docs/MARKETING_PRICING_P_M3_IMPLEMENTATION_REPORT.md`. |
| النشر والتشغيل المحلي | 2026-09-18 | COMPLETE | طلبٌ منفصل عن خطة اللوحة/الموقع: **ملفّات نشرٍ كاملة + تشغيلٌ محليّ بأمرٍ واحد**. **المُسلَّم**: `deploy/Dockerfile.api` (بناء متعدّد المراحل · مستخدم 10001 · `HEALTHCHECK` على `/health/live`) · `deploy/Dockerfile.web` (صورةٌ واحدة بـ`--build-arg APP=` · standalone · الأمر بصيغة shell ليُقرأ `APP` · بلا `COPY public` لعدم وجود المجلّد) · `deploy/docker-compose.yml` (postgres · redis · mailhog · **migrate** ينفّذ roles←migrate←seed ثم ينسحب · api بـ`DATABASE_URL` بدور `erp_api` المحدود · الواجهات الثلاث · `API_PROXY_TARGET` **وسيط بناء** لأن standalone يجمّد `rewrites`) · `deploy/.env.example` · `deploy/k8s/` **٩ ملفات** (اسم · إعدادات · سرّ · بيانات: Postgres StatefulSet + NetworkPolicy · Job الترحيل بوسم Argo PreSync · API بـ`readinessProbe` على `/health/ready` و`startupProbe` + worker + HPA ٢–٦ · ثلاث واجهات · Ingress بأربعة نطاقات · kustomization بوسوم GHCR) · `.github/workflows/release.yml` (٤ صور إلى GHCR + نشرٌ اختياري على العنقود عبر `KUBE_CONFIG`) · **`scripts/local-start.sh` + `pnpm start:erp:local`** (يقرأ `.env` · يفحص الأدوات والقاعدة والمنافذ ويمنع البناء مع خادمٍ يعمل · يبني الحزم والـAPI والواجهات · يرحّل ويبذر · يُقلع الخمسة بـ`setsid` · ينتظر الجهوزية ويطبع جدول الروابط؛ وخيارات `--dev --no-build --no-seed --with-db --force --stop --status`). **ونُفِّذ فعلاً**: الأسطح الأربعة تعمل في **وضع الإنتاج** — API 3000 (`/health/live` = `{status:ok}` · `/health/ready` = قاعدة متّصلة) · staff 3001 · marketing 3002 (`/pricing` 200 بالقيم الحقيقية) · console 3003 · وقاعدةٌ مُرحَّلة (٧٩) ومبذورة. **وعشرة أخطاء حقيقية أُصلحت**: (١) `NODE_ENV=development` من `.env` كان يُسقط `next build` برسالةٍ مضلّلة `<Html> should not be imported outside of pages/_document` عند توليد `/404` ⇒ تثبيت `NODE_ENV=production` في كل بناء (وكان هذا سبب «التعثّر العابر» الذي ظنّناه عابراً)؛ (٢) مسار الفحص الصحيح `/health/live` و`/health/ready` لا `/health` (وقد صُحّح في السكربت والصورة وcompose وk8s)؛ (٣) `.next` المشترك مع dev يُمسح قبل البناء الإنتاجي؛ (٤) `CMD` بالصيغة التنفيذية لا تُستبدل فيها المتغيّرات؛ (٥) `COPY public` كان سيفشل البناء؛ (٦) العامل هو `dist/main.js` مع `WORKER=1` لا `dist/worker.js`؛ (٧) `deploy/.env.example` كان مُتجاهَلاً فاستُثني. (٨) قراءة `.env` بمُحلِّل التطبيق نفسه (`scripts/env-exports.mjs`) لأن مفاتيح PEM مكتوبةٌ في سطرٍ واحد بـ`\n` حرفية وكانت تُنتج مفتاحاً مشوّهاً ⇒ كل تسجيل دخول 500 بـ`asn1 encoding routines::header too long`؛ (٩) `setsid` يتفرّع فيصير `$!` أَباً عابراً ⇒ الخدمة تكتب PID نفسها، ومعها شبكة أمان تُغلق ما يشغل المنفذ؛ (١٠) نافذة صلاحية ذاكرة بيانات Next (30 ثانية في الإنتاج) جعلت 4 نقاط تحقّق حيّة تسقط بعد النشر ⇒ المدّة صارت مفتاحاً `MARKETING_REVALIDATE_SECONDS`، وتُضبط `0` في النشر المحلي (بناءً وتشغيلاً)، وخريطة الموقع تأخذ المدّة من المصدر نفسه. **حدٌّ صريح**: لا متصفّح في بيئة العمل وشبكة تنزيله محجوبة ⇒ لا لقطات PNG؛ البديل المستندي `docs/deployment-evidence/` (٤ لقطات HTML مكتفية بذاتها + جدول الحالات ونصوص الاستجابات)، وملفّات Docker/k8s مُتحقَّقٌ من نحوها بـ`js-yaml` ولم تُبنَ لعدم توفّر Docker/العنقود. `docs/DEPLOYMENT_GUIDE.md` · `docs/DEPLOYMENT_REPORT.md` · `docs/DEPLOYMENT_SUMMARY.md`. |
| P-M4 (الموقع التسويقي) | 2026-09-18 | COMPLETE | الجزء الرابع من خطة الموقع التسويقي (`docs/roadmap/MARKETING_SITE_PLAN.md` §5): **الاشتراك والتفعيل** — «من زائر إلى منشأة عاملة في جلسة واحدة». **معالج أربع خطوات** في `/onboarding` (الباقة ← المنشأة: الاسم والرمز والدولة والعملة والمنطقة الزمنية ← المدير: الاسم والبريد وكلمة المرور والهاتف ← التحقّق: رمزٌ بالبريد) بشريط خطواتٍ يقول ما مضى وما بقي، ثم **لوحة ترحيب** بمهامّ إعدادٍ **مقيسة من القاعدة** لا مُفترضة (ملفّ المنشأة من `tenants` · عدد الفروع الفعّالة · عدد الحسابات · عدد الفواتير) بترتيب «غير المنجَز أولاً» ورابط كل مهمّة إلى مسارها في `apps/staff` (`/settings` · `/settings/branches` · `/accounting/accounts` · `/sales/invoices/new`) ونسبة تقدّم. **أربعة أبواب عامّة**: `GET /signup/plans` (**موحَّد** مع `/public/plans`: الاثنان يقرآن `PublicPlansService.publicPricing()` نفسه فتتطابق القائمتان حرفاً بحرف) · `POST /signup` (201) · `POST /signup/verify` (200) · `POST /signup/resend` (200) · `GET /signup/status/:email?token=` — وكلها `@Public()` بدلاء معدّل مشتركة. **رمانٍ مفصولان بقرار مكتوب**: `code` ستةُ أرقام يُخزَّن **sha256 وحده** ويُرسل بالبريد (٣٠ دقيقة · ٥ محاولات · سقف ٥ إرسالات · مهلة ٦٠ ثانية بين إرسالين · مقارنةٌ بزمن ثابت)، و`token` ثمانيةٌ وأربعون حرفاً يُعاد **مرّةً واحدة** ويحرس الحالة في verify/resend/status — لأن الرمز القصير لا يصلح حاملاً للهوية (مساحته مليون احتمال). **والجواب واحد (404 بنصٍّ واحد) للعنوان المجهول وللرمز الخاطئ ولتسجيلٍ لا يخصّ البريد** فلا يتحوّل مسارٌ عامّ إلى **أداة سرد عناوين**؛ والتحقّق **idempotent**، والإغلاق بعد المحاولات على **الطلب** لا على الرمز، وإعادة الإرسال تفتحه برمزٍ جديد. **ولا رخصة تُمنح ذاتياً**: التسجيل ينشئ منشأةً ومديراً وفرعاً ودليل حسابات ثم يترك الاشتراك `pending` في **طابور تفعيل المشغّل** (`POST /platform/activation-requests/:id/review`)؛ و**فترة التجربة إعدادٌ لا رقم**: مفتاح `billing.trial_days` الجديد (14) يُقرأ في التسجيل ويُكتب في `activation_requests.notes` بصيغة `trial 14d` (فصار كتالوج الإعدادات **32** مفتاحاً). **وحدث بريد منصّيّ جديد** `signup.verify` بنطاق `platform` (الزائر ليس عميلاً بعد فلا حصّة تُحتسب عليه) ببذرتَي قالبٍ عربية وإنجليزية، وفشل البريد **لا يُسقط التسجيل** (يُسجَّل تحذيراً ويبقى طلبُ رمزٍ جديدٍ ممكناً). **ترحيل `0079_signup_verifications.sql`** (بلا تراجع فقط لأنها إضافة: جدولٌ بنطاق منصة · RLS مُفعَّل **ومفروض** · سياسة `app.is_platform_admin` · فهرسٌ فريد جزئيّ على `lower(email) WHERE verified_at IS NULL` فلا تسجيلان معلَّقان لعنوان واحد · منح `NOBYPASSRLS`). **والواجهة تفصل الرسم عن القواعد**: `apps/marketing/lib/signup.ts` يحمل الخطوات ودوالّ شروط الانتقال النقيّة وترجمة رموز أخطاء الـAPI وعدّاد إعادة الإرسال وتذكرة لوحة الترحيب، ويستورد ثوابته من `@erp/contracts` نفسه (أُضيف الاعتماد إلى `apps/marketing`) فلا تفترق الواجهة عن الخدمة في عدد أرقام الرمز ولا في سقف المحاولات — والاختبار `tests/signup.spec.ts` **12** يثبّتها ويقيسها بلا متصفّح. **وأخطاءٌ حقيقية أُصلحت (خمسة، اثنان منها التقطهما الاختبار الجديد)**: (أ) **`pnpm db:roles` كان يسقط** بـ`syntax error at or near "$1"`: `ALTER ROLE … PASSWORD $1` جملةُ تعريفٍ لا تقبل معاملاتٍ مُعاملة ⇒ `quoteLiteral` بمضاعفة الفاصلة المفردة، ويعمل الآن للدورين؛ (ب) `setupTasks` كان يسأل `branches.status` والعمود في المستودع `is_active` + حذفٌ ناعم ⇒ **500 في `GET /signup/status`**؛ (ج) `tx.execute` الخام يُعيد `timestamptz` **نصّاً** لا `Date` ⇒ `toInstant` صريحة بدل «تسامح V8»؛ (د) فحص الباقة المعروضة كان يجري **بعد** إنشاء المنشأة فيُخلّف ملفّاً يتيماً وطلبَ تفعيلٍ معلَّقاً من معرّفٍ أُرسل خطأً ⇒ نُقل قبل الإنشاء، والاختبار يقيس «أثر الصفر» على ثلاث جداول؛ (هـ) **عدّادات مثبَّتة** تحرّكت بزيادة مفتاحٍ إعدادٍ وحدثِ بريد كلاهما مقصود (31→32 و18→19) ⇒ حُدِّثت في اختبارين وسكربتين بتعليقٍ يشرح الزيادة. **الأرقام**: api **1229** في **143** ملفاً (كان 1213/142؛ `signup-flow.spec.ts` **16**: رمز خاطئ · قفل المحاولات وإعادة الإرسال تُفتح به · رمزٌ منتهٍ · مهلة 429 · سقف الإرسالات · 404 للسرد · idempotent · 409 للبريد المشغول · بياناتٌ ضعيفة وباقةٌ غير معروضة بلا أثر · الباقات = صفحة الأسعار · مهامّ مُقاسة · دخول المدير وعزل RLS) · contracts **169**/19 (حُدِّث عدّاد أحداث البريد إلى 19) · marketing **41** في **5** ملفات (‏`tests/signup.spec.ts` **12**) · platform-admin **24** · staff **37** · OAS **570 مساراً / 744 عملية** (كان 567/741) · tsc×4/eslint×6/بناء packages + api + **marketing الإنتاجي** (`/onboarding` 56.3 kB) كلها **Exit 0** · `scripts/verify-signup.mjs` (جديد) **54/54 في 5 أقسام** (ثلاثة تشغيلات) ومعه على الخادم نفسه: `verify-pricing` **53/53** · `verify-marketing-site` **37/37** · `verify-content` **62/62** · `verify-platform-console` **225/225** · `verify-weekly-report` **35/35**. **مؤجَّلٌ صراحةً**: SMTP حقيقي (البيئة على `console`) · SSO/SAML و2FA في المعالج · صفحة شروطٍ مستقلة للمعالج · الوجه الإنجليزي للمعالج (مع `/en/*` في P-M10) · P-M6 … P-M10 · بنود مصر وإلغاء/رفض الفاتورة (قرارٌ سابق). `docs/MARKETING_SIGNUP_P_M4_IMPLEMENTATION_REPORT.md`. |
| P-M6 (الموقع التسويقي) | 2026-09-19 | COMPLETE | الجزء السادس من خطة الموقع التسويقي (`docs/roadmap/MARKETING_SITE_PLAN.md` §5): **التقاط العملاء المتوقّعين وإدارتهم** — «لا يضيع زائرٌ مهتم، ولا يُكتب طلبٌ على ورق». **القرار الحاكم: العميل المتوقَّع ليس مستأجراً** — لا صفَّ في `tenants` ولا عضويّةَ مستخدمٍ حتى **تحويلٍ صريح** يُنشئ المنشأة والمدير والفرع ودليل الحسابات (`provisionOrgDefaults`) وترخيصاً `trialing` مدّته من `billing.trial_days` ويُغلق الطلب `won` بأثرٍ في الطلب وفي سجلّ المنصّة معاً، ومرّتان ⇒ `409 LEAD_ALREADY_CONVERTED`، **ولا تحويل بلا باقة مُعلنة** (422 **قبل** أي كتابة — بدل منشأةٍ نصفَ محوَّلة). **الموقع**: `/contact` صارت استمارةً حقيقية سبعةَ حقول، و**`/demo` مساراً جديداً** (كان زرّاً يشير إلى `/contact`) موسوماً `demo` في الطابور، ونشرةً بريدية في تذييل كل صفحة **بلغتين** (`newsletterCopy` ar/en — لأن التذييل يظهر في `/` و`/en`، بينما `/contact` و`/demo` مساران عربيان تُنجَز ترجمتهما في P-M10). **الحمايات الثلاث ظاهرة في الكود لا مخفيّة**: مصيدة `website` **صامتة** (202 بلا صفٍّ ولا بريد — إعلامُ الآلة أنها كُشِفت دعوةٌ لتجربةٍ أخرى، والحقل مكتوبٌ في العقد صراحةً لأن حقلًا لا يظهر في التعريف لا يُراجَع) · محدّد معدّل على دلو `public-form` لكل IP (`RATE_LIMIT_PUBLIC_FORM_PER_MINUTE=10`) · وتأكيدٌ **مزدوج** للنشرة (رابط برمز ٢٤ بايت يُخزَّن sha256 وحده ولا يُعاد في أي استجابة، والتأكيد idempotent، والمجهول 404 بنصٍّ واحد). **والطلب الثاني من العنوان نفسه لا يُنشئ صفّاً**: `leads.dedupe_key` (البريد المطبَّع) بفهرسٍ فريد، ورسالتُه تُلحَق **ملاحظةً** على الطلب القائم مع أثر `lead.duplicated` — فلا يتّصل مندوبان بالشخص نفسه، وجواب الزائر يعيد مرجعَه القديم بلا كشفٍ للتكرار. **والحالات النهائية لا تعود**: `leadTransitions` في العقد، والانتقال غير المسموح `422 LEAD_STATUS_LOCKED`، و`reason` يُسجَّل نصًّا في الأثر، ولا مسار `DELETE` في النظام كلّه. **سبعة مسارات لوحة وثلاثة عامّة**، برمزَي `console.leads.view` (القراءة) و`console.leads.manage` (الإسناد والحالة والملاحظات و**التحويل**) — والتحويل قرارُ فوترةٍ فلا يُمنح للتشغيل ولا للدعم. **وثلاثة أخطاء حقيقية أُصلحت**: (أ) **`defaultPlanId` كان يسأل `is_active`/`deleted_at` في `billing_plans`** (الصواب `active = true`) ⇒ **كل تحويل كان 500**، وكشفه **السكربت الحيّ** لا اختبارُ الوحدة (كان يمرّر `planId` صراحةً فيسلك فرعاً آخر) — وهذا ما يُطلب من `verify-*.mjs`؛ (ب) التحويل بلا باقة كان ينشئ منشأةً بترخيصٍ فارغ (`subscriptionId = ''`) ⇒ صار 422 قبل أي كتابة؛ (ج) `subscriber.confirm` بلا `name` أسقط عدّاد العقد «كل حدثٍ يخاطب إنساناً باسمه» ⇒ أُضيف وتُصيَّر بـ`toName`. **الترحيل `0080_leads.sql`** لا `0075` (الرقم شُغِل بـ`content` في P-M5) — أربعة جداول بـENABLE+FORCE RLS وسياسةِ منصّة (طلبات زوّارٍ مجهولين لا سياسةَ مستأجرٍ تُناسبها) ومنحِ SELECT/INSERT/UPDATE **بلا DELETE** — ومعها `0081_leads_permissions.sql` للرمزين. **الأرقام**: api **1245** في **144** ملفاً (كان 1229/143؛ `public-leads.spec.ts` **16** للأدنى المطلوب 12) · contracts **178**/20 (كان 169/19؛ `leads.spec.ts` **9**) · marketing **51** في **6** ملفات (كانت 41/5؛ `tests/leads.spec.ts` **10**) · platform-admin **24** · staff **37** · OAS **579 مساراً / 754 عملية** · ترحيلات **82** · أحداث البريد **21** وبذورها **42** · صفحات اللوحة **33** (كانت 32) · `eslint` على المستودع كلّه **نظيف** (بعد إصلاح اسم `total` المحروس في قائمة النشرة وسطر استيرادٍ ناقص) · بناء packages+api+marketing+platform-admin **Exit 0** (`/leads` 5.26 kB) · `tsc -p tsconfig.base.json` **284 ← 274** سطراً (أُعلِن `platformRoles`/`kind` في `ActorOptions` فسقط 10 أسطر بلا تغيير سلوك؛ ولا خطأ من ملفات P-M6). **وسكربتات التحقّق أُعيد تشغيلها كلها**: **`scripts/verify-leads.mjs` (جديد) 58/58 في 6 أقسام** · `verify-platform-console` **225/225** (بعد تحديث عدّادات رموز الأدوار: المالك 23←25 وسجل اللوحة 23←25 والمدقّق 6←7) · `verify-marketing-site` 37/37 · `verify-content` 62/62 · `verify-pricing` 53/53 · `verify-signup` 54/54 · `verify-weekly-report` 35/35. **مؤجَّلٌ صراحةً**: نقل محدّد المعدّل إلى Redis وتوحيد الدلو (`INCOMPLETE_INVENTORY.md` §5) · الحملات البريدية (P-M7) · ترجمة `/contact` و`/demo` مع `/en/*` (P-M10) · إشعارٌ فوريّ عند وصول طلب · SMTP حقيقي (البيئة على `console`) · بنود مصر وإلغاء/رفض الفاتورة (قرارٌ سابق). `docs/MARKETING_LEADS_P_M6_IMPLEMENTATION_REPORT.md`. |
| P-M7 (الموقع التسويقي) | 2026-09-19 | COMPLETE | الجزء السابع من خطة الموقع التسويقي (`docs/roadmap/MARKETING_SITE_PLAN.md` §5): **الحملات البريدية وإلغاء الاشتراك** — «رعاية من وصل حتى يشترك». **ثلاثة قرارات في البنية**: (١) **الحملة ثلاثة جداول لا عدّادات** — `email_campaigns` (النصّ والقرار) · `campaign_messages` (صفٌّ لكل مستلم برمزه وروابطه) · `campaign_events` (فتحٌ ونقرٌ وإلغاءٌ وفشل)، والتقرير يُقرأ من الصفوف لا من عدّادٍ في الذاكرة. (٢) **الرمز سِرّ مُجزَّأ** — ٣٢ بايت base64url لكل رسالة، والمخزَّن `sha256` وحده، فلا يُشتقّ ولا يُخمَّن ولا يُعاد في أي استجابة. (٣) **لا تحويل مفتوح** — وجهة النقرة تُقرأ من صفّ الرسالة بترتيبها (`:index`) لا من معاملٍ في الرابط، فنقرةٌ إلى وجهةٍ ليست في الحملة **404**. **والإلغاء حجرٌ عامّ**: يُكتب في `email_suppressions` بـ`tenant_id NULL` فيسري على كل بريدٍ لاحق لا على الحملة وحدها، ويُفرَّغ `confirmed_at` مع الحالة احتراماً لقيد `email_subscribers_confirmed_check`، والفتحة الثانية تقول «من قبل» بلا تغيير (idempotent)، ويُقبَل الإلغاء بـ`GET` **و**`POST` (النقرة الواحدة RFC 8058). **والقالب ظرفٌ لا محتوى**: حدثُ البريد **22** `campaign.message` بمتغيّراته الثلاثة (`subject` · `body` · `unsubscribe_url`) **بلا `name`** لأن التحية في متن المشغّل — ولو أضافها الظرف لظهرت مرّتين. **والشرائح ستٌّ** (أُضيفت `subscribers` إلى الخمس المطلوبة لأن مشترك النشرة المؤكَّد ليس متوقَّعاً)، أعدادُها من الجداول لحظتها، وتصنيفها معلَن (`leads`/`subscribers` أشخاصٌ بموافقة، والباقي حساباتٌ مُتعاقدة)، ومن خرج من الشريحة بين دفعتين لا يُرسل إليه، ومن خرج منها قبل الإرسال يُسجَّل «لم تُرسل» بسببٍ مكتوب. **و«أرسل الآن»** (`scheduledAt: null`) يقع في الطلب نفسه بلا انتظار عامل، والجدولة المستقبلية مهمّة `campaign.send` في طابور `maintenance` مع نبضة مسحٍ عند قراءة القائمة فتعمل بلا Redis، وحملةٌ إلى صفرٍ **422 `CAMPAIGN_SEGMENT_EMPTY`** لا «أُرسلت إلى ٠»، والمرسلة لا تُعدَّل ولا تُلغى (`CAMPAIGN_LOCKED`)، ورسالة الاختبار بلا رمزٍ مسجَّل فلا تُلوّث التقرير. **والمسارات ١١ و١٤ عملية**: ٨ مسارات لوحة برمزٍ واحد **`console.campaigns.manage`** (من يقرأ الحملات يقرأ قائمةَ أشخاصٍ حقيقيين بعناوينهم وتقارير فتحهم — فلا رمزَ قراءةٍ بلا قرار إرسال) و٣ عامّة (بكسل الفتح GIF 1×1 · النقرة 302 · الإلغاء)، بدلو `campaign-track` (`RATE_LIMIT_CAMPAIGN_TRACK_PER_MINUTE=120`). **والواجهات**: `/campaigns` في لوحة المنصّة (٧٥٠ سطراً: إنشاء · تعديل · جدولة · إرسال الآن · نسخة اختبار · إلغاء بسبب · دفعة استئناف · تقرير) و`/unsubscribe` في الموقع (صفحةٌ خادمية بلا JavaScript تقرأ مسار الـAPI نفسه، بأربع حالات، وبـ`noindex` وخارج خريطة الموقع لأنها صفحةُ إجراءٍ لا صفحةُ محتوى). **وأخطاءٌ أُصلحت كشفها الاختبار (لا المراجعة)**: (أ) **مُصيِّر الرسالة كان يستبدل المتغيّرات قبل لفّ الروابط** فصار `{{unsubscribe_url}}` «رابطاً عارياً» يزحفه لافُّ الروابط إلى **أوّل رابطٍ في الحملة** — أي طريقُ الخروج يعمل ويُوجَّه إلى مكانٍ آخر؛ صار الترتيب: لفُّ الروابط ثم الاستبدال (وحرسٌ مُختبَر)؛ (ب) تعريف `campaignMessageFooter` بمعاملين ونداؤه بمعامل (`TS2554`)؛ (ج) 500 عند الإلغاء من قيد القاعدة (`confirmed_at`)؛ (د) `CAMPAIGN_SEGMENT_EMPTY` في اختبار الإلغاء ⇒ درسٌ مسجَّل: من يُخرج آخر عضوٍ من شريحةٍ في اختبارٍ يُبذر عضواً بديلاً؛ (هـ) قالبٌ قديم في `email_templates` (الزرع **INSERT-only** فلا يُحدِّث نصّاً سبق) أسماه حرسُ المتغيّرات في `send-test` — فأُصلح الصفّان وسُجِّل الدرس. **الأرقام**: api **1264** في **145** ملفاً (كان 1245/144؛ `platform-campaigns.spec.ts` **19** للأدنى 12) · contracts **196**/21 (كان 178/20؛ `campaigns.spec.ts` **18**) · marketing **57** في **7** ملفات (كانت 51/6؛ `unsubscribe.spec.ts` **6**) · platform-admin **24** · staff **37** · OAS **590 مساراً / 768 عملية** (كان 579/754) · ترحيلات **83** · أحداث البريد **22** وبذورها **44** · صفحات اللوحة **34** · رموز اللوحة **26** · `eslint` على الملفات الملموسة **نظيف** (٨ مخالفات أُصلحت) · بناء packages+api+marketing+platform-admin **Exit 0** (`/campaigns` 6.0 kB · `/unsubscribe` 163 B). **وسكربتات التحقّق**: **`scripts/verify-campaigns.mjs` (جديد) 59/59 في 7 أقسام** (ولا بريد يخرج من المساحة: `provider = console` والعناوين `.example.test`) · `verify-platform-console` **225/225** (عدّادات الرموز 25→**26**) · `verify-leads` **58/58** · `verify-marketing-site` **37/37** · `verify-weekly-report` **35/35** · `verify-platform-email` و`verify-platform-announcements` خضراوان. **مؤجَّلٌ صراحةً**: SMTP حقيقي · عامل طابور مستقلّ (النبضة تكفي اليوم) · نقل محدّد المعدّل إلى Redis (`INCOMPLETE_INVENTORY.md` §5) · الشرائح المركّبة وشروط الاستهداف · P-M8 · P-M9 · P-M10 (ومنها `/en/pricing` وترجمة `/contact` و`/demo`) · بنود مصر وإلغاء/رفض الفاتورة (قرارٌ سابق). `docs/MARKETING_CAMPAIGNS_P_M7_IMPLEMENTATION_REPORT.md`. |
| P-M8 (الموقع التسويقي) | 2026-09-19 | COMPLETE | الجزء الثامن من خطة الموقع التسويقي (`docs/roadmap/MARKETING_SITE_PLAN.md` §5): **التحقّق والثقة والقطاعات** — `/verify` بمدخلين (حِمل QR أو رقم الفاتورة) ونتيجةٍ بسبعة حقولٍ مُسمّاة من `ZATCA_FIELD_LABELS` المشتركة مع الخادم وثماني شاراتِ فحص، **والفكّ في المتصفّح افتراضياً** فلا تُرسل بيانات الفاتورة لخادمٍ إن لم يطلب المستخدم · `/trust` بأربعة محاور و**١٢ بنداً** لكل بندٍ `source` يشير إلى ملفٍّ وسطر في المستودع (سبيكٌ يتحقّق أن الملف موجود) · `/industries` بخمسة قطاعات و**٢٩ شاشة** حرفية من `apps/staff/lib/navigation.ts` بسطرها · `POST /public/verify` اختياريّ بمدخلين لا ثالث. **الأرقام**: `public-verify.spec.ts` **8** (≥6) · `zatca-qr.spec.ts` **12** · `platform/verify.spec.ts` **5** · `scripts/verify-public-verify.mjs` (جديد) **75/75 في 7 أقسام**. **مؤجَّلٌ صراحةً**: `/en/*` وبقية الترجمات · `/public/faq` · `/public/tests`. `docs/MARKETING_VERIFY_TRUST_P_M8_IMPLEMENTATION_REPORT.md`. |
| P-M9 (الموقع التسويقي) | 2026-09-19 | COMPLETE | الجزء التاسع: **مركز المساعدة وحالة الخدمة** — `/help` (فئاتٌ وعدّاداتُها من نظام المحتوى لا من قائمةٍ مكتوبة، والبحث في الرابط فيقبل المشاركة) · `/help/[slug]` («هل أفادك هذا؟» بعدّادَي صوت) · `/changelog` **من نظام المحتوى** (نوعٌ سابع `changelog`) لا من `docs/change-log` · `/status` يقرأ **مجسّات المنصّة نفسها** (`PlatformOperationsService.health()`/`incident()`) ويعرض المكوّنات الخمسة ولافتة الحادث. **أربعة مسارات عامّة**: `GET /public/help` · `GET /public/help/:slug` · `POST /public/help/:slug/feedback` (الكتابة الوحيدة — صوتٌ واحد لكل متصفّح) · `GET /public/status`. **ترحيل `0083`**: توسيع `content_pages_kind_check` بـ`changelog` + جدول `content_feedback` (فهرسٌ فريد `(page_id, visitor)`، بلا `UPDATE`/`DELETE`). **الأرقام**: `public-help.spec.ts` **7** · `platform/status.spec.ts` **7** · `apps/marketing/tests/help.spec.ts` **11** · `scripts/verify-help.mjs` (جديد) **68/68 في 7 أقسام**. `docs/MARKETING_HELP_STATUS_P_M9_IMPLEMENTATION_REPORT.md`. |
| P-M10 (الموقع التسويقي) | 2026-09-19 | COMPLETE | الجزء العاشر والأخير في خطّة الموقع التسويقي (`docs/roadmap/MARKETING_SITE_PLAN.md` §5): **القياس والتحسين** — «أن يُقاس أثر الموقع لا أن يُخمَّن». **خمسة قرارات حاكمة**: (١) **لا طرف ثالث** — الأحداث تُجمع في قاعدتنا عبر `POST /public/events` (جدول `site_events`) لا في خدمةٍ مستضافة، والتحقّق الحيّ يقيس أن حزمة الموقع تحمل `public/events` ولا تحمل وسم طرفٍ ثالث؛ (٢) **لا ما يُعرّف الناس — بالبنية لا بالوعد**: لا عمود لعنوان IP ولا بريد ولا وسيط ولا بصمة (السكربت يعدّ أعمدة الجدول بالإصبع)، والـ`visitor` معرّفٌ عشوائيّ من `crypto.randomUUID`، والحدث `.strict()` فمفتاحٌ خارج العقد يُردّ 400، و**صفر صفوف تدقيق** (استثناءٌ صريح في `audit.interceptor.ts`) — لأن صفّ التدقيق يحمل عنوان الزائر فيحوّل «عدد زيارة» إلى «سجلّ زائر»؛ (٣) **التجميع في القراءة لا في الكتابة**: صفٌّ لكل حدث ودفعةٌ من ١ إلى ٢٠ حدثاً في النداء (`SITE_EVENTS_MAX_BATCH`)، لأن العدّاد المجمَّع يفقد تمييز الزائر — والقمع يُقاس ب**الزوّار** لا بالنقرات؛ (٤) **الموافقة قبل القياس**: لافتةٌ لا تحجب شيئاً (`ConsentBanner` بعد القشرة) و`DNT` يُلغي ولو وُجدت موافقة، وزرُّ تغيير القرار في التذييل (`ConsentStatusLine`)، ولا حدثَ قبل `accepted`؛ (٥) **اختبار أ/ب من نظام المحتوى لا من جدولٍ موازٍ**: `content_pages.variant_of` + `variant_key ∈ {a,b}` (+ فهرسٌ فريد يمنع نسختين بحرفٍ واحد) ودعوةُ النسخة كتلة `cta` داخلها، **والتوزيع في متصفّح الزائر** بدالّة العقد `pickContentVariant` (FNV-1a حتميّة) فلا يُرسل المعرّف ليُختار له ولا يعرف الخادم من رأى ماذا. **وما لم يكن في الخطّة وأُضيف**: سياسةُ احتفاظ ١٨٠ يوماً **تُنفَّذ فعلاً** بعلامةٍ مائية في `platform_settings` (`site.events.pruned_at` · مرّةً كل يوم داخل معاملة الكتابة)، وبطاقةُ خصوصية تُعلن «ما يُجمع/ما لا يُجمع» و«مدة الاحتفاظ» من العقد إلى اللوحة، وجدولُ تعريفاتٍ لكل رقم (قاعدة P-C12 نفسها). **وما رُفض**: رمزُ صلاحيةٍ جديد (الشاشة تُقرأ بـ`console.analytics.view` القائم — تفريقٌ لا يخدم أحداً)، وإرجاع الصفوف المكتوبة من النقطة العامة (`202` و`accepted` فقط)، وتخزين IP «منقوصاً أو مشفَّراً»، و`UPDATE` على `site_events` (الحدث خبرٌ وقع لا مسوّدة). **وأخطاءٌ حقيقية أُصلحت وكشفها التحقّق الحيّ لا المراجعة**: (أ) **`UPDATE` كان ممنوحاً فعلاً** لـ`erp_api` على `site_events` — `ALTER DEFAULT PRIVILEGES` في 0000 يمنحه لكل جدولٍ جديد ⇒ أُضيف `REVOKE UPDATE` إلى الترحيل؛ (ب) **مفاتيح ميزانية الأداء لم تكن تطابق شيئاً**: `app-build-manifest.json` يسرد `/pricing/page` و`/page`، وملفُ الميزانية كُتب بـ`/pricing` فقِيس كلُّ مسارٍ بسقف «الافتراضي» وظنّنا أننا نقيس ⇒ دالّة `routeFromManifestKey` (بسبيكٍ لها) وإعادة كتابة `perf-budget.json` بمسارات الزائر؛ (ج) `.js` في استيرادات تطبيق Next لا يُحلّ (‏`Module not found` و500 في الرئيسية) — التطبيق بلا امتداد والسبيكات بـ`.js`؛ (د) `siteAnalyticsQuerySchema` (كائنٌ كامل) على `@Query('days')` يعطي 400 على كل طلبٍ سليم ⇒ فصلُ `siteAnalyticsDaysSchema` حقلًا؛ (هـ) **العدّ المطلق في سكربت التحقّق** كان `>= 8` فمرّ على قاعدةٍ فيها بقايا تشغيلاتٍ سابقة وسقط (٧ مقابل ٨) على قاعدةٍ أُنشئت من الصفر بعد تصفير البيئة ⇒ كلُّ العدّادات صارت بالفرق بين قراءتين؛ (و) اختبار الميزانية كان يحكم على مخرج `next dev` (‏`/layout` = 10325 ك.ب) ⇒ شرط «بناء إنتاجي» = `app-build-manifest.json` **و** `BUILD_ID` معاً، وفي CI يفشل بدل أن يُتخطّى. **الأرقام**: api **1287** في **148** ملفاً (كان 1279/147؛ `public-analytics.spec.ts` **8**) · contracts **232**/25 (كان 220/24؛ `site-analytics.spec.ts` **12**) · marketing **99** في **11** ملفاً (كانت 82/9؛ `analytics.spec.ts` **12** · `perf.spec.ts` **5**) · platform-admin **24** · staff **37** · **`eslint` نظيف** · بناء packages + api + contracts + marketing + platform-admin **Exit 0** (`/analytics/site` 4.65 kB) · **OAS 596 مساراً / 774 عملية** (كان 594/772) · ترحيلات **85** (`0084_site_analytics.sql`) · **ميزانية الأداء: ٤٠ مساراً · صفر تجاوز** (الأسوأ `/onboarding` 584.2 ك.ب / 650 = ٩٠٪) · `scripts/verify-site-analytics.mjs` (جديد) **67/67 في 8 أقسام** (تشغيلان متعاقبان) · `tsc -p tsconfig.base.json` **279 ← 283** (أربعةٌ جديدة: TS2835 دَين الامتدادات في `lib/analytics.ts` و`lib/track.ts`، واثنان أُصلحا: نوع `CryptoLike` البنيويّ و`BrowserGlobals` بدل `any` ضمنيّ). **مؤجَّلٌ صراحةً**: حاوية تحليلات في `docker-compose` (الوعد مُحقَّقٌ بنقطةٍ في APIنا بلا خدمةٍ إضافية) · `/en/*` وبقية الترجمات · `/public/faq` · `/public/tests` · نقل محدّد المعدّل إلى Redis وتوحيد الدلو (`INCOMPLETE_INVENTORY.md` §5) · إشعارٌ فوري عند وصول طلب · أفواج الإيراد · Excel/PDF · sandbox · SMTP حقيقي · بنود مصر · إلغاء/رفض الفاتورة · SSO/SAML + 2FA. `docs/MARKETING_ANALYTICS_P_M10_IMPLEMENTATION_REPORT.md`. |
| R1 (سدّ فجوة المنهج — المرحلة 01) | 2026-09-19 | COMPLETE | مطابقة شاشتي المستخدمين والصلاحيات على الديسكتوب (`docs/roadmap/AUDIT_PHASES_01_04.md` §6): **«تجاوز الخصم الافتراضي» صار رمزاً** — `ckDiscount` (`frmUsersPermissions.xaml:262`) ↔ `sales.discount.override` (`permissions.ts:207`)، وحامله يتخطّى حدّ عضويته (`apps/api/src/common/discount-limit.ts`)؛ **وحدّ الخصم حدُّ عضويةٍ لا جدولٌ موازٍ** — العمودان `max_discount_pct`/`max_discount_amount` على `memberships` (ترحيل `0085`، والمطبَّق **86**) بديلاً عن `OperMaxDiscount`، بدقّة `numeric(7,4)`/`numeric(20,4)` وبفرقٍ مقصود بين `null` (بلا حدّ) و`0` (يمنع)؛ والفحص **يجمع خصم السطور وخصم الرأس** ويقع في الخادم (`createInTx` في `sales.service.ts`) لا في الشاشة، ويردّ `DISCOUNT_LIMIT_EXCEEDED` **422** بحدّه المُخترَق (`percent` مقابل `amount`) في `errors[0]`. **والتسميات الحرفية** على `/settings/users` و`/settings/roles` بأرقام أسطرها، ووثيقة §R1 في `docs/desktop-parity/PHASE_01_USERS_NAV.md` (المصادر · جدول النموذج × الأفعال الخمسة · OperNo 1..20 ← الرموز · «ما اخترعناه» · المؤجَّل). **الأرقام**: `identity-rbac.spec.ts` **18/18** · `scripts/verify-identity-rbac.mjs` (جديد) **78/78 في 9 أقسام** (تشغيلان متعاقبان) · contracts **232** · api **1305** · staff **37** · ترحيلات **86**. **مؤجَّلٌ صراحةً**: رموز تجاوز الأسعار (R3/R4 · `pos.priceoverride` معلَنٌ غير مستعمل) · «الاطلاع على التكلفة» · «تعديل التاريخ في الفواتير» · شاشات `Class/List*.cs`. |
| R2 (سدّ فجوة المنهج — المرحلة 02) | 2026-09-20 | COMPLETE | مطابقة **نافذة فاتورة البيع** على الديسكتوب (`docs/roadmap/AUDIT_PHASES_01_04.md` §6): **§R2** في `docs/desktop-parity/PHASE_02_SALES_ENGINE.md` بجدول مصادر بأسطرها (`frmInvSale.xaml` 1273 · `frmInvSale.xaml.cs` 3875 · `InvoiceOper.cs` 5519: `SaveInvoice`@1310 · `SendZatca`@2209 · `BindToEntry`@2252 · `DeleteInvoice`@4419 · `ItemOper.CalcTotal`@1533) و**جدول تسمياتٍ حرفيّ بـ25 نصّاً** مطبَّقاً على `sales/invoices/new` و`sales/invoices/[id]` («🧾 فاتورة مبيعات»@347 · «💳 طريقة الدفع:»@414 «آجلة/نقدية/بنك»@418–420 · «👤 العميل:»@459 · «🏪 المستودع:»@482 · «🏛️ البنك:»@488 · «👨‍💼 المندوب:»@521 · «📱 الجوال:»@546 ·أعمدة البنود@695–831 · «📊 المجموع:/🔻 الخصم:/💵 الإجمالي:/🧾 الضريبة:/✅ الصافي:»@942–967 · «💚 المدفوع:/🔴 المتبقي:»@1011–1023 · «💰 تسديد»@1197 · «🖨️ طباعة»@1254 · «💾🖨️ حفظ + طباعة»@1257 · «🗑️ حذف»@1260 ⇒ «🗑️ إلغاء الفاتورة» · «💾 حفظ»@1263)، **ومعانيها من `frmInvSale.xaml.cs` L1420–1432** (الإجمالي = الصافي قبل الضريبة والصافي = معها — وهو ترتيب `net`/`total` في السحابة). **حارسا سلسلة المستندات** (البند المعلَن في §2B): `SALES_VOID_HAS_RETURNS` **409** على إلغاء فاتورةٍ عليها مستندٌ مشتقّ **مُرحَّل** يسرد الحاجز (`errors[0].references`) · و`SALES_REFERENCE_VOIDED` **409** على ترحيل مستندٍ مشتقّ فاتورتُه ملغاة — **قبل أي كتابة**؛ والمرتجع المسودّة أثرُه صفر فلا يحجب (والشرط `eq(status,'posted')` لا `ne('voided')`). **والتحقّق الحيّ**: `scripts/verify-sales-engine.mjs` (جديد) **40/40 في 9 أقسام** — يعيد أرقام §2F بضغطة: `2×500 − 20 @15%` ⇒ **980/147/1127** · القيد الخماسي `Dr 12310001 1127 · Cr 4100001 1000 · Dr 4100003 20 · Cr 2222001 147 · Dr 3200004 80 · Cr 1270001 80` · المخزون 50⇒48 بتكلفة سطر `80.0000` · التوزيع النسبي 490/1470 + 73.5/220.5 ⇒ 2254 · تحصيلٌ بنكيّ 115 بدفعةٍ حقيقية · مرتجعٌ بتكلفة الفاتورة الأصلية والإرجاع الزائد `SALES_RETURN_QUANTITY_EXCEEDED` · وإعادة الترحيل **idempotent** (نفس الرقم بلا قيدٍ ثانٍ — ليست رفضاً). **الأرقام**: api **1307**/149 (كان 1305؛ `sales-posting.spec.ts` **10/10** بسبيكين جديدين) · contracts **232** · staff **37** · database **17** · `tsc` للـapi والـstaff ✓ · eslint **0** · بناءا api+staff ✓. **مؤجَّلٌ صراحةً**: «📝 البيان» و«📦 الباركود» و«📊 مركز التكلفة» و«🔢 التسلسلي» (لا حقول لها في `SalesInvoiceInput`) · زرُّ «🔄 مرتجع» في الشاشة (المسار مختبرٌ في السكربت) · نسبة خصم الرأس · «📋 عرض سعر»/«👁️ معاينة»/«🖨️ طباعة 2»/«🧾 سند قبض» · R3 (فاتورة الشراء: `frmInvPurch.xaml`/`frmPurchInv.xaml`) وR4 (نقطة البيع). |
| R3 (سدّ فجوة المنهج — المرحلة 03) | 2026-09-20 | COMPLETE | مطابقة **نافذة فاتورة المشتريات** على الديسكتوب (`docs/roadmap/AUDIT_PHASES_01_04.md` §6): **§R3** في `docs/desktop-parity/PHASE_03_PURCHASE_ENGINE.md` بجدول مصادر بأسطرها (`frmInvPurch.xaml` 1454 — النافذة المرجعية: `Title`@7 · «💳 طريقة الدفع»@330 · «🏦 الصندوق»@340 · «🔢 الرقم»@366 · «👤 اسم المورد»@383 · «🏪 المستودع»@414 · «🏦 البنك»@424 · «📅 التاريخ»@434 · «📊 مركز التكلفة»@467 · «💰 الرصيد»@489 · «🕐 وقت الفاتورة»@503 · «📝 البيان»@524 · «📋 المرجع»@545 · «📦 الباركود»@592 · «بدون ضريبة»@617 · «📋 بنود الفاتورة»@665 · الأعمدة@732–867 · الملخّص@920–1026 · الإجماليات@1056–1101 · الأزرار@1396–1437 · وتبويب «🔍 البحث»@1122؛ و`frmInvPurch.xaml.cs` 2879 — «آجلة/نقدية/بنك»@191–193 ورسائل التحقّق@1200–1275؛ و`frmPurchInv.xaml` 1418 النسخة المبسّطة؛ و`ItemOper.CalcTotal`@1533 · `AvgCost`@162 · `ItemAdditonalCos`@2086) و**جدول تسمياتٍ حرفيّ مطبَّق** على `purchases/invoices/new` و`purchases/invoices/[id]` («فاتورة المشتريات»@7 · «📋 المرجع»@545 · «👤 اسم المورد»@383 · «🏪 المستودع»@414 · «💳 طريقة الدفع»@330 بخياراتها الثلاثة · «🏦 الصندوق»@340/«🏦 البنك»@424 · «🔢 الرقم»@366 · «📅 التاريخ»@434 · «🕐 وقت الفاتورة»@503 · «📋 بنود الفاتورة»@665 · «🔍 الصنف/الكمية/السعر/المجموع/الخصم/الإجمالي/الضريبة/الصافي»@746–847 · «📊 عدد البنود/📦 إجمالي الكمية/🏷️ خصم الفاتورة»@920–936 · «🖨️💾 حفظ مع طباعة»@1424 · «💾 حفظ»@1428 · «🖨️ طباعة»@1411 · «🗑️ حذف»@1406 ⇒ «🗑️ إلغاء الفاتورة»)، ومعانيها من `ItemOper.CalcTotal` (`ItemSumPrice`/`lineTotal`/`ItemNetPrice` = `gross`/`net`/`total`). **حارسا سلسلة المستندات** (متابعة §3D): `PURCHASE_VOID_HAS_RETURNS` **409** على إلغاء فاتورةٍ عليها مستندٌ مشتقّ **مُرحَّل** يسرد الحاجز (`errors[0].references`) · و`PURCHASE_REFERENCE_VOIDED` **409** على ترحيل مستندٍ مشتقّ فاتورتُه ملغاة **قبل المعاملة**؛ و**الدفعات تُقرأ**: `GET /purchase-invoices/:id` يعيد `payments` بترتيب `allocatedAt` وتُعرض في الشاشة. **وعيبٌ حقيقي أصلحه السكربت**: عكس الإدخال كان يصرف بمتوسط اليوم لا بسعر الإدخال فتعلَق قيمةٌ في المخزون بعد إلغاء فاتورة شراء (2821.7489 بدل 1920) — أُضيف تقييم `outAtOriginalCost` في `inventory.service.ts` ورُبط `nextValue` بالتكلفة المكتوبة في الحركة، فرجع الرصيد **48 @40.0000 = 1919.9999** (فارق تدوير 0.0001 معلَن). **التحقّق الحيّ**: `scripts/verify-purchase-engine.mjs` (جديد) **41/41 في 10 أقسام**، تشغيلان متعاقبان بلا تنظيف — يعيد أرقام §3D: `PI-` بإجمالي **1227.0000** وقيدٌ متوازن (`Dr 1270001 1100 · Dr 2222001 147 · Cr 3200003 20 · Cr 22111001 1227`) وسطرٌ بتكلفة وحدة **108.0000** · المتوسط 48@40 + 10@108 ⇒ **58 @51.7241 = 3000** · المردود `PR-` ⇒ 56 والقيد `Dr 22111001 230 · Cr 1270001 103.4483 · Cr 2222001 30 · Cr 3200004 96.5517` · فاتورةٌ نقدية ⇒ **1150.0000** مدفوعةٌ بصفّ دفعة · والرفض: بلا مستودع 422 · مدفوعة 409 · تكلفةٌ بلا حساب 422 · وإعادة الترحيل idempotent. **الأرقام**: api **1310**/149 (كان 1307؛ `purchase-posting.spec.ts` **11/11** بثلاث سبيكات) · contracts **232** · staff **37** · database **17** · `tsc` للـapi والـstaff ✓ · eslint **0** · بناءا api+staff ✓. **مؤجَّلٌ صراحةً**: «📝 البيان» · «📦 الباركود» · «📊 مركز التكلفة» (رأساً؛ مدعومٌ على صفوف المصاريف) · `تاريخ الإنتهاء` · «بدون ضريبة» كخانةٍ عامّة (بديلها مجموعة ضريبية بنسبة صفر) · «📝 سند قبض» · «👁️ معاينة» · «📥 استيراد» · «⚡ اختصار فاتورة» · «📒 عرض القيد» · فلاتر تبويب «🔍 البحث» · لوحة الملخّص (الكمية الحالية · التعادل · كمية و/س · آخر شراء/بيع/المتوسط/المنافس · باركود الصنف) — وR4 (نقطة البيع) هو التالي. |
| R4 (سدّ فجوة المنهج — المرحلة 04) | 2026-09-20 | COMPLETE | **إكمال نقطة البيع** (`docs/roadmap/AUDIT_PHASES_01_04.md` §6 R4 ← **§R4** في `docs/desktop-parity/PHASE_04_POS_SHIFTS.md`): **١) الفواتير المعلّقة** بخاناتها التسع — `HoldList = new int[9]` (`frmPOS.xaml.cs:179`) وتسعة أزرار (`frmPOS.xaml:1135–1169`) وزرّ «⏸️ تعليق  F7» (:1175) واختصار F7 (:311) و«لقد وصلت للحد الاقصي من عمليات الايقاف المؤقت» (:1932) و«يوجد أصناف في الجدول» (:1952) — بجدول `pos_holds` (ترحيل **0087**: `slot 0..8`، فهرسٌ فريد (مستأجر·فرع·مستخدم·خانة)، `cart jsonb`، RLS) وأربعة مسارات `GET/POST /pos/holds` · `POST /pos/holds/:id/recall|release` برمزَي `POS_HOLD_LIMIT_REACHED` 422 و`POS_HOLD_NOT_FOUND` 404 — **والسلة تُخزَّن لا فاتورة**: الترقيم عند الترحيل، فتعليقٌ لا يحجز رقماً. **٢) تعدّد طرق الدفع** («🔀 متعدد» `frmPOSPay.xaml:286`): `payments[]` في `POST /pos/checkout` ⇒ `PostingInput.settlements[]` ⇒ **رجلُ مدينٍ لكل طريقة** وصَفُّ `invoice_payments` لكل طريقة، والباقي على ذمّة العميل (`partial`)، والزيادة رفضٌ بفرقها (`POS_TENDER_MISMATCH` 422، ومعه «⚖️ F6 مطابقة» `:548` في الشاشة). **٣) تجاوز السعر**: `pos.priceoverride` (`permissions.ts:261` — كان مُعلَناً بلا قارئ) صار مفروضاً ⇒ `POS_PRICE_OVERRIDE_FORBIDDEN` 403 بنصّ «لا يمكن تعديل السعر» (`frmPOS.xaml.cs:1377`، والحارس `Class/User.cs:24`). **٤) `sales_invoices.cashier_id`** (FK `users` `SET NULL` + فهرس) بجانب `created_by`. **٥) إعدادات الكاشير**: ستّة مفاتيح `pos.*` بترويسات `frmCasherSetting.xaml` الحرفية (:239/:252/:265/:271/:279/:287) تُقرأ بـ`GET /pos/settings` بصلاحية `pos.view` وتُكتب من `/settings/general`، و`pos.requireShift` سُجِّل. **٦) «قيد الإغلاق»** في `/sales/shifts` (`BindCloseShiftToEntry` L402 · `frmCloseShift.xaml.cs:1822`). **تصحيحان للوسم**: «8 خانات» خطأ (الكود تسعة) و`frmShortCutInv` «حاسبة الفاتورة» (`:6`) لا أصنافاً مختصرة — والباقي مؤجَّلٌ مُسمّى. **فجوةٌ حقيقية كُشفت وأُصلحت**: خدمات الأفواج تقرأ `pack.<name>` وهو مفتاحٌ ليس في سجلّ `@erp/config` ⇒ `PUT /settings/pack.pos` يردّ 400 ولا سبيل لإطفاء فوجٍ من الواجهة، والبوابة تمرّ لغياب الصفّ — صُحّح في `pos` (`feature.pos` قارئاً + `pack.pos` توافقاً). **وأصلحتُ تعليق الـAPI**: `GET /shift-closes/current?branch_id=<غير معرّف>` كان 500 وصار فراغاً. **الأرقام**: api **1314**/149 (كان 1310؛ `pos-checkout.spec.ts` **12/12** بأربع سبيكات) · contracts **232** · staff **37** · database **17** · config **10** · `scripts/verify-pos.mjs` **19 فحصاً** (كان 12) تشغيلان متعاقبان · tsc/eslint/بناءا (api · staff · packages) ✓ · ترحيلات **87**. |
| R5 (نصف الدفعة على سطر المستند — المرحلة 05) | 2026-09-20 | COMPLETE | **الدفعة على سطر المستند** — النصف الثاني من البند الذي سمّاه `docs/roadmap/INCOMPLETE_INVENTORY.md` §7-3 و`docs/desktop-parity/PHASE_05_INVENTORY.md` §13 مؤجَّلاً بعد أن سُلِّم نصفه الأول (الرقم التسلسلي) في §12: `BatchNo` · `ItemProductionDate` · `ItemExpireDate` (`Class/InvoiceOper.cs:1635`، وقواعدُه في L1586–L1590 وL4395–L4410) — **§R5** في `PHASE_05_INVENTORY.md` بجدول مصادر بأسطرها (`frmInvSale.xaml:876` · `frmInvPurch.xaml:868` · `frmInvInputOutput.xaml:912` · `frmInventoryTransfer.xaml:888` · `frmItemSerialNo.xaml:434–460` · تقرير «صلاحية الصنف») و**جدول تسمياتٍ حرفيّ** (`📁 رقم الدفعة` · `📅 تاريخ الإنتاج` · `⏳ تاريخ الانتهاء`). **المحرّك**: `resolveUploadedLots` في `apps/api/src/modules/inventory/inventory.service.ts` — الرقم على السطر **يبحث عن الدفعة أو يُنشئها** بتواريخ السطر على (مستأجر · صنف · رقم)، والتواريخ الفارغة تُملأ ولا تُمحى، والمخالفة تُرفض **`LOT_EXPIRY_MISMATCH` 409** (باسم الدفعة والتاريخين و`recorded`/`given` في `errors[0]`)، وصنفٌ `trackLot=false` مع حقول دفعة ⇒ **`LOT_NOT_TRACKED` 422**، و`lotId` صريح يُفحَص على الصنف والمستأجر (`404 LOT_NOT_FOUND`)؛ ويُستدعى **قبل** `assertStockable` فسطرٌ يذكر رقماً يستوفي `INVENTORY_LOT_REQUIRED` كما يستوفيه اختيارُ دفعة. **المخطط والترحيل**: `item_lots.production_date` + ٩ أعمدة على جداول السطور الثلاثة + فهارس (ترحيل **0088**، المطبَّق **88**) — ومع **عيبٍ حقيقي أُصلح**: شاشة `/inventory/lots` كانت تكتب `receivedAt` تحت وسم «📅 تاريخ الإنتاج»، فصار للتاريخ معنيان؛ والترحيل ينسخ `received_at ⇒ production_date` مرّةً واحدة (`IS NULL`) والاستلام يبقى مكانه. **الشاشات**: ثلاث خانات على كل سطر في `/inventory/vouchers` · `/inventory/adjustments` · `/inventory/transfers` (كتابةٌ حرة + `datalist` للدفعات المسجَّلة) وعمود الدفعة على بطاقة المستند المرحّل، وحقلُ استلامٍ صار اسمه «📥 تاريخ الاستلام» في `/inventory/lots`. **الأرقام**: api **150 ملفاً / 1322 اختباراً** (كان 149/1314؛ `inventory-batch-line.spec.ts` **8/8** جديد) · contracts **232** · staff **37** · database **17** · config **10** · `scripts/verify-inventory.mjs` **16 قسماً / 106 فحوص** (كان 98)، تشغيلان متعاقبان `exit=0` · بناء `apps/staff` **130/130** · tsc/eslint ✓ · ترحيلات **88**. **مؤجَّلٌ صراحةً كما هو**: المستندات الخمسة (بيع/شراء/مردوداهما/عرض السعر) لا تكتب أرقاماً ولا دفعات على سطورها · قوائم أسعار واعية بالوحدات · ومعالج UUID العام (500⇒400) هو المرشّح التالي. |
| R6 (معالج المعرّفات العامة — 500 ⇒ 400) | 2026-09-21 | COMPLETE | **معرّفٌ لا صيغة له كان يبلغ القاعدة فيردّ 500** (ديون `docs/roadmap/INCOMPLETE_INVENTORY.md` §5 و§7-1): **طبقتان** — (١) `apps/api/src/common/pipes/uuid-param.pipe.ts` (جديد) مسجَّلٌ `APP_PIPE` عالمياً في `app.module.ts`: يفحص **كل** معاملٍ في الرابط اسمه `id` أو ينتهي `Id` (**306** موضع `@Param` في الـAPI) ويرفض قبل لمس القاعدة بـ`DomainError(INVALID_ID, 400, { field })`، ويستثني صراحةً `EXTERNAL_ID_PARAMS = { remoteId, storeId }` (معرّفات سلة ليست UUID) ويمرّر غير النصوص؛ (٢) `isPostgresUuidSyntaxError` خرجت من `all-exceptions.filter.ts` لتغطّي **معرّفات الجسم والاستعلام** التي لا يراها حارس المسار: تمشي سلسلة `cause` حتى 8 مستويات وتلتقط `code 22P02` + `invalid input syntax for type uuid` ⇒ 400 `INVALID_ID` بلا تسريب `params` (والدليل على لزومها: بإعادة الفلتر مؤقتاً عاد `inventory/levels?warehouse_id=xyz` و`POST inventory/vouchers {branchId:'xyz'}` إلى 500). **الرمز** `INVALID_ID` **400** في `packages/contracts/src/errors.ts` — بديلٌ مقصود عن `VALIDATION_FAILED` («معرّفٌ خاطئ» ≠ «حقلٌ ناقص») والردّ يحمل اسم المعامل في `errors[0].field`. **وعيبان من العائلة نفسها كشفهما الاختبار التكاملي والمسح الحيّ فأُغلقا معه**: `GET /api/v1/accounts/{uuid}` كان **500** (`readAccount` يرمي `Error` عادياً) و`GET /api/v1/parties/{uuid}` كان **200 بجسمٍ فارغ** — والثاني أسوأ لأن العميل يقرأ «نجاح» بلا كيان؛ فصار للغياب رمزٌ معلَن (`ACCOUNT_NOT_FOUND` 404 · `PARTY_NOT_FOUND` 404) وحارسٌ في `parties.service.ts` `get()` يسري على `PUT`/`DELETE`/`balance`/`statement`/`contacts` (كانت تكتب صفرَ صفوف ثم تُبلّغ النجاح). **الاختبار**: `apps/api/test/api-identifiers.spec.ts` (جديد) **7/7** — 21 مساراً × أربعة أفعال وستّ وحدات · مساران بمعرّفَين · UUID صالح مجهول ⇒ 404 مُعلَن · جسمٌ واستعلام · سلبيات (`settings`/`report`/`barcode`/`sku` تُمرَّر) · ومسارٌ سليم ⇒ 200؛ وسبيك الأنبوب **5/5** وسبيك الفلتر **8/8** (drizzle-wrapped `22P02` بلا تسريب `select`/uuid/`22P02`). **ثلاثة اختبارات قديمة كانت تُثبّت العطل فحُدِّثت**: `parties.spec.ts` (عميلٌ محذوف وعميلُ مستأجرٍ آخر كانا `{}`) و`treasury-dayclose.spec.ts` (`shift-closes/not-a-uuid` كان 404 مكذوبة ⇒ 400 `INVALID_ID`، ومعرّفٌ صحيحٌ مجهول يبقى 404 `SHIFT_NOT_FOUND`). **الأرقام**: api **152 ملفاً / 1336 اختباراً** (كان 150/1322) · contracts **232** (25 ملفاً) · `tsc` للـapi ✓ · eslint **0** · بناء الـapi ✓ · `pnpm --dir packages/contracts build` ✓ · ترحيلات **88** (بلا ترحيلٍ جديد). **مؤجَّلٌ صراحةً**: قوائم الكيانات التابعة (progress-bills · measurements · vehicles · issues · print-section) تردّ 2xx فارغةً لوالدٍ مجهولٍ — سلوك مجموعةٍ يحتاج قراراً منتجياً لا إصلاحَ صيغة. |
| R7 (مدير الملفات في staff) | 2026-09-21 | COMPLETE | **الشاشة الغائبة الوحيدة في `apps/staff` التي خلفيّتها جاهزة** (`docs/roadmap/INCOMPLETE_INVENTORY.md` §7-1 المرشّح الأول، و§4.1: «إدارة الملفات | ✅ الخلفية | **لا يوجد مدير ملفات**») — ونُفِّذت في §5-ب من الجرد بالتفصيل. **القرار الحاكم: الحذف فعلٌ له صلاحيته** — سطح المكتب يعرض المرفقات ويحذفها (`frmshowdocument.xaml`)، فالشاشة تعرض وتنزّل **وتمحو**: `DELETE /files/{id}` جديد بصلاحية **`tenant.file.manage`** مستقلة عن `tenant.file.upload` (مَن يرفع مرفقاً ليست له بالضرورة أن يحذف مرفق غيره)، وهو **ناعمٌ في القاعدة قاطعٌ في التخزين**: وسم `status='deleted'`+`deleted_at` فيبقى أثرُ مَن حذف ومتى وتُقرأ الميتاداتا للتدقيق، ثم طلبُ إسقاط الكائن **بعد التزام المعاملة** (الترتيب المُعلَن في `collectOrphans`: انقطاعُ التخزين لا يُعيد ملفاً محذوفاً إلى الوجود)، والردّ يقول الحقيقة في `objectRemoved` («حُذف الملف» ≠ «حُذف الصفّ»). والحذف الثاني — وكذلك المجهول والمستأجر الآخر — **404** بلا تمييز (`loadOwned` يُسقط `deleted_at`): «محذوف» ليس حالةً تُقرأ. والتدقيق **سطران** لكل حذف (سطر المُعترِض ثم سطر الخدمة بفرق `ready→deleted`). **وحالةٌ كانت تُقرأ «عطل الخادم»**: التخزين غير المُهيّأ — وهو تركيبٌ سليم لمن لا يستعمل الملفات — كان `assertObjectStorageEnv` يرمي `Error` عادياً ⇒ **500**؛ صار الرمز المعلَن **`STORAGE_NOT_CONFIGURED` **503** وتفصيله يسمّي متغيّرات `S3_*` **الناقصة** أسماءً بلا قيم، ويُقاس مسار «بلا تهيئة» على المحوّل الحقيقي بمنفذٍ صريح (`new S3ObjectStorage(null)`). **والحارس الموحّد توسّع بدل تشديد الـschemas**: `UuidParamPipe` صار يفهم شكل «كائن المعاملات» في **61** موضعاً ⇒ `INVALID_ID` **400** بدل `VALIDATION_FAILED`. **والشاشة** `/settings/files` (مدخل `file-manager` في `settings-admin`): عنوانها «مدير الملفات» وبطاقتها «📄 الوثائق المرفقة» (`frmshowdocument.xaml:66`) وأعمدتها بحروفها «م» (:99) · «📄 اسم الملف» (:115) · «🗑️ حذف» (:135) ومعه «هل أنت متأكد من الحذف؟» (:93) و«تم الحذف بنجاح» (:110) و«لا يوجد وثائق.» — رفعٌ (presign ⇒ PUT **بلا رمز جلسة** ⇒ finalize) وتنزيلٌ برابطٍ موقّع قصير العمر في تبويبٍ جديد (وإن مُنع عُرض الرابط نصّاً) وحذفٌ بتأكيد، وفلاتر `q` و`filter[status]` و`filter[entity]`، و25 صفاً في الصفحة وثلاثة عدّادات من `meta.total`. **الأرقام**: api **153 ملفاً / 1347 اختباراً** (كان 152/1336؛ `test/files-manager.spec.ts` **10/10**) · contracts **25 ملفاً / 232** · staff **5 ملفات / 38 اختباراً** · `tsc` للـapi والـstaff ✓ · eslint **0** على الملموسة · بناء الـapi والـstaff ✓ (`/settings/files` 8.06 kB) · `scripts/verify-files.mjs` (جديد) **20/20** مع مخزنٍ كائني بديل و**9/9** بلا تخزين · ترحيلات **88** (بلا ترحيلٍ جديد). **مؤجَّلٌ صراحةً**: مرفقات التذاكر · التحكّم في العامل من اللوحة · الرفع من اللوحة (بنود P-C9) · ومحو بايتات الكائن عند **حجر اللوحة** (`/platform/files/{id}` يوسم الميتاداتا فقط) — توحيدُ السلوك قرارُ منتج. |
| R8 (التسلسلي/الدفعة على سطور فواتير البيع والشراء) | 2026-09-21 | COMPLETE | **سدُّ آخر ما بقي من سطر الفاتورة** — البند الأخير من بندَي `docs/desktop-parity/PHASE_05_INVENTORY.md` §13 (الرقم التسلسلي ✅ §12 · الدفعة ✅ §R5): سطور فاتورتَي البيع والشراء **ومردوديهما** تحمل الآن `serial_nos` · `lot_id` · `batch_no` · `production_date` · `expiry_date` (ترحيل **0089**، المطبَّق **89**؛ إضافةٌ فقط بفهرسين للدفعة وفهرسَي GIN للأرقام، وبلا ترحيل بيانات). **المصادر من الديسكتوب بأسطرها**: `Class/InvoiceOper.cs:1635` (كتابة الأرقام الأربعة في `InvoiceItemDetail`) · `:3885` (قراءتها عائدة) · `frmInvSale.xaml:592` خانة الرأس «🔢 التسلسلي:» و`frmInvSale.xaml.cs:3599 ← SearchBySerialNo:722` ورسائلها الثلاث بحروفها (`:733` «تم إدراج هذا الرقم التسلسلي من قبل» · `:769` «تم بيع أو إخراج هذا الرقم التسلسلي» · `:780` «لا يوجد صنف بهذا الرقم التسلسلي») · `frmInvPurch.xaml:714` + `.cs:897` (نافذة الشراء لا خانةَ لها في الرأس، مدخلها قائمة السياق) · `frmItemSerialNo.xaml:434–460`. **المحرّك**: منفذٌ واحد يحسم الأرقام للوجهين — `InventoryService.resolveInvoiceLineNumbers` (يُنشئ في الإدخال · يصرف في البيع · يُعيد في المرتجع · ويُنشئ الدفعة أو يجدها بتواريخها عبر `resolveUploadedLots` نفسه) ثم يكتب كلا المحرّكين النتيجة على أسطرهما، فلا تعرف وحدة المخزون شكل جداول الفواتير. **وفيها «القطعة تعرف عبوّتها»**: سطرٌ كتب أرقاماً بلا دفعة يأخذ دفعة أرقامه إن كانت كلها من عبوّةٍ واحدة فيُقرأ منها تاريخ الانتهاء على فاتورة البيع — **وتعدد العبوات يسكت** فلا تُخترع دفعة. **والترتيب مُعلَن**: حركة المخزون أولاً ثم الأرقام (فسطرٌ لا يكفيه الرصيد ⇒ `STOCK_INSUFFICIENT` قبل فحص العدد)، و**الإلغاء يعكس**: أرقام بيعٍ ملغاة تعود إلى الرفّ وأرقام مردودٍ تعود «مباعة»، ورابط التتبّع يُحذف فلا يبقى سجلٌّ إلى مستندٍ ملغى. **وحرّاسٌ بأسماء معلَنة**: `SERIAL_NOT_FOUND` · `SERIAL_COUNT_MISMATCH` · `SERIAL_NOT_RETURNABLE` · `LOT_NOT_TRACKED` (كلها **422**، في `packages/contracts/src/errors.ts`)، والتكرار على السطر يُزال عند الإدخال لا عند الترحيل. **والجديد في الواجهة**: `GET /inventory/serials/lookup?serialNo=` (صلاحية `inventory.view`) يقول أيُّ صنفٍ وعلى الرفّ أم بيع **وفي أي مستنداتٍ سافر**؛ وخانة «🔢 التسلسلي:» في رأس شاشتَي البيع والشراء (تُقرأ بـ`Enter` كما في النافذة) تُضيف السطرَ بالرقم أو تنطق إحدى رسائل النافذة، وعمودا «📁 رقم الدفعة» و«🔢 التسلسلي» على شبكة السطور وعلى بطاقتَي المستند — بلا شبكةٍ ثانية: المكوّن المشترك `components/invoice-editor.tsx` يعرضهما بـ`withNumbers` فالذي يُقرأ قبل الحفظ هو الذي يُخزَّن. **الاختبار**: `apps/api/test/invoice-line-numbers.spec.ts` **11/11** (إدخالٌ يُنشئ · بيعٌ يصرف ويورّث الدفعة · مرتجعٌ يُعيد · مجهولٌ يُرفض مع بقاء الرقم على الرفّ · الملغى بلا روابط · عزلُ مستأجرين · دفعةُ سطر البيع بتاريخَيها · مردود الشراء) و`apps/staff/tests/serial-numbers.spec.ts` **6/6** (الرسائل الثلاث بحروفها · الفصلُ بفاصلةٍ أو سطر)، والتحقّق الحيّ `scripts/verify-invoice-numbers.mjs` **23/23 في 6 أقسام**. **الأرقام**: api **154 ملفاً / 1358 اختباراً** (كان 153/1347) · contracts **25/232** · staff **6 ملفات / 44** (كان 5/38) · `tsc` للـapi وللـstaff ✓ · eslint **0 على الملموسة** · بناء الـapi والـstaff ✓ · ترحيلات **89**. **مؤجَّلٌ صراحةً**: دلو المعدّل · قوائم أسعار واعية بالوحدات · عرض السعر يخزّن الأرقام ولا يحسمها (لا يحرّك مخزوناً) · بنود المرحلة 05 الباقية كما هي. |
| R9 (مركز التكلفة على فاتورتَي البيع والشراء) | 2026-09-21 | COMPLETE | **البند المؤجَّل من §R2.5 (البند 6) و§R3.5 (البند 4)**، وأثبتَ الفحصُ الحيّ قبل البناء أنه **عيبٌ لا نقصُ ميزة**: `POST /cost-centers` 201 ثم `POST /sales/invoices` بالمركز رأساً وسطراً ⇒ **201 والحقل غائبٌ من الردّ**، وكشف المركز **0 صفوف**؛ و`cost_center_id` كان موجوداً على `journal_entry_lines` و`purchase_invoice_lines` وحدهما (السطر يُخزَّن ولا يُقرأ، والرأس لا عمود له). **المصادر من الديسكتوب بأسطرها**: «📊 مركز التكلفة:» `frmInvSale.xaml:530` (القائمة `cmbCostCenter`) · «📊 مركز التكلفة» `frmInvPurch.xaml:467` (بلا نقطتين) · مركز السطر `Inv_Sub.ItemCostCenter` يُكتب في `Class/InvoiceOper.cs:1635` · وبناء القيد: **مركز السطر يسبق** (`:2432`) ثم **مركز الرأس يورَّث** لسطرٍ صامت (`:2457–2461`، وإن خلا الرأسان فـ`-1`) · والطباعة باسمه لا بمعرّفه `Class/Print.cs:772`. **المحرّك**: ترحيل **0090** (المطبَّق **90**، إضافةٌ فقط بأربعة أعمدة وفهارس جزئية و`COMMENT ON`، وتراجعٌ لا يحذف عمود الشراء السابق) · دالّة واحدة نقيّة `splitByCostCenter` (وزنٌ صفريّ لا يُنشئ رجلاً · **بلا مراكز يعود فارغاً فلا يتغيّر قيدُ فاتورةٍ بلا مراكز بحرف** · **آخر مجموعة تحمل فرق التقريب**) · **الأرجل الموسومة**: الإيراد والمرتجع وتكلفة البيع والمخزون ومخزون الشراء — **ولا تُوسم** الذمة ولا الصندوق/البنك ولا الضريبة (الذمة ليست مركز تكلفة، والضريبة في الديسكتوب بلا `CCcode`) · **والإلغاء يعكس بالأبعاد كلها**: مسار `void` في المحرّكَين كان يبني المرآة بلا `costCenterId`/`salesmanId`/`branchId`/العملة والمعدّل ⇒ فاتورةٌ ملغاة يبقى مالُها في 🌳 شجرة المراكز وفي تقرير المندوبين — وهو عيب `reverseJournal` نفسه الذي أُصلح في `0047` وبقي هنا (أُصلح في المسارين) · **والحارس** `assertCostCentersInTx` ⇒ `404 COST_CENTER_NOT_FOUND` لأي مركزٍ مُسمّى لا يخصّ المستأجر، قبل أي كتابة. **والشاشات**: حقل «📊 مركز التكلفة:» في رأس شاشتَي الإنشاء + عمود «📊 مركز التكلفة» على شبكة السطور (الفراغ = **يرث** مركز الرأس) + صفٌّ على بطاقتَي الفاتورة واسمُ مركز السطر على سطرها. **الاختبار**: `apps/api/test/invoice-cost-centers.spec.ts` **7/7** و`apps/staff/tests/invoice-cost-centers.spec.ts` **3/3**، والتحقّق الحيّ `scripts/verify-invoice-cost-centers.mjs` **22/22 في 8 أقسام** (وسكربت R8 ما زال **23/23**). **الأرقام**: api **155 ملفاً / 1365 اختباراً** (كان 154/1358) · contracts **25/232** · staff **7 ملفات / 47** · platform-admin 2/24 · `tsc` للـapi والـstaff ✓ · eslint **0** · بناء الـapi والـstaff ✓ · ترحيلات **90**. **وعيبان قديمان كشفهما الفحص الشامل في البوّابة وأُصلحا**: (١) `report-inventory.spec.ts` كان يثبّت «باقي أشهر = 0» لدفعةٍ تنتهي بعد 10 أيام والتقرير يحسب فروق أشهرٍ تقويمية ⇒ يفشل كلّما وقع الانتهاء في الشهر التالي (وقد وقع) — صار يحسب المتوقّع بالحساب نفسه؛ (٢) `apps/marketing/lib/industries.ts` كان يشير إلى «إعدادات ربط سلة» عند `navigation.ts:1738` وأزاحته R7 إلى **1748** ⇒ `tests/verify.spec.ts` يسقط (ولم تكن سبيكات التسويق في بوّابة R7) — صُحّحت الإشارة، والتسويق **98 ناجحاً (+1 متخطّى) في 11 ملفاً**. **مؤجَّلٌ صراحةً**: مركز التكلفة على تذكرة نقطة البيع · مراكز على بند المصروف بلا حسابٍ (المصاريف تحمل مركزها من قبل). |
| R10 (⏮ ◀ ▶ ⏭ التنقّل بين القيود — المرحلة 07) | 2026-09-21 | COMPLETE | **أول عملٍ فيه كان فحص البند حيّاً لا بنائه**، لأن §10 من `PHASE_07_ACCOUNTING.md` كان يعدّ أربعة بنود ناقصة فوجد الفحص أنّ **ثلاثةً منها قائمةٌ فعلاً**: مطبوعات مراكز التكلفة الثلاثة (`GET /reports/cost-center-balances|cost-center-report|cost-center-statement` **200** و`/reports/print/<key>` يردّ ورقة A4 بـ**8902** و**11485** حرفاً) · طباعة القيد (`/reports/print/journal-entries/:id` **200** بـ**8941** حرفاً) · «نوع القيد» و«من وقت/إلى وقت» و«سنوات سابقة» (لها أعمدة مسار فعلاً) ⇒ **صُحّحت الوثيقة ولم يُبنَ ما هو مبنيّ**؛ والناقص حقاً واحد: `GET /journal-entries/<id>/neighbours` ⇒ **404**، و`/accounting/journal-entries/<id>` في staff ⇒ **404**، ولا زرَّ تنقّلٍ في السجل. **المصادر من الديسكتوب بأسطرها**: الأزرار `FrmNewEntry.xaml:427–431` («✖ خروج» · «⏮ الأول» · «◀ السابق» · «▶ التالي» · «⏭ الأخير») و`FrmNewEntry.xaml.cs:843–861` (الأول `id asc` · الأخير `id desc` · التالي `id > EntryID` · السابق `id < EntryID`) و`GetCondBranch` (`:863`) يقيّدها بالفرع. **المحرّك**: `journalNeighbours` + `journalScope` **مشتركة مع السجل** (لو انفصلت لقفز السهم إلى قيدٍ لا يراه المُدخِل) · المسار بصلاحية `accounting.reports.view` ونطاق `from/to/branchId/fiscalPeriodId/status` · ردّه `{first,previous,next,last,position,total}` كلٌّ صفٌّ مختصر أو `null` · **والترتيب ترتيبُ الإنشاء بمعرّف القيد وحده (UUIDv7 رتيبٌ زمنياً)** — **عيبٌ كشفه الفحص الحيّ**: مقارنة `(created_at,id)` تُرجع «أصغر من نفسه» لأن العمود **ميكروثانية** في القاعدة والدالّة تُقرأ **بالمللي** في JS، فكان «التالي» يردّ **القيد نفسه** و«السابق» يسقط صفاً؛ وقد أُعيد بناء الترتيب على المعرّف فمشى التنقّل **13→14→15→16** بجيران حقيقيّين. **وترتيب السجل** صار كلّيّاً (`date desc, number desc, created_at desc, id desc`) — كان `number` يقبل `NULL` فترتيبُ قيدَي يومٍ واحد يعود إلى القاعدة. **والشاشة**: `/accounting/journal-entries/[id]` جديدة (بطاقة القيد للقراءة: الرأس والسطور والمجموعان والفرق ومتنقّل ⏮ ◀ ▶ ⏭ + 🖨️/👁️/✖) — **🌐 الفرق الجوهريّ عن الديسكتوب بلا تشويه**: النافذة المكتبية تجمع الفعلَ والتصفّح، والسحابة تفصلهما لأن قيداً مرحّلاً **لا يُعدَّل** (عكسُه هو الطريق) فبقي في الشاشة أوجهُ القراءة وأُعلن فيها ذلك؛ و«✖ خروج» عودةٌ إلى السجل بالنطاق نفسه، والطرفُ **يُعطَّل ولا يُخفى** (كما في النافذة)، والنطاق يرافق كلّ سهمٍ في رابطه؛ وقيدٌ خارج النطاق يردّ **`position = 0`** (لا رقمٌ يحسبه ترتيبُ المعرّفات كأنّه من النطاق وليس فيه) فتقول الشاشة «موضع القيد: خارج النطاق المعروض» — مع `total` = عدد قيود النطاق وسهمَين **عاملَين** يدلّان على آخر قيدٍ قبله وأوّل قيدٍ بعده فيه. **و`?auto=1` في `/print/[doc]/[id]`** يجعل «🖨️ طباعة» تطبع فور جهوز الورقة و«👁️ معاينة» تعرضها وحدها. **الاختبار**: `apps/api/test/journal-navigation.spec.ts` **8/8** (كان يسقط في `beforeAll` بـ`422 FISCAL_PERIOD_NOT_FOUND` ومصدره **المستأجر الآخر** لا الفاعل — كان بلا سنّة، فصار يُنشأ له سنته) و`apps/staff/tests/journal-navigation.spec.ts` **6/6**، والتحقّق الحيّ `scripts/verify-journal-navigation.mjs` **76/76 في 7 أقسام** (الأطراف · الجاران · المشي حتى آخر النطاق · تضييق النطاق · قيدٌ يُفتح خارج نطاقه · الحالة · 404/400/401) — **ويُعاد تشغيله فيبقى أخضر**: يختار خمسة أيامٍ بكراً وكل توقّعاته محسوبةٌ من السجل نفسه لا مرقومةٌ بيد (رُئي 76/76 مرّتين على القاعدة نفسها). **وما كشفه التحقّق**: `POST /journal-entries` **يُرحّل دائماً** ولا مسار لإنشاء مسودّة، فحالة `draft` على القيود لا تُبلغها واجهةٌ اليوم (العمود يقبلها، وحرّاس إغلاق الفترة يقرأونها) — والسكربت يُخطّي الدعوى بدل أن يخترع مسودّة. **الأرقام**: api **156 ملفاً / 1373 اختباراً** · contracts **25/232** · staff **8 ملفات / 53** · platform-admin 2/24 · marketing 11/98 · `tsc` ✓ ×2 · eslint **0** · البناء ✓ ×2 · ترحيلات **90** (بلا ترحيل — التنقّل قراءة). **مؤجَّلٌ صراحةً بعد الإغلاق**: `محرر السند:` (اسم مُحرِّر القيد) و`🗑️ حذف` من نافذة القيد · «نوع القيد» و«من وقت/إلى وقت» و«سنوات سابقة» في كشف المركز. |
| R11 (الشاشات الثلاث الأخيرة: أنواع التفصيل · بطاقة بند · مراحل مشروع) | 2026-09-22 | COMPLETE | **البند الأخير في `INCOMPLETE_INVENTORY` §3**: ثلاث شاشاتٍ بحالة `api` — أي خلفيّتها جاهزة ولا سطح لها — تُخدَم اليوم بالسقالة `/s/[...slug]` وحدها. **وأول عملٍ كان فحص المسارات حيّاً**، فكشف ثلاثة عيوب خادم: `GET /projects/stage-templates` ⇒ **400 `INVALID_ID`** (المسار لم يكن معلناً قبل `@Get(':id')`، وNest يطابق بترتيب الإعلان) · `POST /projects` بلا `partyId` ⇒ **500** من قيد `NOT NULL` · `POST /projects/:id/stages` بلا اسم و`POST /projects/:id/boq` بلا رقم ⇒ **500** كذلك. **فأُغلق العيب من الطرفين**: مسارات المشاريع صارت `GET/POST /projects/stage-templates` · `PATCH/DELETE /projects/stages/{id}` · `DELETE` يعيد ترقيم البقايا في معاملةٍ واحدة (تزحيف `+1000000` قبل الكتابة، فلا يصطدم `project_stages_order_key`) · `POST /projects/:id/stages` يضع الجديد في الذيل `max+1` كما في `frmProjectStagesPM.xaml.cs:236` · `PATCH/DELETE /projects/boq/{termId}` (بندٌ سبق فوترته **لا يُحذف** ⇒ 409 `BOQ_TERM_BILLED`) · وحرّاس 422 بنصوص النوافذ: `PROJECT_FIELDS_REQUIRED` · `PROJECT_STAGE_NAME_REQUIRED` · `PROJECT_STAGE_TEMPLATE_REQUIRED` · `BOQ_TERMS_REQUIRED` («من فضلك أدخل رقم البند» · «من فضلك أدخل اسم البند»). **والشاشات الثلاث مساراتٍ حقيقية خارج `/s/`**: `/projects/stages` (لوحتا `frmProjectStagesPM`: «🗂️ المجموعة» + «➕ إضافة حالة» + «⬆️ لأعلى»/«⬇️ لأسفل» + تذييل ✖⏮◀▶⏭🖨️🗑️💾 — والأربعة تنقّلٌ بين **المراحل** كتنقّل النافذة بين السجلات) · `/projects/boq` (بطاقة بند: «🔢 الرقم» · «📝 الاسم» · الكمية وسعر البيع والتكلفة التقديرية والمدة · «المفوتر سابقاً» للقراءة · ✏️/🗑️/💾) · `/tailoring/types` (نوع التفصيل وسعره الافتراضي — **لا نافذة تحريرٍ له في الديسكتوب**، يُقرأ في `frmOrderDetails.xaml.cs:60` ليملأ «نوع التفصيل:» في `frmOrderDetails.xaml:177`). **المصادر بأسطرها**: `Form_WPF/frmTermsPM.xaml` (L6 «بنـــد» · L265 «🔢 الرقم» · L274/276/281 «📑 نوع البند» رئيسي/فرعي · L289 «📝 الاسم:» · L383 «💲 التكلفة» · L416–433 الأزرار) و`.xaml.cs` L244/L249/L270 (الرفض) · `Form_WPF/frmProjectStagesPM.xaml` (L6 · L229 «🗂️ المجموعة:» · L239 «➕ إضافة حالة» · L347/353 «⬆️ لأعلى»/«⬇️ لأسفل» · L497–544 التذييل) و`.xaml.cs` L192/200/212/233/402 · `Form_WPF/frmStagePM.xaml` (L191 «📝 اسم المرحلة» · L206 «🔤 الاسم En:») — وربط القائمة `Home.xaml:580/583` ⇒ `Home.xaml.cs:3731/3750`. **واخترناه**: أنواعُ التفصيل شاشةٌ **مضافة** (الديسكتوب يقرأ الجدول ولا يحرّره) فلا مقابلَ لها هناك؛ و«⬆️ لأعلى/⬇️ لأسفل» صارا `POST /projects/stages/{id}/move` داخل معاملة، وفي الشاشة لا يتحرّك الطرف؛ و«🔤 الاسم En» مؤجَّل (لا عمود `name_en` في `project_stages`). **الاختبار**: `apps/api/test/project-definitions.spec.ts` **9/9** (يشمل تجاوز الشرح: 409 للرمز المكرّر، و404 لمرحلة الغير) و`apps/api/test/tailoring-types.spec.ts` **6/6** · `apps/staff/tests/project-definitions.spec.ts` **10/10** (منطقٌ نقيّ في `lib/project-definitions.ts`) وشجرة الملاحة **22/22** بعد القلب · والتحقّق الحيّ `scripts/verify-project-definitions.mjs` **66/66 في 5 أقسام** ويُعاد تشغيله فيبقى أخضر (كل توقّعيه محسوبةٌ من السجل، ويُنظّف ما أنشأه — وتبقى شاهداً بندٌ مفوتَر وفاتورته). **الأرقام**: api **158 ملفاً / 1388** (كان 156/1373) · contracts **25/232** · staff **9 ملفات / 63** (كان 8/53) · platform-admin 2/24 · marketing 11/98 · `tsc` ✓ ×2 · eslint **0** · البناء ✓ ×2 (staff **134** صفحة، كان 131) · ترحيلات **90** (بلا ترحيل — لا عمود جديد). **وعدّاد الشجرة**: **233** شاشة — **232 `ready` · 0 `api` · 1 `planned`** (يقيسه `screenCounts()` في `tests/navigation.spec.ts`). **مؤجَّلٌ صراحةً بعد الإغلاق**: بنود فرعية `ParentCode` في «بطاقة بند» (يحتاج عموداً في `boq_terms`) · «🔤 الاسم En» لمراحل المشروع (يحتاج `name_en`) · تحرير «🗂️ المجموعة» (إضافة/حذف مرحلة داخل قالب — يحتاج `PATCH` للقالب) · «💵 أقل سعر» و«معفي من الضريبة» في `frmTermsPM` (لا عمودان لهما). |
| R12 (عهدة الإغلاق — قيد الإغلاق يصير ثلاثة أسطر) | 2026-09-22 | COMPLETE | **البند الذي كان مُعلَّقاً صراحةً في وثيقة الخزينة**: «**عهدة الإغلاق (`1211002`) غير منسوخة، قصداً**» (`docs/desktop-parity/PHASE_06_TREASURY.md` §14.2 و§15) — ولم يكن الوحيد: الرصد الحيّ كشف أنّ `postShiftClose` **يرفض ترحيل الدرج المطابق** (`422 SHIFT_BALANCED`) فتُقلّ يدُ الكاشير في الدرج بلا قيد. **والديسكتوب يرحّل ثلاث وقائع في كل إغلاق** (`Class/EntryOper.cs:760–800`: « نقدي في الصندوق {الموظف}» ثمّ كتلة «─── عهدة الإغلاق ───» `Debt = inv.CashierBalance` على `1211002` ثمّ «─── فرق الصندوق ───» `Debt = cashSales - CashierBalance`؛ ومثله `Form_WPF/ClosShiftAndroid.xaml.cs:1550–1650`). **فصار قيدُ الإغلاق في السحابة ثلاثة أسطر**: مدين «عهدة الإغلاق» بالمعدود · دائن الصندوق **بالمتوقّع** (لأن كل فاتورة نقدية مرحَّلة أدانت الصندوق أصلاً، ولو دائنّاه بالمعدود لبقي فرقٌ وهميّ في حسابه) · و± «فرق بالصندوق» `3110004` كما كان. والمطابق **يُرحَّل** (سطران بلا فرق)، والمرفوض صار الدرج الفارغ الذي لا يُنتظر منه شيء. **وحساب العهدة يُحسم بترتيبٍ صريح**: `shift_close.custodyAccountId` في ملف الترحيل ← ثابتُ الديسكتوب `1211002` من الدليل ← **422 `SHIFT_CUSTODY_ACCOUNT_MISSING`** يُسمّي الناقص، ولا يُخترع حساب. **وبيانات السطور عربية بنصّ الديسكتوب**: «عهدة الإغلاق {الموظف}» · «نقدي في الصندوق {الموظف}» · «فرق بالصندوق {الموظف}». **وبلا ترحيل جديد**: العهدة تُكتب على `shift_closes.summary` (دمجُ JSONB بـ`||`)، و`POST …/post` يردّ `custodyAccountId`/`custodyAmount`/`tillAmount`/`differenceAmount`، و`GET /shift-closes/day-closes` يضيف `custodyAccountId`/`custodyAccountCode`/`custodyAccountName`/`custodyAmount` ويصير `postable` صادقاً للدرج المطابق. **والشاشة**: `/treasury/day-close` اكتسب عمود **🧾 العهدة** (كودُ الحساب ومبلغُه للمُرحَّل، `—` لغيره) بلا زرّ جديد. **والعقود**: مفتاح ترحيل جديد **`custodyAccountId`** في `POST_PROFILE_ACCOUNT_KEYS` (المخطط `.strict()`)، وبذرةُ العرض `DEMO_POSTING_PROFILE` أضافت `custodyAccountId: '1211002'` و`cashDifferenceAccountId: '3110004'` — قبله كان إغلاقُ ورديةٍ بفرقٍ في نسخة تجريبية يُرفض لملفٍّ ناقص وهو يملك الحسابين في دليله. **الاختبار**: `apps/api/test/treasury-shift-entry.spec.ts` **14/14** (كان 11): العهدة الناقصة، وملفُّ الترحيل يسبق الثابت، والعجز والزيادة والمطابق والفارغ، وبيانات السطور، وحقول `custody*` في الرأس وفي الشبكة. **والتحقق الحيّ**: `scripts/verify-treasury.mjs` **120 تحققاً بلا فشل** (كان 112: 107 خضراء و5 حمراء — أربعتُها كانت تُثبّت السلوك القديم وواحدةٌ توقّعٌ قديم معطوب)، وعولج فيه عيبان ظهرا حيّاً: فوجُ نقطة البيع مغلقٌ افتراضاً (`feature.pos = false`) فصار السكربت يفتحه بنفسه كما `verify-pos.mjs:87`، و`GET /shift-closes/not-a-uuid` يردّ **400 `INVALID_ID`** لا 404 كما كان يتوقّع. **الأرقام**: api **158 ملفاً / 1391** (كان 1388) · contracts **25/232** · staff **9/63** · platform-admin 2/24 · marketing 11/98 · `tsc` ✓ ×3 · eslint **0** · البناء ✓ (staff **134** صفحة، api ✓) · ترحيلات **90** (بلا ترحيل — لا عمود جديد) · وعدّاد الشاشات **233: 232 `ready` · 0 `api` · 1 `planned`** (لا شاشة جديدة). **مؤجَّلٌ بصراحة (مرشَّح البند التالي)**: قيدُ التحويل بين الخزائن — `POST /cash-transfers/{id}/send|receive` يحرّكان `cash_location_balances` ولا يكتبان قيداً، وعمودا `cash_transfers.sent_journal_entry_id`/`received_journal_entry_id` (الترحيل `0011`) فارغان. |
| R13 (قيود التحويل بين الخزائن — المال في الطريق له حساب) | 2026-09-22 | COMPLETE | **البند الذي كان مُعلَّقاً صراحةً في `PHASE_06_TREASURY.md` §15 و`INCOMPLETE_INVENTORY`**: «قيود التحويل بين الخزائن — `sendTransfer`/`receiveTransfer` يحركان `cash_location_balances` بلا قيد وعمودا `sent/received_journal_entry_id` فارغان». **والديسكتوب لا يحتاج حساباً وسيطاً** لأنه ينقل المال بسندَي صرفٍ وقبض (`frmPaymentVoucher.xaml.cs:559`)، كلٌّ منهما يسمّي الطرف الآخر؛ والسحابة تنقله بوثيقةٍ واحدة بحالتين، فالمال بين الإرسال والاستلام لا يسكن أيّاً من الخزنتين. **فصار للمناقلة حسابٌ يحملها**: `1211003` «نقد تحت التحويل» — امتدادُ السحابة الثاني بعد `1270003` «بضاعة تحت التحويل» (المرحلة 05)، يُزرع تحت `1211` الذي فيه `1211001` و`1211002`. **القيود**: 📤 الإرسال `Dr 1211003 / Cr حساب خزنة المصدر` و📥 الاستلام `Dr حساب خزنة الوصول / Cr 1211003`، كلاهما في معاملةٍ واحدة مع حركة الرصيد وبمفتاحٍ مُعادٍ `cash-transfer:{id}:sent/received`. **حلّ الحساب**: `cash_transfer.cashInTransitAccountId` في ملف الترحيل ← دليل `1211003` ← 422 `CASH_TRANSFER_TRANSIT_ACCOUNT_MISSING`، والخزنة بلا حساب ⇒ 422 `CASH_ACCOUNT_REQUIRED`. **والردّ والشبكة**: `POST …/send` يردّ `sentJournalEntryId` و`cashInTransitAccountId`، و`POST …/receive` يردّ `receivedJournalEntryId`، و`GET /cash-transfers` يعلنهما (`fromName`/`toName` بقيت). **والشاشة**: `/treasury/transfers` اكتسبت عمود **📒 القيد** (📤/📥) ورأس الوثيقة صار يُظهر رقمي القيدين. **والبيانات**: ترحيل `0091_cash_in_transit_account.sql` يُكمل الدليل لمستأجرٍ سُبق تأسيسه (عدّادٌ بلا خزائن لا يحتاجه)، وبذرة العرض صارت **116 حساباً** (كان 115). **والعقود**: مفتاح جديد `cashInTransitAccountId` في `POST_PROFILE_ACCOUNT_KEYS`، و14 رمزاً ناقصاً من وحدة الخزينة أُعلنت (القاعدة: كل رمز DomainError يُعلَن). **الاختبار**: `treasury-transfers.spec.ts` **9/9** مع تأكيد القيود والشبكة، و`organization-provisioning.spec.ts` صُحّح عدّاده 115⇒116. **والتحقق الحيّ**: `verify-treasury.mjs` **130 تحققاً بلا فشل** (كان 120): +10 للقيود (وجود القيدين وسطراهما واتجاههما والشبكة تعلنهما). **الأرقام**: api **158 ملفاً / 1391** (ثابتة) · contracts 25/232 · staff 9/63 · platform-admin 2/24 · marketing 11/98 · `tsc` ✓×3 · eslint 0 · البناء ✓ (staff 134، api ✓) · ترحيلات **91** (واحد جديد `0091`) · الشاشات 233: 232/0/1 (لا شاشة جديدة). |
| R14 (📋 نوع القيد في كشف الحساب وكشف مركز الكلفة) | 2026-09-22 | COMPLETE | **البند المؤجَّل في PHASE_07 §10 وINCOMPLETE_INVENTORY §2 وSTATUS R10**: «📋 نوع القيد في 📊 كشف مركز الكلفة يبقى مؤجَّلاً». **والخادم كان يطبّقه أصلاً** (`statementKindScope` في `accounting.service.ts:322`): `GET /statements/general-ledger/:id?kind=` و`GET /statements/cost-center/:id?kind=` يردّان ما ينتمي إلى النوع وحده، و`رصيد سابق` يُحسب من النوع نفسه (`accounting-statement.spec.ts` «📋 نوع القيد — كل الأنواع تعني الكل»). **فالشاشتان هما ما كان ناقصاً**: `/accounting/ledger` (كشف حساب) و`/accounting/cost-center-statement` (تقرير مركز كلفة) اكتسبتا حقل **📋 نوع القيد** (قائمة الـ13 + «الكل»: قيد افتتاحي · فاتورة مبيعات · نقطة بيع · مرتجع مبيعات · فاتورة مشتريات · مرتجع مشتريات · سند قبض · سند صرف · تسوية جردية · إغلاق اليومية · فاتورة عقد · قيد يدوي · قيد عكسي — وهي نفس الكلمات التي يطبعها عمود «النوع» في الجدول، فلا يفترق اختيار المُشغِّل عن طباعة الكشف). **بلا ترحيل**: الفلتر قراءةٌ محضة. **الأرقام**: api 158/1391 ثابتة · contracts 25/232 · staff 9/63 ثابتة · tsc ✓×3 · eslint 0 · البناء ✓ (staff 134) · ترحيلات 91 (بلا ترحيل). **مؤجَّلٌ صراحةً بعد الإغلاق**: ~~«محرر السند:»~~ ✅ **§R15** و~~«🗑️ حذف» من نافذة القيد~~ ✅ **§R17** · ~~«من وقت/إلى وقت»~~ ✅ **§R16** و«سنوات سابقة» في الكشف. |
| R15 (محرر السند: في سندات القبض والصرف) | 2026-09-22 | COMPLETE | **البند المؤجَّل في PHASE_07 §5.4 وINCOMPLETE_INVENTORY §2**: «محرر السند:» في `frmSandQ`/`frmSandD`. **العمود كان موجوداً بلا قارئ**: `vouchers.createdBy` في `baseAuditColumns` موجود منذ الترحيل، لكن `treasury.service.ts` كان `select().from(vouchers)` بلا join وبلا كتابة — فصار `select({ ...vouchers, createdByName: users.fullName }).leftJoin(users, eq(users.id, vouchers.createdBy))` في `vouchers()` و`getVoucher()`، و`POST /vouchers` يضبط `createdBy/updatedBy = tryGetAuthContext()?.userId`، و`PATCH /vouchers/:id` (مسودّة) يضبط `updatedBy`. **والشاشة `/treasury/vouchers` اكتسبت عمود «محرر السند:»** (`createdByName ?? '—'`) مع إصلاح footer 10→11. **بلا ترحيل**: العمود موجود. **الأرقام**: api 158/1391 ثابتة · contracts 25/232 · staff 9/63 ثابتة · `treasury-vouchers.spec.ts` 7/7 · tsc ✓×3 · eslint 0 · البناء ✓ (staff 134) · `verify-treasury.mjs` 130/0 · ترحيلات 91. **مؤجَّلٌ صراحةً بعد الإغلاق**: ~~«🗑️ حذف» من نافذة القيد~~ ✅ **§R17** · ~~«من وقت/إلى وقت»~~ ✅ **§R16** و«سنوات سابقة» في الكشف. |
| R16 (⏰ من وقت/إلى وقت في كشف الحساب وكشف مركز الكلفة) | 2026-09-23 | COMPLETE | **البند المؤجَّل في PHASE_07 §10 وINCOMPLETE_INVENTORY §2**: «من وقت/إلى وقت» في `frmAccountBalance` و`frmCostCenterBalance` (صندوقا وقت لكل نهاية فترة — `BuildDateTimeFilter` L458-L463). **الخادم كان يطبّقه في كشف الحساب أصلاً** (`at = date + coalesce(entry_time, '00:00')` + `startAt/endAt = date + coalesce(time)` في `accounting.service.ts:98-99/1500-1506` و`from_time/to_time` في `accounting.controller.ts`) لكن الشاشتين بلا حقول (`grep fromTime/toTime` فارغ) و`costCenterStatement` يقطع بالتاريخ وحده. **ما شُحن**: `CostCenterStatementQuery` اكتسب `fromTime/toTime` و`costCenterStatement` صار يبني `at/startAt/endAt` كـ`accountStatement` (`at < startAt` للرصيد السابق) و`GET /statements/cost-center/:id` يقبل `?from_time=&to_time=`؛ والشاشتان `/accounting/ledger` و`/accounting/cost-center-statement` اكتسبتا حقلي وقت (`type=time`) مع `disabled={fullPeriod || !from/to}` و`title` يسمّي السطر و`?from_time=&to_time=` وfooter يطبع الوقت. **بلا ترحيل**: `entry_time` موجود منذ `0046`. **الأرقام**: api build ✓ · staff tsc ✓ · contracts 25/232 ثابتة · staff 9/63 ثابتة · ترحيلات 91. **مؤجَّلٌ صراحةً بعد الإغلاق**: ~~«🗑️ حذف» من نافذة القيد~~ ✅ **§R17** · «سنوات سابقة» في الكشف. |
| R17 (🗑️ حذف من نافذة القيد — السحابة لا تحذف) | 2026-09-23 | COMPLETE | **البند المؤجَّل في PHASE_07 §10 وINCOMPLETE_INVENTORY §2**: «🗑️ حذف» في `FrmNewEntry.xaml` (L450 `btnDelete` → `FrmNewEntry.xaml.cs:645 DeleteEntry()` → `update Entry set IS_Deleted=1 where GlobalId=…` + سجل «تم حذف سند قيد برقم …») وعمود «🗑️ حذف» سطر (L378-397 `BtnDeleteRow_Click` L532) — في الديسكتوب حذفٌ ناعم بعلامة. **في السحابة القيد المرحّل لا يُحذف** — `prevent_posted_journal_mutation` في `0004_accounting.sql` يُصلح بـ`0047` ليُطبّق `void` لكن الحذف ممنوع؛ `POST /journal-entries/:id/reverse` هو الطريق. **ما شُحن**: شاشة `/accounting/journal-entries/[id]` اكتسبت زرّ **🗑️ حذف معطّل** (`disabled` + `title` يسمّي السطر الديسكتوبي `L654` والمسار البديل) + تعليق يسمّي عمود حذف السطر (قبل الحفظ فقط) + قسم **↩️ عكس القيد** (سببٌ إلزامي + `POST /journal-entries/:id/reverse` + رابط القيد العكسي). **بلا ترحيل**: لا مسار حذف جديد. **الأرقام**: staff tsc ✓ · api build ✓ · ترحيلات 91 (بلا ترحيل). **مؤجَّلٌ صراحةً بعد الإغلاق**: ~~«سنوات سابقة» في الكشف~~ ✅ **§R18** (خارج النطاق — قواعد منفصلة لكل سنة في الديسكتوب، والسحابة سنة بفترات). |
| R18 (📚 سنوات سابقة — Year_Previews خارج النطاق) | 2026-09-23 | COMPLETE | **البند المؤجَّل الأخير في PHASE_07 §10 وINCOMPLETE_INVENTORY §2**: «سنوات سابقة» في `frmAccountBalance.xaml:156` و`frmAccountsStatement.xaml:180` + `Year_Previews` جدول يخزن `Dbname/DbAutoName` لقواعد سنوات منفصلة (`frmAccountBalance.xaml.cs:818 SELECT Dbname, DbAutoName FROM Year_Previews` و`frmSettings.xaml:2204` و`.cs:1560/2712`). **في السحابة السنة ليست قاعدة منفصلة**: `fiscal_years` و`fiscal_periods` داخل نفس المستأجر، وكل كشف يُفلتر بـ`from/to` أو `fiscal_period_id` — وهو ما يفعله اختيار قاعدة سنة سابقة في الديسكتوب. **القرار**: خارج النطاق بقرار صريح (كـ🇪🇬 مصر و🚫 إلغاء الفاتورة) — لا جدول جديد ولا مسار. **ما شُحن**: توثيق القرار فقط. **الأرقام**: بلا ترحيل · ترحيلات 91. **مؤجَّلٌ صراحةً بعد الإغلاق**: لا شيء — المرحلة 07 مكتملة 100%. |
| R19 (قوائم أسعار واعية بالوحدات — السعر لكل وحدة) | 2026-09-23 | COMPLETE | **البند المؤجَّل في PHASE_05 §13 وINCOMPLETE_INVENTORY §2**: قوائم أسعار واعية بالوحدات — الديسكتوب `ItemPrices` (`SmartAuditERP/Class/ItemPrices.cs:9-10`) يحمل `UnitID` + `SalePrice`/`WholesalePrice`، و`item_units.sale_price` موجود لكن `price_list_items` كان بلا وحدة. **ما شُحن**: ترحيل `0092_price_list_unit.sql` يضيف `unit_id uuid REFERENCES units_of_measure(id) ON DELETE SET NULL` + يستبدل الفريد القديم `(price_list_id, coalesce(item_id,nil), min_qty)` بجديد يحمل الوحدة `(price_list_id, coalesce(item_id,nil), coalesce(unit_id,nil), min_qty)` + فهرسان؛ المخطط `organization.ts` + العقود `price-lists.ts` (`unitId` nullable) + الخدمة `price-lists.service.ts` (يُفلتر ويُفرّد بالوحدة + `assertUnitUsable` يرفض وحدة غير معرّفة للصنف 422) + الشاشة `/settings/price-lists` (حقل الوحدة + عمود الوحدة + جلب وحدات الصنف) + اختبار `price-lists-unit.spec.ts` 2/2. **الأرقام**: api 159/1393 · ترحيلات 92. **مؤجَّلٌ صراحةً بعد الإغلاق**: لا شيء — المخزون مكتمل. |
| RBAC-REORG | 2026-09-10 | COMPLETE | Surface + RBAC reorganisation on `arena/01a0889e-cloud-saas-erp`: Family-A platform roles (`platform_memberships`, `pam` claim) replacing the blanket `is_platform_admin`; canonical `tenant.*` permissions with legacy `platform.*` aliases; `memberships.kind` (staff/buyer/api); standalone devices registry. Four separately-deployable surfaces on one API/DB: `apps/marketing` (:3002), `apps/staff` (:3001), `apps/platform-admin` (:3003), `apps/customer-portal` (:3004) — all build + tests green (staff 35, marketing 6, platform-admin 3, portal 6). New real screens: platform roles grant/revoke, licence activation requests, tenant audit log, smart login with `?token=` bridge. Docs: `docs/architecture-rbac/01–06`. See final report in PR. |

## Admin web UI — desktop menu coverage (2026-09-08)

`apps/admin/lib/navigation.ts` is the single source of truth for the screen tree that
mirrors the customer's desktop product. `tests/navigation.spec.ts` fails the build if a
menu item claims `ready` without a page file behind it, so these counts are checked, not
asserted by hand.

| State | Count | Meaning |
|---|---|---|
| `ready` | 189 | A real screen reading and writing the live API. |
| `api` | 0 | The endpoint exists; the screen is still the scaffold. |
| `planned` | 1 | Neither screen nor endpoint yet; routed under `/s/…`. |
| **total** | **190** | |

Round 1 wired: expense cards (`/accounting/expenses`), sales credit/debit notes with
posting (`/sales/notes/[kind]`), ZATCA credentials (`/settings/zatca`) and submissions with
retry (`/settings/sync/zatca`), migration runs with issues (`/migration/runs`), offers with
a live evaluator (`/settings/offers`), price lists and their rows (`/settings/price-lists`),
and a Code 128-B barcode label sheet (`/inventory/barcodes`).

Round 2 wired the documents that were missing an entire side of the ledger:

* **Supplier credit/debit notes** — new table `purchase_adjustment_notes` (migration
  `0021`), `POST /purchase-invoices/:id/adjustment-notes`, `GET /purchases/adjustment-notes`
  and `POST /purchases/adjustment-notes/:id/post`, screen `/purchases/notes/[kind]`, report
  key `purchase-notes`. Posting now allocates the number from the document sequence on
  **both** sides (`SCN-`/`SDN-`, `PCN-`/`PDN-`); the sales side previously minted
  `AN-<epoch>-<id>`, which is not an auditable series.
* **Quotations** (`عرض سعر`) — migration `0022` adds `valid_until` and
  `converted_invoice_id` to `sales_invoices`; a quotation is numbered `QT-…` on creation,
  is refused by `POST /sales/invoices/:id/post`, and converts once into a **draft** sales
  invoice that carries the same lines (`/sales/quotations`).
* **Customer payment methods** (`طريقة دفع عميل`) — migration `0023` adds
  `payment_methods` plus `parties.payment_method_id`; the method carries the credit period
  and the cash location, one default per tenant enforced by a partial unique index
  (`/accounting/payment-methods`, also serving the settings menu entry).

The reporting catalog is at **63 keys**; the permission registry at **120** codes.
`apps/api/src/permission-codes.spec.ts` fails the build when a controller asks for a
permission the registry does not define — three such codes existed
(`sales.adjustment.create`, `sales.offer.manage`, and the new
`purchase.adjustment.create`), each of which had made its route answer 403 to every role
including the owner.

Round 3 wired the two warehouse documents that bracket a transfer (migration `0024`):

* **طلب بضاعة** — `goods_requests` + lines. A requisition is numbered `GR-…` on creation
  and moves draft → submitted → approved → fulfilled; approval may **cut the quantities
  down** (a store holding 30 of the 50 asked for approves 30), and fulfilment hands the
  *approved* quantities to a **draft** `stock_transfer`, which remains the only document
  that touches `inventory_transactions`. Approving is a separate permission from raising
  the request, because the branch asking for stock should not be the one releasing it.
  Rejection requires a reason (`/inventory/requests`).
* **توصيل مخزني** — `stock_deliveries` + lines, always against a **posted** sales invoice.
  It deliberately writes no inventory line: posting the invoice is what relieves the
  warehouse in this system, so a second stock issue would double-count every delivered
  unit and drag the average cost down. What it adds is the physical half of the sale —
  who received the goods, on what date, and how much the customer is still owed.
  `GET /inventory/deliveries/outstanding` drives the screen: you pick an invoice that
  still owes goods and the remaining quantities are prefilled. A draft delivery already
  reserves its quantity, and cancelling releases it (`/inventory/deliveries`).

While wiring fulfilment, transfer numbering moved server-side: `POST
/inventory/transfers/draft` now allocates `TR-000001` from the document sequence when the
caller omits a number. The admin screen used to mint `TR-<timestamp>` in the browser,
which is neither gap-free nor collision-proof.

Round 4 wired the marina operations and the project follow-up board (migration `0025`):

* **تحضير المراكب** — `marina_preparations`, one row per booking, holding the
  pre-departure checklist and the return. Life jackets must cover every companion on the
  booking (422 `MARINA_JACKETS_INSUFFICIENT`) because that is the one check a harbour is
  actually inspected on, and a booking cannot be prepared twice.
* **خطة الدور** — the rota already had a writer and no reader, which made the screen
  impossible: you could file a plan and never see it again. `GET /marina/operation-plans`
  now returns plans with their lines, filterable by date.
* **ربط الفواتير** — `GET /marina/bookings/uninvoiced` lists bookings that were never
  invoiced and `POST /marina/rental-invoices/link` issues the rental invoices in bulk,
  reporting per-booking failures instead of aborting the batch on the first one.
* **إغلاق اليومية** — `marina_day_closings` freezes a harbour day per branch. Afterwards
  the service refuses new bookings and new rental invoices dated into that day
  (409 `MARINA_DAY_CLOSED`), which is the entire point of the document: yesterday's cash
  and vessel movements can no longer change under the supervisor. Closing over bookings
  that were never invoiced hides revenue, so it takes an explicit `force`.
* **متابعة المشاريع** — a read-only board over the existing project endpoints: completion
  against the contract value, retention still held, stage accreditation, and per-BOQ-term
  progress. No new tables; the data was already there with nowhere to show it.

Round 5 wired the contracting side of projects (migration `0026`):

* **عقد مقاول** — `contractor_contracts` + `contractor_contract_lines`. The contract value
  is derived from the lines rather than typed on the header, because a header that
  disagrees with its own breakdown is how a subcontractor ends up over-certified. The
  agreed advance lives on the contract (not on a payment) since it is recovered across
  many certificates, so the running `advance_recovered` total is contract state. A
  contract must be activated before any money can be certified against it, and it cannot
  be closed while a certificate is still unpaid.
* **سند دفع لمقاول** — `contractor_payments`. Retention and advance recovery are
  **computed from the contract**, never taken from the request; the form previews them,
  the server decides them. Four kinds behave differently on purpose: an `advance` is a
  prepayment (no retention, does not consume the contract value, capped by the agreed
  advance), `progress`/`final` carry retention and may recover the advance, and
  `retention_release` can never exceed the retention actually held. Cumulative gross on
  the value-consuming kinds is capped at the contract value
  (422 `CONTRACTOR_PAYMENT_EXCEEDS_CONTRACT`), and a cancelled certificate gives its value
  back. Paying issues a **draft** payment voucher through `TreasuryService` and links it
  via `voucher_id`; posting to the ledger stays in treasury, so the money has one door
  into the journal instead of two.
* **عروض المشاريع** — `project_offers` + `project_offer_lines`. Accepting an offer is
  ledger-neutral. Converting one creates the project and copies the offer lines into the
  BOQ, which is the only way the offered numbers and the project's numbers are guaranteed
  to agree; an offer converts exactly once (409 `OFFER_ALREADY_CONVERTED`) and an expired
  offer must be re-issued first.

New permission `projects.contractor.pay` (121 total) gates approving and paying a
certificate; creating one still needs only `projects.manage`, so the person who measures
the work is not necessarily the person who releases the cash. Endpoints live under
`/contracting/*` rather than `/projects/*` because `GET /projects/:id` already owns that
segment.

Round 6 wired the two documents that reverse or transform recorded value (migration
`0027`):

* **مرتجع مقاولات** — `contracting_returns` + lines. A posted progress bill cannot be
  edited: it has already produced a numbered sales invoice and moved every BOQ term's
  billed-to-date figure. The return is therefore its own document, and posting it moves
  **both** halves at once — the BOQ term gives its value back so the work can be
  re-billed, and a **draft** credit note is raised against the bill's invoice for the net
  after the withheld retention is released. Doing one without the other leaves the project
  either double-billed or permanently short of its own contract value. Per term, the
  cumulative return can never exceed what that bill certified (422
  `CONTRACTING_RETURN_EXCEEDS_BILL`), and cancelling a draft return frees its value again.
  Report key `contracting-returns`.
* **أمر الإنتاج** — `production_orders` + `production_order_components`. Components leave
  the warehouse at its moving average and the finished item is valued at exactly the total
  that left, divided by the produced quantity; the order is ledger-neutral by construction
  because inventory value is conserved, so it raises no journal entry. The output item may
  not be one of its own components, a component may not repeat (combine the quantities),
  and completion fails on `STOCK_INSUFFICIENT` rather than driving stock negative. The
  components are **optional**: when none are typed they are read from the item card's bill of
  materials (`item_components`, `GET/POST/DELETE /organization/catalog/items/:id/components`)
  and scaled by the produced quantity, each in the unit the card named — the desktop's
  `Qty = qty × BaseQty × UnitEquality`. An item with no recipe and an order with no typed
  components is refused `PRODUCTION_COMPONENTS_REQUIRED`. A component's unit must be its own
  base unit or one defined on its card, and a recipe may not form a loop
  (`CATALOG_COMPONENT_CYCLE`). The
  `unit_id` (0038) holds the unit the produced quantity was counted in, so `2 علب` of a
  six-piece box puts twelve pieces on the shelf. The
  `line_id` of each stock movement is the item id, so the existing
  `(tenant, doc_type, doc_id, line_id)` unique index enforces one movement per item per
  order. Screen `/inventory/production`, report key `production-orders`.

* **الأرقام التسلسلية والدفعات** — `item_serials` + `item_lots`. A serial is a state machine
  (`available → reserved → sold → available`) driven from `/inventory/serials` the way
  `frmItemSerialNo` drives it: two grids (`📋 الأرقام المتاحة` / `📤 الأرقام المباعة`), a
  generator that makes a batch off one prefix (`POST /inventory/serials/generate`,
  all-or-nothing, `409 SERIAL_DUPLICATE` on a clash), and `DELETE /inventory/serials/:id`
  for a number that never left the shelf — a sold one is refused `422 SERIAL_INVALID_STATE`,
  because deleting it is how a stock count stops adding up. A lot carrying serials answers
  `409 LOT_IN_USE`. Screens `/inventory/serials`, `/inventory/lots`, report keys
  `serial-tracking`, `expiry-report`.
* **الرقم التسلسلي على سطر المستند** (`InvoiceItemDetail.ItemSerialNo`,
  `Class/InvoiceOper.cs:1635`) — migration `0039` puts `serial_nos` on the voucher,
  adjustment and transfer line tables and adds `stock_document_serials`, so a document says
  *which piece* it moved and a number can be traced back to the documents that moved it
  (`GET /inventory/serials/:id/documents`, permission `inventory.view`). The numbers are
  resolved at posting, not at saving: a draft invents no pieces for stock that has not
  arrived, a count that disagrees with the quantity is `422 SERIAL_COUNT_MISMATCH`, a number
  in another warehouse is `422 SERIAL_WRONG_WAREHOUSE`, and selling a number twice is
  `422 SERIAL_INVALID_STATE`. إلغاء is the mirror image and deliberately asymmetric: a
  receipt's numbers are withdrawn only while they are still on the shelf, an issue's numbers
  go back on it. A مناقلة contributes two legs — the send that reserves the piece and the
  receipt that releases it. Screens: the four stock document grids gained a
  `🔢 الأرقام التسلسلية` column and a paste-box with a live count; the serials screen gained
  a `🔍` trace per row.

* **المرحلة 06 — الخزينة، الجزء الأول: سند القبض وسند الصرف** (`frmSandQ` / `frmSandD` /
  `frmSandVAT` / `frmPaymentVoucher`، و`Class/ReceiptOper.cs` L21 `BindReceiptToEntry`).
  Migration `0040` puts the document's context on the row — `description` (📝 البيان، وهو
  نفسه بيان القيد كما في `entry.Note = Receipt.Notes`), `voucher_time` (⏰ الوقت، فكشف
  الصندوق يُرشَّح بالساعة), `salesman_id → employees` (👔 المندوب) و`foreign_amount`
  (💲 قيمة السند بعملتها) — and the engine now builds the entry a voucher writes instead
  of waiting for the caller to supply lines: the cash location's own account against the
  party's receivable/payable account, then the posting profile. Callers who forgot — HRM's
  `payRun` chief among them — used to move cash out of the safe with **no entry at all**.
  A cheque is a promise, not money: `chequesInHandAccountId` (أوراق القبض) holds it until
  clearance, which now posts its own entry (`مدين الصندوق / دائن أوراق القبض`), and a
  bounced cheque puts the debt back on the customer and is terminal
  (`422 CHEQUE_INVALID_STATE`). `PATCH /vouchers/:id` edits a whole draft the way
  `frmSandQ.xaml.cs:903` does and seals a posted one (`409 VOUCHER_IMMUTABLE`);
  `GET /vouchers?from=&to=&q=` is the 🔍 panel of `frmSandQD`/`frmSandSD`. Screen
  `/treasury/vouchers` rebuilt as a document: tabs 📥 سند قبض / 📤 سند صرف, a search panel,
  a document header, `💼 تفاصيل الدفع` with the cheque block behind the bankish methods,
  and a grid with `🔢 الرقم · 📅 التاريخ · ⏰ الوقت · الطرف · 📝 البيان · 🏦 الصندوق ·
  💳 نوع الدفع · 💰 المبلغ · 📋 الحالة`. New profile key `chequesInHandAccountId`. Tests
  `apps/api/test/treasury-vouchers.spec.ts` (7) and `scripts/verify-treasury.mjs`
  (6 sections against the live stack).

* **المرحلة 06 — الخزينة، الجزء الثاني: تعريف الخزن والبنوك** (`frmTreasury.xaml` +
  `.xaml.cs` L87 grid / L222 «يجب اختيار موظف مسئول»، و`frmBanks.xaml`). Migration `0041`
  is additive: `cash_locations.notes` for 📝 ملاحظات, and a real `cash_location_custodians`
  table for the desktop's `Stock_Emps` — one row per (tenant, safe, employee), unique so an
  employee cannot be signed twice onto the same safe, indexed by employee, RLS like the rest.
  The desktop deletes `Stock_Emps` first and inserts after, so a typed typo leaves a safe
  with no custodian on the way to failing; here the employees are validated **before any
  write**, and emptying a safe of its custodians is refused with the same
  «يجب اختيار موظف مسئول» rather than performed. Banks keep the full `frmBanks` card —
  🌍 الدولة، 🏙️ المدينة، 📍 المنطقة، تليفون، موبايل، 💰 نسبة الاقتطاع — carried in the
  `bank` JSON block, so no column touches half a table that is safes. Screens
  `/treasury/safes` and `/treasury/banks` are one component with the desktop's three tabs
  (📋 بيانات · 👤 مسئولي الصندوق · 📝 ملاحظات), and الخزينة became its own `🏦` module in
  the staff navigation as it is in `Desktop_ERP`, taking 📄 سند قبض / 📄 سند صرف /
  📒 بطاقة حساب المصاريف / 📊 إغلاق اليومية home from المحاسبة › العمليات — routes
  untouched, endpoints untouched, duplicates removed. Tests
  `apps/api/test/treasury-custody.spec.ts` (6) and section 7 of
  `scripts/verify-treasury.mjs`. 488 API tests, 36 staff tests, 71 contract tests.

* **المرحلة 06 — الخزينة، الجزء الثالث: حركة الصندوق** (`Form_WPF/frmRptKhzna.xaml` +
  `.xaml.cs` L156–L260، والتقرير `Reports/RptKhzna.repx`). The decisive thing the desktop
  does here is that the statement is read from the **ledger**, not from the receipts: it
  resolves the safe's account and groups `Entry_sub` by entry, so a sale, a salary and a
  transfer are movements of the same safe. The cloud's `cash-movement` report summed
  receipts and payments per box, which silently omitted every movement the treasury screen
  had not created. `GET /cash-locations/:id/movements` now returns the statement:
  `رصيد سابق` opening row (only when a period is chosen, dated `من تاريخ − يوم` as at
  L200), a running `⚖️ الرصيد`, and the two cards `⚖️ الرصيد الإجمالي` /
  `📅 رصيد الفترة المحددة` (L482/L502) — with `من وقت / إلى وقت`, and only posted entries,
  so a draft never moves a safe on paper. No migration: `vouchers.voucher_time` came with
  part one. **One justified deviation:** the desktop's `Entry.date` carries the time, ours
  carries it on the voucher, so a movement with no recorded time is never hidden and never
  pushed into the opening balance — hiding a real entry from a statement is the worse
  error — while timed movements obey the window exactly and the totals stay continuous.
  Screen `/treasury/movements` with the desktop's filter panel, its eight columns, six
  cards and its CSV header verbatim (`م,العملية,الرقم,التاريخ,وارد,صادر,الرصيد,البيان`).
  Tests `apps/api/test/treasury-movements.spec.ts` (6) and section 8 of
  `scripts/verify-treasury.mjs` (13 checks). 494 API tests, 36 staff tests, 71 contract
  tests. The `🏦 حركة الصندوق` screen sits in a new التقارير group of the الخزينة module;
  the desktop files it under المحاسبة › تقارير محاسبية, but a safe's statement belongs
  with the safe now that الخزينة is a module of its own.

* **المرحلة 06 — الخزينة، الجزء الرابع: إغلاقات اليومية** (`Form_WPF/frmCloseShift.xaml`
  + `.xaml.cs` L214/L270/L330/L676/L735، `frmCloseShiftDetails.xaml`،
  `frmCloseShiftInv.xaml`، والمحرك الحقيقي في `Form_WPF/ClosShiftAndroid.xaml.cs`
  L592 وL780–L930). The grid's first column is `🔢 الرقم`, and in the desktop that is
  `CasherClosed.ClosedID` — **a close is a document the cashier signs**, and
  `BindCloseShiftToEntry1` builds a journal entry around it. The cloud created its
  `shift_closes` row when the drawer was *opened* and gave it no number at all, so
  "which close was Tuesday's?" had a uuid for an answer. Migration `0042` adds
  `shift_closes.number` with a partial unique index, **nullable on purpose**: an open
  shift is a draft, and the number is allocated at close from `document_sequences`
  (`CS-`, padding 6) exactly as a voucher is numbered on posting. No renumbering, no
  backfill: old rows keep their emptiness until a new shift is closed.
  `GET /shift-closes/day-closes` (filters `from`/`to`/`branch_id`/`membership_id`/
  `user_id`) is the list; `GET /shift-closes/:id` is one close with its two children —
  🧾 الملاحظات المعدودة and the summary lines — and answers `404 SHIFT_NOT_FOUND` for an
  unknown *or non-uuid* id. Three decisions carry the desktop's intent: **a draft is not
  cash** (📤 المصاريف و💵 النقدي read *posted* vouchers, so an unposted expense never
  shrinks a drawer on paper); **🏦 رصيد الصندوق is what was counted, 💵 النقدي is what
  was expected**, and 📉 الفرق is between them — which is why an open row's safe balance
  is empty rather than wrong; and **a close is a snapshot**, frozen into `summary` so a
  voucher posted afterwards cannot rewrite a signed sheet. 🚗 توصيل · ☕ ضيافة · 🛒
  المشتريات · 🛡️ تأمين come from the *name* of the expense type whose account the voucher
  points at, because the desktop reads columns our invoices do not carry and a tenant that
  names its types in Arabic gets the split for free. Filtering by 👤 الموظف resolves the
  membership to its users, and an id that is nobody's returns an **empty list, not the
  whole book** — a silently dropped filter is worse than a missing one. Screen
  `/treasury/day-close`: six cards, a 🏦 الوردية الحالية card with nine denominations and
  a live 📉 الفرق, a filter panel, and a grid whose eighteen headers are `frmCloseShift`'s
  own labels with a totals footer and an expandable detail per row. Tests
  `apps/api/test/treasury-dayclose.spec.ts` (8) and section 9 of
  `scripts/verify-treasury.mjs` (23 checks, and it closes a drawer left open by an earlier
  run so it stays re-runnable). 502 API tests, 36 staff tests, 71 contract tests.
  **Deferred with a reason:** the close's journal entry (`BindCloseShiftToEntry1`) waits
  for the accounting part of this phase, so entries come from one engine and not two, and
  the printed reports (`Reports/rptCloseShift.repx`, `rptCloseday.repx`,
  `rptClosedayCust.repx`) wait for the reporting phase — `printShiftData` only prepares
  their data.

* **المرحلة 06 — الخزينة، الجزء الخامس: التحويل البنكي والعميل النقدي**
  (`Form_WPF/frmPayBank.xaml` + `.xaml.cs` `LoadBanks`/`BankTile_Click`،
  `Form_WPF/frmCashCustomer.xaml` + `.xaml.cs` `SearchCustomers`، والقاعدة في
  `Class/EntryOper.cs` L493/L537/L620). Two small windows with one idea each.
  **🏦 التحويل البنكي** is a chooser, and its answer decides an *account*: the desktop
  refuses a transfer with no bank («يرجى اختيار بنك أولًا») because `EntryOper.cs` keeps
  a named transfer out of the generic شبكة bucket and, at close, debits **that bank's own
  account** instead of `1221001`. The cloud could already route a transfer to a bank, but
  nothing read the choice back: `shiftTakings` now groups bank payments **per bank**,
  `closeShift` writes one signed `bank-transfer` line per bank, and every day-close row
  carries `banks[]` — live while the drawer is open, frozen in `summary` once it is
  counted. The bank rides in `metadata`, because `party_id` is a foreign key to `parties`
  and a bank is not a party. 🌐 الشبكة still carries the full amount: the breakdown is a
  detail *inside* it, not a subtraction from it, or 💰 مجموع الشبكة والنقدي would stop
  adding up. **👤 العميل النقدي** is the opposite kind of answer: `SearchCustomers` does
  not open a customer table, it reads the invoices — `SELECT CashCustomerName,
  CashCustomerMobile FROM inv WHERE … AND CashCustomerName <> ''` — because a walk-in is
  a name and a mobile **written on the sale**, which is why a till can produce one
  without opening a ledger account. `GET /sales/cash-customers?name=&mobile=` is that
  query: exact on mobile, partial on name, grouped so a name is one answer with an
  invoice count. **No migration — deliberately**: `invoice_payments.cash_location_id`
  and `sales_invoices.cash_customer_name/mobile` already existed; what was missing was
  the rule that reads them, not a column. Screens: a `🏦 اختر البنك` window wired into
  `/sales/pos` (replacing a dropdown a cashier clicks past) and `/treasury/vouchers`, and
  a `👤 عميل نقدي` picker plus its own page `/sales/cash-customers`. Tests
  `apps/api/test/treasury-bank-transfer.spec.ts` (8) and
  `apps/api/test/sales-cash-customer.spec.ts` (7), and section 10 of
  `scripts/verify-treasury.mjs` (12 checks). **517** API tests, 36 staff tests,
  71 contract tests. **One justified deviation:** the desktop's cash-customer grid starts
  empty and fills only on a keystroke; a list screen that opens empty looks broken, so
  with no search term the API returns the most recently served names.

* **المرحلة 06 — الخزينة، الجزء السادس: مناقلة الخزن**
  (`Form_WPF/frmSafesTransfer.xaml` + `.xaml.cs` L690/L863/L872،
  `Reports/rptSafeTransfer.repx`، والجدولان في `CrystalLiteDB.txt` L1620 `SafesTransfer`
  وL1642 `SafesTransfer_Sub`). **The decisive finding came before the code**: the
  desktop's `SafesTransfer` table has **no amount column** — its sub-table carries *items*
  (`ItemId`, `value` = quantity, `AvrgCost`, `ReceivedValue`, `Diff`) and
  `rptSafeTransfer.repx` prints الصنف / الفئة / المستودع / الباركود / الكمية. So
  `frmSafesTransfer` is a **مناقلة أصناف بين المخازن**, and moving *money* between safes
  is done in the desktop with a سند صرف and a سند قبض. The cloud therefore needed both
  halves: a new money screen `/treasury/transfers` on `/cash-transfers` carrying the
  window's own three tabs (📦 التحويل · 📥 استلام تحويل · 🔍 البحث) and its state machine
  (draft → sent → received, with `🗑️ حذف` for drafts only), and the missing 🔍 tab on the
  item screen `/inventory/transfers` (`🔢 رقم التحويل` · `📅 من تاريخ` · `📅 إلى تاريخ` ·
  `📋 كل الفترة` · `🔍 بحث`). `transfers()` now returns `fromName`/`toName` resolved
  server-side by joining `cash_locations` twice under aliases, so the grid never shows a
  raw uuid where the desktop shows a name; `cancelTransfer` writes `voided`, the terminal
  state migration `0011` already allows, rather than inventing `cancelled` and a migration
  to go with it. **No migration — again deliberately.** Screens gated by
  `treasury.view`, actions by `treasury.transfer.manage`; 📦 استلام الكل shows a live
  count of what is on the road. Tests `apps/api/test/treasury-transfers.spec.ts` (9) and
  section 11 of `scripts/verify-treasury.mjs` (19 checks, walking the whole lifecycle
  against the live stack). **526** API tests, 36 staff tests, 71 contract tests.
  **Two justified deviations:** `🏦 من خزنة` / `🏦 إلى خزنة` are the window's
  `🏪 من مخزن` / `🏪 إلى مخزن` with the store replaced by the safe — this module moves
  cash, not stock; and `📋 الحالة` names a column the desktop grid leaves unheaded.

* **المرحلة 06 — الخزينة، الجزء السابع: 📒 قيد الإغلاق** (`Class/EntryOper.cs`
  `BindCloseShiftToEntry` L404–L830، `Form_WPF/ClosShiftAndroid.xaml.cs:925`
  `BindCloseShiftToEntry1`، و`EntryOper.cs` L620 للتحويل البنكي). **The entry was not
  copied, and that is the finding.** The desktop builds one big entry at close — Dr
  treasury, Dr `1221001` شبكة, Dr each named bank's own account, Cr `4100001` sales,
  Cr `2222001` VAT, Dr `1211002` عهدة الإغلاق, and `3110004` فرق بالصندوق for the
  difference — because in the desktop *nothing is posted when an invoice is saved*; the
  close is the whole accounting event. The cloud is the mirror image: every posted
  invoice already wrote its own entry (sales, VAT, discount, and the debit to the till's
  or the **bank's own** account — `pos.service.ts` resolves a named bank cash location's
  `accountId`, which is what `bank.AccCode` is in L620, and a live test asserts the sale
  entry debits the bank and *not* the generic drawer). Copying the desktop's entry would
  therefore post the day twice. What no other document can know is the **count**: the
  drawer was counted by hand and it disagreed with the books, so 📉 الفرق is what the
  close posts — Dr فرق الصندوق / Cr الصندوق for a shortage, mirrored for an overage, and
  **nothing at all** for a balanced drawer (`422 SHIFT_BALANCED`, because a two-line
  zero entry is not evidence). عهدة الإغلاق is deliberately *not* reproduced: it parks
  the counted cash on the cashier's custody account until a deposit clears it, and there
  is no deposit step yet. Migrations `0043` (additive `shift_closes.journal_entry_id` /
  `posted_at`) and `0044`, which fixes a **real bug found on the way**: `0042` made
  `number` unique per *tenant* but allocated it per *branch*, so two branches both
  issued `CS-000001` and the second close died on a duplicate-key 500 — numbering is now
  tenant-wide (as the desktop's global `ClosedID` is) and the migration seeds the
  counter from the highest number each tenant already printed. New
  `POST /shift-closes/:id/post` behind a new permission `treasury.shift.post` (counting
  a drawer and posting its entry are different decisions — the cashier role gets the
  first, not the second), new posting-profile key `cashDifferenceAccountId`, and every
  day-close row now reports `journalEntryId` / `postable`. Screen `/treasury/day-close`
  gained a 📒 القيد column. Tests `apps/api/test/treasury-shift-entry.spec.ts` (11) and
  section 12 of `scripts/verify-treasury.mjs` (12 checks). **537** API tests, 36 staff,
  71 contract. Side effect worth recording: `pnpm -r run lint` was **red** on
  pre-existing `no-restricted-syntax`/`import/order` errors in `sales.service.ts` and
  six test files; it is now green across the repository.

* **المرحلة 07 — المحاسبة، الجزء الثاني: 📄 كشف الحساب**
  (`Form_WPF/frmAccountBalance.xaml` «كشف حساب تفصيلي» و
  `frmAccountsStatement.xaml` «كشف حساب رئيسي»). **The cloud had a ledger, not a
  statement.** `GET /statements/general-ledger/:accountId` answered with bare posted
  lines and no period at all, and the screen filtered by date *after* the fact — so a
  statement for one month started its الرصيد at zero and disagreed with the tree it was
  opened from. What the desktop does is defined in three places: `.xaml.cs` L216 keeps a
  running total signed by the account's nature, L351 prepends a row whose البيان is
  `رصيد مرحل من فترة سابقة` and whose النوع is `رصيد سابق`, and L307 chooses between
  `تجميعي (ملخص)` (one row per entry, `SUM` + `GROUP BY`) and `تفصيلي (كامل)` (every
  line). All three now exist in the service: `from`/`to` bound the period, the opening
  row is everything posted *before* `from` **plus the account's `opening_balance`** — so
  a كشف and a شجرة cannot print different numbers, which is the invariant the tests
  assert directly — and `with_descendants=1` reports the account and its branch by
  walking `path <@ :path::ltree`, the same walk as the desktop's `AccountHierarchy` CTE,
  with `رمز الحساب`/`الحساب` in place of a running balance (the window has no الرصيد
  column either: a running total over accounts of different natures is not readable).
  `النوع` is read from the entry and the voucher behind it and named in the words of the
  desktop's own `EntryTypes` table — قيد مبيعات · سند قبض · سند صرف · إغلاق اليومية ·
  قيد اليومية. The response is `{ data, totals, account }`, so a caller that reads
  `data` — and a request with no parameters at all — still gets exactly the old ledger.
  **One desktop bug is deliberately not copied:** `الحالة` is derived there from the
  nature-signed balance (`runningBalance >= 0 ? "مدين" : "دائن"`), which reports a
  liability sitting on its own credit side as مدين; here الحالة names the side the money
  is actually on. The screen carries the window's own filters —
  `اسم الحساب` · `رقم الحساب` · `الفرع`/`كل الفروع` · `من تاريخ`/`إلى تاريخ` ·
  `🚀 عرض البيانات` · `⚖️ نوع الرصيد` · `📊 طريقة العرض` · `فترة كاملة (من البداية)` ·
  `عدم إظهار الرصيد السابق` — its four totals, and its twelve columns, and it opens with
  the account chosen from 📂 دليل الحسابات' `كشف حساب` button; `تفاصيل` (👁️) opens the
  entry in `القيود اليومية`, which now accepts `?entry=`. Tests
  `apps/api/test/accounting-statement.spec.ts` (12) and sections 6–7 of
  `scripts/verify-accounting.mjs` (18 more live checks, 37 in total). **557** API tests,
  36 staff, 71 contract.

* **المرحلة 07 — المحاسبة، الجزء الأول: 📂 دليل الحسابات**
  (`Form_WPF/frmAccountsDirectory.xaml` — «دليل الحسابات» — مع
  `frmAccountsTree.xaml` بطاقة الحساب و`frmAccountSrch` للبحث). **The gap was not the
  tree, it was the number beside it.** The window binds `trBalance` on every node
  (`.xaml.cs` L149 `LoadTreeView` / `BuildTreeHierarchy` over `trParentCode`), and the
  cloud had no balance at all: `GET /accounts` returned a bare chart, and the tree screen
  showed code, name and type. So the tree and the ledger and the ميزان could each print
  a different figure for the same account. `GET /accounts` now takes
  `q` / `type` / `branch_id` / `with_balances` (all optional, all backwards-compatible —
  without `with_balances` the response is unchanged), and `with_balances=1` adds
  `parentName` and a `balance` object per row: `ownDebit`/`ownCredit`/`ownBalance` for
  the account itself and `debit`/`credit`/`balance`/`descendants` for its whole branch,
  counted **from posted entries only** and rolled up the account's `ltree` `path`, so a
  parent is exactly the sum of its children and the counting happens once, in the
  service, not in three browsers. A reversal therefore disappears from the balance, and
  a draft entry never enters it. Migration `0045` adds the three card fields the window
  writes and the cloud had nowhere to put — `accounts.opened_at`, `opening_balance`
  (default 0, so nothing that exists is affected) and `cost_center_id` — and
  `💰 الرصيد الافتتاحي` is added to the account's own row on its `normalBalance` side and
  rolled up from there, because it is money on the books *before* the first entry. It is
  also frozen: patching `openingBalance` once an account carries a posted line is
  refused with `409 ACCOUNT_POSTED` — an opening balance is set once, not re-written to
  make a period agree. The directory screen is now the window: four summary tiles, the
  search sent to the server behind `🚀 عرض البيانات`, `📂 شجرة الحسابات` with the balance
  on every node and `مستويات التوسعة` `الكل`/0/1/2/3 (`MaxLevel = 3` in the window), and
  selecting a node fills `📋 تفاصيل الحسابات` with `الحساب الرئيسي · رمز الحساب · اسم
  الحساب · الفرع · الرصيد · كشف حساب · تعديل` — the parent named, not identified by uuid,
  and `كشف حساب` opening the ledger for that account. `/accounting/accounts/tree` gained
  the same balance column and levels, and the account form gained `⚖️ طبيعة الحساب`,
  `📅 تاريخ فتح الحساب`, `💰 الرصيد الافتتاحي` and `📊 مركز التكلفة`. Tests
  `apps/api/test/accounting-directory.spec.ts` (8) and the live
  `scripts/verify-accounting.mjs` (17 checks against the `demo` stack). **545** API
  tests, 36 staff, 71 contract. **Justified deviations:** `🚀 عرض البيانات` is the
  execute button of the window's own search form, and the three summary-tile labels are
  invented (the desktop has no tile row).

* **المرحلة 07 — المحاسبة، الجزء الثالث: 📒 إنشاء قيد يومية**
  (`Form_WPF/FrmNewEntry.xaml` «إنشاء قيد يومية»). **Two of the window's six card
  fields did not exist in the data model.** `⏰ الوقت` matters more than it looks: the
  desktop stores a *timestamp*, so two entries written on the same day keep the order
  they were written in and حركة الصندوق filters by date and time, while the cloud stored
  a date alone and could not tell 09:00 from 21:00. Migration `0046` adds
  `journal_entries.entry_time`, `journal_entries.is_vat` (`✅ قيد ضريبي`, `Entry.IsVAT`)
  and `journal_entry_lines.salesman_id` (`المندوب`, `Entry_sub.salesman`) — all three
  nullable or false by default, so every entry already on the books and every caller
  that sends none of them is untouched. The third thing the window does is fill in what
  the clerk leaves empty, and that is not decoration: `Save()` writes
  `سند قيد يومية رقم: {EntryNo} بتاريخ {date}` when الملاحظة is blank and names each
  unnamed line after the account it settles, because an entry with no note is unfindable
  a year later. Both defaults now live in the service — the note after the number has
  been allocated, since the number is what the note quotes — and what the clerk *did*
  write is kept, trimmed, never replaced. The screen is the window: the six card fields
  (with `رقم القيد` and `🔑 الرقم العام` read-only, because both are allocated by the
  server when the entry posts), `📋 تفاصيل القيد` with its nine columns,
  `الفرق=` in the grid's header — green when the two sides agree, as the window colours
  it — `مجموع المدين:` / `مجموع الدائن:` in its footer, `رمز الحساب` resolved to a name
  as it is typed, and the four refusals in the window's own words (`لا يوجد بيانات` ·
  `يجب إدخال اسم ورقم الحساب` · `يوجد بند رقم … بدون قيمة` ·
  `لا يمكن حفظ قيد غير متوازن`) before the question `هل أنت متأكد من حفظ القيد؟` —
  because a posted entry is not edited, only reversed. Tests
  `apps/api/test/journal-entry-card.spec.ts` (9) and section 8 of
  `scripts/verify-accounting.mjs` (11 more live checks, 48 in total). **566** API tests,
  36 staff, 71 contract. Deferred on purpose: `🖨️ طباعة`/`👁️ معاينة` of the entry
  document and the ⏮◀▶⏭ navigator, both of which belong to the reporting phase.

* **المرحلة 07 — المحاسبة، الجزء الرابع: 🌳 مراكز التكلفة**
  (`Form_WPF/frmCostCenter.xaml` «مركز التكلفة 🏢» و`frmCostCenterBalance.xaml`
  «تقرير مركز كلفة»). **The cost-centre tree had no numbers on it.** `GET /cost-centers`
  answered with a flat table of centres and no balance at all, so a centre could not be
  asked what it had spent; the window's tree and its report were both missing. No
  migration was needed for the tree itself — `cost_centers` already carried `parent_id`
  and `branch_id`; what was missing was the figure, so it is now computed exactly as the
  chart of accounts computes it: posted entries only, rolled up through `parent_id`, with
  `parentName`, `level` and `🏷️ النوع` (`🟢 رئيسي`/`🔵 فرعي`) beside it, and a caller
  that sends nothing still gets the old list. The report is new:
  `GET /statements/cost-center/:id` is the account statement pointed at a centre — the
  same `رصيد سابق` row, the same running الرصيد, the same totals — plus the window's own
  `اسم الحساب` and `🌿 الفرع` filters, and `📑 نوع التقرير` (`تجميعي`/`تفصيلي`). One
  deliberate difference: the window guesses a centre's nature from the first character of
  its code, as it does for accounts; a cost centre accumulates costs, so الرصيد grows on
  the debit side and `📌 الحالة` names the side the money is on. **Giving the centre a
  balance is what exposed two defects that had nothing to do with cost centres.**
  `prevent_posted_journal_mutation()` — installed by `0004_accounting.sql` L115 — allows
  exactly one mutation of a posted entry (`status = 'void'`) and then returns `OLD`,
  discarding the value it just allowed. Every `void` since then was silently thrown away:
  a cancelled sale kept its revenue, a cancelled purchase kept its cost, and a reversal
  left its original `posted`. No balance ever drifted, because a reversal also posts a
  mirrored entry that cancels the original — which is exactly why no test had caught it.
  And the mirrored lines carried only `partyId` and `description`, so every report scoped
  to a dimension — cost centre, branch, or the `المندوب` of part three — kept an amount
  the ledger had already released. Migration `0047` fixes the trigger's return value, the
  mirror now carries its dimensions, and `reverseJournal` no longer asks for the `void`
  at all: the mirror *is* the reversal, and voiding the original as well subtracts the
  amount twice when every balance counts `posted` only. Tests
  `apps/api/test/cost-centers.spec.ts` (9) and `reversal-and-void.spec.ts` (4, including
  a direct regression test that the guard now applies the void it allows and still
  refuses everything else), plus sections 9–10 of `scripts/verify-accounting.mjs`
  (12 more live checks, 60 in total). **579** API tests, 36 staff, 71 contract. Two
  navigation rows pointed at `/reports/cost-center-balances` and
  `/reports/cost-center-report`, routes that had never been built; they are now one real
  screen under `/accounting/cost-center-statement`, next to `كشف حساب`.

* **المرحلة 07 — المحاسبة، الجزء الخامس: الفترات والميزان وقائمة الدخل**
  (`Form_WPF/FrmAccountingPeriods.xaml` «إدارة الفترات المحاسبية» ·
  `frmRptBalances.xaml` «أرصدة الحسابات» · `frmRptIncomeStatement.xaml`
  «أرباح وخسائر حسابات رئيسية»). **Three things the cloud did not have: a period you can
  write, a ميزان with a period, and an income statement at all.** `GET /fiscal-periods`
  answered with rows that could be read, closed and reopened and nothing else — no name,
  no dates, no active flag, no delete — so `🗂️ إدارة الفترات المحاسبية` had no card to
  put on the screen. Migration `0048` adds the two columns the card carries
  (`notes`, `is_active`) with a partial unique index that enforces `⚡ تفعيل` — one active
  period, never a closed one — and `listPeriods` now returns the row the window binds:
  `الرقم` (the period's ordinal in its year, which is what a read-only `PeriodID` is),
  `yearName`, `isActive`, `notes` and `أغلقت بواسطة` **named** rather than a bare id (the
  desktop writes `Environment.UserName`). `POST`/`PATCH`/`DELETE` and
  `POST /fiscal-periods/:id/activate` follow `Class/AccountingPeriodManager.cs`
  statement for statement, including its five refusals in its own words — «يوجد تداخل في
  التواريخ مع فترة محاسبية أخرى» (409), «لا يمكن تفعيل فترة محاسبية مغلقة» (409),
  «لا يمكن تعديل فترة مغلقة. يرجى إعادة فتحها أولاً» (409), «لا يمكن حذف فترة مغلقة»
  (409) and the two 422s before any of them. The desktop has no fiscal years, so a period
  resolves (or opens) the year covering its dates — otherwise `➕ إضافة` would be unusable
  on an empty tenant. `GET /statements/trial-balance` was `accountId`/`debit`/`credit`
  over the whole ledger; it now takes `من`/`إلى`/`الفرع`/`المندوب`/`الحساب الرئيسي` and
  returns the window's ten columns — `افتتاحي · خلال الفترة المحددة · الرصيد · ختامي`,
  each on its مدين ودائن side, with `الحالة` — computed by the window's own `ShowResult`
  arithmetic, plus the account's `💰 الرصيد الافتتاحي`, and with `code`/`name` beside
  `accountId` so the ميزان no longer has to be assembled in the browser from two
  endpoints. A caller that sends nothing — and a row's four old keys — is unchanged, and
  `totals` is an addition beside `data`. `GET /statements/income-statement` is new: the
  accounts the desktop marks `FinalAcc = 2` (a code beginning `3` or `4`, written by
  `DetermineFinalAccount()` — the cloud calls them `revenue` and `expense`), carried up
  to their parents as the window does, then `قيمة مخزون بضاعة آخر المدة حتى هذا التاريخ`
  on the credit side and `صافي أرباح العام` as the plug that makes the columns meet.
  Tests `apps/api/test/fiscal-periods.spec.ts` (8), `trial-balance.spec.ts` (8) and
  `income-statement.spec.ts` (7, including a stock row backed by a real
  `inventory_transactions` line rather than a fixture), plus sections 11–13 of
  `scripts/verify-accounting.mjs` (23 more live checks, 83 in total — one of them checks
  the closing-balance formula itself). **602** API tests, 36 staff, 71 contract. The
  `قائمة الدخل التحليلية` navigation row pointed at `/reports/income-statement`, a
  report-engine key; it now names the desktop window and opens the real screen.
  Deferred: `Form_WPF/frmAddPeriod.xaml` (⏰ إدارة فترات التأجير — rental pricing per
  item group, and there is no general rental module in the standard per-tenant list) and
  the `من وقت`/`إلى وقت` boxes, which cut a day the cloud cuts by date.

* **المرحلة 08 — الموظفون والرواتب، الجزء الأول: 👤 بطاقة الموظف**
  (`Form_WPF/frmEmployees.xaml` «تعريف موظف» · `frmManagement.xaml` «الإدارات» ·
  `frmDepartments.xaml` «إدخال بيانات الإدارات والأقسام» · `frmJobs.xaml` «الوظائف»).
  **حزمة الرواتب كانت قائمة قبل هذه المرحلة — الإدارات والوظائف والموظفون
  والمسيرات — لكن بطاقة الموظف كانت نصفَ بطاقة.** `GET /hrm/employees` يردّ ثلاثة
  عشر حقلاً: جانبُ الراتب وما يحيط به، ولا ميلاد، ولا هاتف، ولا هوية، ولا حساب.
  والديسكتوب لا يحفظ موظفاً بلا حساب: `frmEmployees.xaml.cs` L520 يرفض اسماً فارغاً
  («يجب إدخال اسم الموظف»)، ثم L600 `SaveAccounts` يكتب شجرة حساب باسم الموظف تحت
  حساب موظفي الفرع (`Common.CurrentBranch.EmployeeAcc`، وافتراضه 2241 — وهو
  «موظفين الفرع الرئيسي» في الشجرة المزروعة عندنا)، ويعيد تسميتها إن كان الرمز
  موجوداً، ويهمل نتيجتها فلا يُسقط فشلُها حفظَ الموظف. وL730 يرفض حذفَ موظفٍ له
  مستخدم («لا يمكن حذف موظف مرتبط بمستخدم») أو فواتير («لا يمكن حذف موظف مرتبط
  بفواتير»). ترحيل 0049 يضيف `departments.parent_id` والاثني عشر عموداً — وال
  `parent_id` وحده هو ما يجعل الإدارة والقسم درجتين لا اسماً واحداً: صفٌّ بلا أبٍ هو
  إدارة، وصفٌّ بأبٍ هو قسم، فلا تُخزَّن الإدارة مرتين فيمكن أن تختلف عن قسمها.
  والآن: `رقم الحساب` يُخصَّص تلقائياً (`MaxId` نفسه: الرقم التالي تحت الأب) ويردّ
  على البطاقة، وتغيير الاسم يغيّر اسم الحساب لأن الحساب هو الموظف داخل الدفتر،
  و`إجمالي الرواتب والمستحقات` يُحسب من البدلات السبعة كما تفعل
  `CalculateTotalSalary` — وهي الأرقام نفسها التي تجمعها حاسبة المسير، فلا يمكن أن
  يختلف ما تراه البطاقة عمّا يراه مسيّر الرواتب. و`GET /hrm/employees?q=` يبحث
  بالاسم أو بالرقم، وفلتر الإدارة يجلب موظفي أقسامها. **التوافق مصون:** الردّ مصفوفة
  كما كان وكل مفتاحٍ قديم باقٍ. اختبارات `apps/api/test/employee-card.spec.ts`
  (16 — أول اختبارات HTTP للوحدة: كانت `hrm` بلا اختبارٍ غير حاسبة الراتب)،
  و`scripts/verify-hrm.mjs` (27 نقطة تحقّق حيّة، تُعاد ثلاث مرات بلا أثر).
  **618** اختبار API (كان 602) · 36 staff · 71 contract · lint أخضر. أُجّلت
  «🖼️ صورة الموظف» (بايتاتٌ في عمود الديسكتوب، وملفات السحابة تحتاج تدفّق
  presign/finalize في الشاشة) و«🏬 فروع الموظف» (`EmpBranches` — موظفٌ على أكثر من
  فرع، والسحابة تحمل فرعاً واحداً)، و`frmAttendM.xaml` لأن «تحضير المراكب» حضورُ
  مراكبَ لا موظفين (مرحلة الوحدات الرأسية).

* **المرحلة 08 — الموظفون والرواتب، الجزء الثاني: 🎁 الحوافز والجزاءات**
  (`Form_WPF/frmEmpSalaryAddSub.xaml` «إدخال الحوافز والخصومات للموظفين» ·
  `Class/AddSubEmployee.cs`). **السحابة كانت تعرف نصف الفكرة: إضافةً أو خصماً يعتمدُه
  أحدهم فيدخل مسيرَ الرواتب. أما السند نفسه — المكافأة التي تُصرف اليوم من الصندوق،
  والسلفة التي تُردّ من الراتب — فلم يكن له وجود.** النافذة أربعُ رفوضٍ بعبارة واحدة
  لكلٍّ منها (`ValidateInputs` L566): «يجب اختيار موظف» · «يجب اختيار نوع الإجراء» ·
  «يجب إدخال مبلغ» · «يجب اختيار الصندوق أو البنك» — والأنواع ثلاثةٌ بأرقامها في
  `SalaryAddSubTypes`: **1 مكافأة** (إضافة) و**2 خصم** و**3 سلفة** (خصمان)، وهي التي
  تكتب عنوان مربع الاختيار (L540): «✅ تضاف على الراتب» أو «✂️ تخصم من الراتب». «رقم
  السند» هو `ISNULL(MAX(id),0)+1` (L225)، والملاحظة تُكتب نفسها إن تُرکت فارغة
  (L665): «مكافأة للموظف…»/«خصم…»/«سلفة…». ولكل سندٍ قيدٌ (L718): المكافأة تمدين
  «راتب أساسي» `3122001` وتدائن الصندوق، والسلفة والخصم يمدينان حساب الموظف — الحساب
  الذي أنشأه الجزء الأول — ويدينان الصندوق. ترحيل 0050 يضيف جدول
  `salary_adjustment_types` وخمسة أعمدة على `salary_adjustments` (`number` بفهرسٍ فريد
  جزئي، و`type_id` بمفتاحٍ خارجي `restrict`، و`payment_method`، و`deleted_at`،
  و`deleted_by`)؛ والأنواع الثلاثة تُزرع لكل مستأجر: في الترحيل لمن كان قائماً، وفي
  `OrgProvisioningService` لمن يُنشأ بعده — فلا يولد مستأجرٌ بنافذةٍ فارغة. الحذف ناعم
  بعد «⚠️ هل أنت متأكد من الحذف؟»، ويرفض حالتين لا ينظر فيهما الديسكتوب: حركةٌ مرحَّلة
  (تُعكس قيدها، لا تُمحى)، وحركةٌ دخلت مسيراً مُرحَّلاً. **قراران يخالفان الديسكتوب:**
  مكافأةٌ تُصرف نقداً تمدين «راتب أساسي» لا الصندوق — فالديسكتوب يجعل المكافأة تُنمي
  النقد — وخصمٌ يركب الراتب لا يُقيَّد مرتين، بل مرةً واحدة في المسير. **التوافق
  مصون:** `GET /hrm/adjustments` يردّ المصفوفة نفسها، وكل مفتاحٍ قديم باقٍ،
  و`POST /hrm/adjustments/:id/approve` كما كان. `apps/api/test/salary-adjustments.spec.ts`
  (11 اختباراً) و`scripts/verify-hrm.mjs` §7 (**45** نقطة تحقّق حيّة بعد أن كانت 27،
  وتُعاد مرتين بلا أثر إلا السندَين المرحَّلَين). **629** اختبار API (كان 618) ·
  36 staff · 71 contract · tsc وlint أخضران. أُجّل «⏰ الوقت» على السند كما أُجّل في
  المرحلة 07، والمتنقّل بين السندات إلى الجزأين الثالث والخامس.

* **المرحلة 08 — الموظفون والرواتب، الجزء الثالث: 💵 دفع الرواتب**
  (`Form_WPF/frmSalaryPay.xaml` «دفع الرواتب»). **السحابة كانت تصرف شهراً كاملاً بسندٍ
  واحد، أو لا تصرف شيئاً: `POST /hrm/payroll/runs/:id/pay` يُنشئ سند صرف واحداً
  للمسيّر كلّه. أما إذن الصرف — السند الذي يُعطى للموظف، ويحمل رقمه وطريقته وصندوقه
  ومَن أمضاه — فلم يكن له وجود.** النافذة إذنٌ واحد لكل موظف عن كل شهر:
  `رقم الإذن` = `MAX(id)+1` (L120)، و`btnSave_Click` يرفض ثلاث مرات («يجب اختيار
  الفرع.» · «يجب اختيار الموظف.» · «يجب اختيار الصندوق.»)، ثم «لقد تم دفع راتب الموظف
  سابقاً.» (L470 — وهو قيدُ uniqueness على `(emp, month, year)` لا شرطٌ في الكود)،
  ثم «لم يتم العثور على الحساب المقابل للصندوق.» (L486). و«📊 عرض الراتب» يقرأ الشهر
  من `Salary_Res ⋈ Salary_Res_Details`، ويرفض موظفاً بلا مستحق بـ «لا يوجد رواتب
  مستحقة للموظف.». و`RecalcNet` L340: **الصافي = الراتب الأساسي + بدل سكن + بدل
  مواصلات + الحوافز − الخصومات**. ترحيل 0051 يضيف `salary_payments` بفهرسين فريدين
  جزئيّين — على `(tenant_id, number)` وعلى `(tenant_id, employee_id, year_month)`،
  وهو الثاني الذي يجعل «لقد تم دفع راتب الموظف سابقاً» حقيقةً في القاعدة لا رسالةً في
  التطبيق. والمبلغ يُقرأ من سطر الموظف في مسيّر الشهر إن سُمّي، وإلا من بطاقته
  وحوافزه المعتمدة — الحسبة نفسها التي يطبعها `POST /hrm/payroll/preview`، فلا يمكن أن
  يصرف الإذن رقمين مختلفين عن المسير. ولكل إذنٍ سند صرف مرحَّل: مدينٌ حساب الموظف
  (`Employees.AccCode` — الحساب الذي أنشأه الجزء الأول، والذي مدينتْه السلفة في الجزء
  الثاني) ودائنٌ الصندوق. والحذف ناعم بعد «اختر سنداً ليتم حذفه.»، ويرفض إذناً مرحَّلاً:
  «يُلغى سند الصرف أولاً» — فسند الخزينة مستندٌ له قيده، لا يُمحى بمحو الإذن الذي
  أشار إليه. **التوافق مصون:** مسار صرف المسير القديم كما هو، وكل ما أُضيف جديد.
  `apps/api/test/salary-payments.spec.ts` (12 اختباراً) و`scripts/verify-hrm.mjs` §8
  (**64** نقطة تحقّق حيّة بعد أن كانت 45، ثلاث تشغيلات متتالية خضراء). **641** اختبار
  API (كان 629) · 36 staff · 71 contract · tsc وlint أخضران. وأُضيفت الأنواع الثلاثة
  إلى `seed-demo.ts` لأن المستأجر التجريبي يُبنى بسكربت البذر لا بـ
  `OrgProvisioningService`، فكان المستأجر الوحيد بنافذة حوافز فارغة. مؤجَّل: أزرار
  التنقّل بين الإذونات («الأول»/«السابق»/«التالي»/«الأخير») إلى أن تصير الشاشة بطاقةً
  تُفتح بـ `?id=`، و`⏰ الوقت` على السند كما في المرحلة 07، و`PaySalary.repx` إلى مرحلة
  التقارير.

* **المرحلة 08 — الموظفون والرواتب، الجزء الرابع: 📄 كشف حساب موظف**
  (`Form_WPF/frmEmpAccountGet.xaml` «كشف حساب موظف»). **لم يكن للموظف كشفٌ في السحابة:
  السبيل الوحيد `GET /accounting/statements/general-ledger/:accountId`، ومن أراد كشف
  موظف كان عليه أن يعرف رقم حسابه أولاً؛ وكان في الشجرة صفٌّ باسم «حساب موظف» يشير إلى
  `/reports/employee-account` — مسارٌ لم يُبنَ قط.** النافذة three regions: الفلاتر
  `اسم الموظف` («اختر الموظف...») · `🏢 الفرع` + `كل الفروع` · `📅 الفترة الزمنية` +
  `فترة كاملة` + `من:`/`إلى:` · `🔍 عرض كشف الحساب`؛ والشبكة `📊 تفاصيل كشف الحساب`
  بـ`م · مدين · دائن · الموظف · رقم القيد · تاريخ القيد · البيان · تفاصيل`
  (`BuildResultTable` L305)؛ وأربع بطاقات `💳 إجمالي المدين` · `💵 إجمالي الدائن` ·
  `⚖️ الرصيد المدين` · `⚖️ الرصيد الدائن` (`UpdateSummary` L318 — الرصيد على جانبٍ
  واحد، والآخر «0»). و`ShowAccount` L226 هو الاستعلام نفسه: `Entry ⋈ Entry_sub` على
  حساب الموظف، `IS_Deleted=0 AND state=1` (المرحَّل وحده)، والتاريخان `>= @date1 AND
  <= @date2` حيث `@date2 = txtDateTo.AddHours(24)` — اليوم الأخير داخل الفترة — و
  `GROUP BY Entry.GlobalID, …`: صفٌّ لكل قيد. و`LoadAccounts` L96
  (`AccCode <> -1`): **لا يظهر إلا من له حساب**، ومن لا حساب له يُردّ بـ «لا يوجد حساب
  للموظف في دليل الحسابات». **لا ترحيل ولا SQL جديد**: `HrmService.employeeStatement`
  يأخذ حساب الموظف (`employeeAccountId ?? salaryPayableAccountId`) ويُفوِّض إلى
  `AccountingService.accountStatement`، فالرصيد السابق والمتحرّك محسوبان مرّةً واحدة،
  وكشف الموظف لا يختلف حساباً عن كشف الحساب ولا كشف مركز الكلفة. وصُحِّح عرضاً خللٌ
  قديم: السلفة المصروفة نقداً كانت تُخصم من الراتب مرّة ثانية، فصارت
  `adjustmentsForMonth` على صورة `FrmReseved.xaml.cs` L166 (`SubFromSalary = 1`
  والتاريخ داخل الشهر) — أثرُه في مسيّر الشهر وفي إذن الصرف. ومربّعات «فترة كاملة» و
  «عدم إظهار الرصيد السابق» و«تفصيلي» تقبل `1` و`true` و`on` كما في المحاسبة، ولم يكن
  للأولين أثرٌ قبل ذلك. `apps/api/test/employee-statement.spec.ts` (11 اختباراً) و
  `scripts/verify-hrm.mjs` §9 (**82** نقطة تحقّق حيّة بعد أن كانت 64، ثلاث تشغيلات
  متتالية خضراء). **652** اختبار API (كان 641) · 36 staff · 71 contract · tsc وlint
  أخضران. مؤجَّل: `👁️ معاينة` و`PaySalary.repx` إلى مرحلة التقارير.

* **المرحلة 08 — الموظفون والرواتب، الجزء الخامس: 📈 حركات الموظف و📊 تقرير الرواتب**
  (`Form_WPF/frmEmpInvs.xaml` «مبيعات ومشتريات موظف خلال الفترة» و
  `Form_WPF/frmRptSalary.xaml` «تقرير الرواتب»). **لم يكن للموظف حركاتٌ في السحابة:
  `sales_invoices.salesman_id` موجود ولا شيء يقرأه؛ وكان صفّ «تقرير الرواتب» في الشجرة
  يشير إلى `/reports/payroll-payments` — تقرير المسيّر، لا تقرير الإذونات.**
  `frmEmpInvs` — فلاتر `👤 الموظف` («اختر الموظف...» + `الكل`) · `🔄 نوع الحركة`
  (`مبيعات` · `مرتجع` + `الكل`) · `📅 من تاريخ`/`📅 إلى تاريخ` · `🔍 عرض`، وشبكة
  `📋 بيانات الحركات` بـ`نوع الحركة · التاريخ · رقم الفاتورة · الصنف · الكمية · السعر ·
  إضافات · الإجمالي`، و`💰 الإجمالي`footer. و`ShowResult` L226 يقرأ `Inv ⋈ Inv_Sub`
  على `Inv.sales_emp` بشرط `IS_Deleted=0` والتاريخين (`@date2 = txtDateTo.AddHours(24)`
  — اليوم الأخير داخل الفترة): **صفٌّ لكل سطر فاتورة**. و`frmRptSalary` — `الشهر:` ·
  `السنة:` · `كل الفترة` (يُعطّلهما) · `🔍 عرض` · `💰 سند استلام راتب لموظف`، وشبكة
  `💼 بيانات الرواتب` بـ`م · SalId · رقم السند · الموظف · الراتب الأساسي · بدل سكن ·
  بدل مواصلات · الحوافز · الإجمالي · الخصومات · صافي الراتب · 👁️ عرض` و
  `💰 إجمالي الرواتب:`؛ و`btnShow_Click` L58 يقرأ `SalaryPay` (= `salary_payments`،
  إذن الصرف من الجزء الثالث) بـ`IS_Deleted=0` والشهر والسنة، و
  `gross = tot_salary + Houses + Travel + salary_add` و`net = gross − salary_sub`.
  **لا ترحيلَ جديد**: الأولى تقرأ `sales_invoices` والثانية `salary_payments`.
  وقراراتٌ مُعلَّلة في `PHASE_08_HRM.md` §8.4: لا «مشتريات» لأن `purchase_invoices`
  لا تحمل موظفاً؛ ونقطة البيع يُميَّزها `orderType` كما يميّزها `inv_type=3`؛
  و`💰 الإجمالي` يجمع الفواتير مرّة واحدة لا مرّةً لكل سطر كما تفعل النافذة؛
  و`الإجمالي = الصافي + الخصومات` لأن حساب النافذة لا مكان فيه للبدلات الأربع؛
  و`SalId` مفتاحٌ لا عمود. وصُحِّح عرضاً خللٌ في الجزء الثالث: إذنٌ مرفوض لعدم حساب
  الموظف كان يبقى مسوَّداً في الدفاتر لأن شرط الحساب كان بعد الإدخال، فصار قبله.
  `apps/api/test/employee-movements.spec.ts` (11) و`apps/api/test/salary-report.spec.ts`
  (7) و`scripts/verify-hrm.mjs` §10 و§11 (**105** نقطة تحقّق حيّة بعد أن كانت 82،
  أربع تشغيلات متتالية خضراء). **670** اختبار API (كان 652) · 36 staff · 71 contract ·
  tsc وlint أخضران. مؤجَّل: «👁️ عرض» وعمود «عرض» إلى أن تُفتح شاشات السندات بـ`?id=`،
  ونصف «مشتريات» إلى أن يحمل فاتورة الشراء موظفاً.

* **المرحلة 09 — الوحدات الرأسية، الجزء الأول: 🧑‍💼 المندوبون والعمولات**
  (`Form_WPF/frmSalesMen.xaml` «شاشة المندوبين» و`Form_WPF/frmInvBySalesMen.xaml`
  «مبيعات مندوب خلال فترة»). **«كم يستحق هذا المندوب؟» لم يكن لها جواب في السحابة:
  `sales_invoices.salesman_id` موجود ولا شيء يقرأه، والثلاث نسب التي يقرأها
  `frmInvBySalesMen` (`comm` · `Colle_Comm` · `Profit_Comm`) لا مكان لها أصلاً —
  فبطاقة المندوب كانت اسماً وعلماً.** ترحيل 0052 يضيفها إلى `salesmen` مع
  `الهاتف · الجوال · البريد الإلكتروني · ملاحظات`، ويضيف `employee_id`: جسرٌ سحابيٌّ
  لا نظير له في الديسكتوب لأن الديسكتوب يسمّي المندوب بجدولٍ واحد، أما السحابة فالفواتير
  فيها تسمي بطاقة المندوب وسندات القبض تسمي بطاقة الموظف (`vouchers.salesman_id`)،
  والجسر وحده هو ما يجعل مندوباً واحداً يملك الاثنين. وحساب العمولات منقولٌ نصّاً من
  `ProcessInvoiceRow` L330–L341: `عمولة المبيعات = النسبة × صافي الفاتورة`،
  و`عمولة التحصيل = النسبة × الصافي` إن حُصِّلت الفاتورة (الديسكتوب يقرأ `pay_type`
  والسحابة تُثبت التحصيل بـ`paid_total`)، و`عمولة الربح = النسبة × (الصافي − التكلفة)`
  إن كان الربح موجباً. وثلاثةُ مصادرَ للصفوف: الفواتير المرحَّلة، وإشعارُ المدين
  المُعلَّق بفاتورة بيع (يستردّ عمولتي المبيعات والتحصيل بإشارةٍ سالبة)،
  وسنداتُ القبض (`ReceiptType` 5 و7) بقيمتها بلا ضريبة وعمولتها على ما قُبض.
  `GET /sales/salesmen/commissions` و`GET/POST/PATCH/DELETE /sales/salesmen` (لا جسمٌ
  قائم تغيّر)، وشاشتان: `/sales/salesmen` بالبطاقة كاملةً والرابط إلى التقرير،
  و`/sales/salesman-commissions` بصفٍّ في شجرة المبيعات. وقراراتٌ مُعلَّلة في
  `PHASE_09_VERTICALS.md` §4.3 — أهمّها: «💰 إجمالي القيمة» هنا **بإشارة** لأن
  `RecalculateSummary` L482 يجمع القيمة بلا `isPlus` فيكبر إجمالي الديسكتوب بالمرتجع؛
  والنسبة تُرفض خارج 0–100 بدل أن تُخزَّن صفراً كما يفعل `double.TryParse`؛ وقيمة
  السند `net_amount` بدل `NetVal × 100 / 115` المكتوبة في الكود؛ والسندات مقيدة
  بالتاريخين دائماً وغير مقيدة بالفرع كما في النافذة — ومُثبَّتةٌ باختبارٍ حتى لا
  تُصلَح صامتاً. `apps/api/test/salesman-card.spec.ts` (5) و
  `apps/api/test/salesman-commissions.spec.ts` (9) و`scripts/verify-salesmen.mjs`
  (**21** نقطة تحقّق حيّة، ثلاث تشغيلات متتالية خضراء: الوثائق التي لا يمكن إبطالها —
  فاتورةٌ مُحصَّلة وإشعار مدين — تُنشأ مرّةً وتُعاد، وما سواها يُلغى).
  **684** اختبار API (كان 670) · 36 staff · 71 contract · tsc وlint أخضران.
  مؤجَّل: «👁️ عرض» و«👁️ معاينة» و`.repx` إلى مرحلة التقارير، ونصف «مشتريات» إلى أن
  تحمل فاتورة الشراء موظفاً.

* **المرحلة 09 — الوحدات الرأسية، الجزء الثاني: 🧵 طلب التفصيل**
  (`Form_WPF/frmOrders.xaml` «إدارة طلبات التفصيل» و`Form_WPF/frmOrderDetails.xaml`
  «إضافة طلب تفصيل» و`Form_WPF/frmOptions.xaml` «⚙️ إدارة الخيارات الجاهزة»).
  **وحدة `tailoring` في السحابة كانت تجيب عن سؤالٍ واحد: «ما قياس هذا العميل؟».
  لا طلب، ولا حالة، ولا موعد تسليم، ولا سعر — ولا شيء مما يكتبه الخيّاط على البطاقة.**
  ترحيل 0053 يضيف ستة جداول: `tailoring_orders` (رقم · العميل · القياس · نوع التفصيل ·
  الحالة · التاريخان · الكمية · السعر · المدفوع · القماش والتصميم) و
  `tailoring_order_options` و`tailoring_order_statuses` و`tailoring_types` و
  `tailoring_option_categories` و`tailoring_option_values`. والحالات الأربع —
  `مستلم · في الخياطة · جاهز · تم التسليم` — مبذورة في الترحيل لكل مؤسسة قائمة وفي
  `OrgProvisioningService` لكل مؤسسة تُخلق بعده، لأن صفوف `OrderStatus` ليست في هذا
  المستودع والموضع الوحيد الذي كُتبت فيه دورة التفصيل كلماتٍ هو
  `frmViewOrders.GetStateText` L119. والقواعد منقولةٌ بنصّها: الرفوض الثلاثة
  «الرجاء اختيار عميل» · «الرجاء اختيار نوع التفصيل» · «الرجاء إدخال السعر»
  (`btnSave_Click` L318–L341)، و⌛ المتبقي = 💰 السعر − 💵 المدفوع وهو **سالبٌ مسموح**
  (`CalculateRemaining` L290 يلوّنه أخضر ولا يرفضه)، و⌛ متأخّر = مضى موعد التسليم
  والحالة ليست نهائية (تلويث الصف `#FFE4E4` L146)، و«🔄 تغيير الحالة» يستدعي
  `sp_UpdateOrderStatus`، و⭐ تعيين افتراضي يُصفّر التصنيف ثم يُعيّن المختار (L323/L330).
  النهايات: `GET/POST/PATCH/DELETE /tailoring/orders` و`POST /tailoring/orders/{id}/status`
  و`GET /tailoring/order-statuses` و`GET/POST/PATCH/DELETE /tailoring/types` و
  `/tailoring/option-categories` و`/tailoring/option-values` و
  `POST /tailoring/option-values/{id}/default` — القراءة `tailoring.view` والكتابة
  `tailoring.manage` — وشاشتان: `/tailoring/orders` (الشبكة والفلاتر والبطاقة في نافذة)
  و`/tailoring/options` (لوحتا «📂 التصنيفات (الأنواع)» و«🔧 الخيارات المتاحة»)، ووحدة
  جديدة في الشجرة: 🧵 التفصيل. وقراراتٌ مُعلَّلة في `PHASE_09_VERTICALS.md` §5.3 —
  أهمّها: **«✏️ تعديل» يُعدّل الطلب المختار**، لأن `LoadOrderData` L417 في الديسكتوب
  **فارغة** («يمكن تطويرها لاحقًا») وحفظُها يُدرج طلباً ثانياً؛ والعميل لا يُستبدل من
  تحت الطلب (`TAILORING_CUSTOMER_IMMUTABLE`)؛ ورقم الطلب من سلسلة الوثائق بالبادئة `TO-`
  لأن الإجراء الذي يولّده في الديسكتوب ليس في المستودع؛ و«🧵 أنواع التفصيل» تُدار
  بالـ API بلا شاشة — كما في الديسكتوب إذ تُبذَر في القاعدة — وصفٌّ في الشجرة بحالة
  `api`. وإصلاحٌ عارض كشفه سكربت التحقّق: `PartiesService.softDelete` كان يقارن الرصيد
  — نصّاً بأربعة أعشار — بالسلسلة `'0'`، فكان **يرفض كل حذف عميل**؛ والمقارنة الآن
  رقمية ومُثبَّتة باختبار. `apps/api/test/tailoring-orders.spec.ts` (**11** اختباراً)
  واختبارٌ في `parties.spec.ts` و`scripts/verify-tailoring.mjs` (**38** نقطة تحقّق
  حيّة، خمس تشغيلات متتالية خضراء، وأربعٌ منها تبدأ من قاعدة نظيفة وتنتهي بلا أثر:
  لا طلب ولا نوع ولا تصنيف ولا عميل). **696** اختبار API (كان 684) · 36 staff ·
  71 contract · tsc وlint أخضران. ومؤجَّل عن قصد: شاشة أنواع التفصيل مع شاشة القياسات،
  وتاريخُ الحالات (لا شاشة تقرأه).

* **المرحلة 10 — التقارير، الجزء السابع: 🖨️ إعدادات الطباعة**
  (`Form_WPF/frmSettings.xaml` «خيارات الطباعة» (الأسطر 889-1312 من 2364) ·
  `frmInvRptType.xaml` «🖨️ افتراضي طباعة الفواتير» (122/72) · `Class/Print.cs` (1237) ·
  `Reports/header.repx` · `Reports/footer.repx` · جدول `SettingPrint`
  (`CrystalLiteDB.txt` L2260-L2280)). **جدول `print_settings` جديد** (ترحيل `0061`)
  يحمل كل ما يحمله الديسكتوب — الترويسة · التذييل · الختم · «طباعة تفاصيل الأصناف» ·
  «طباعة مجموعات الأصناف مع إغلاق اليومية» · «طباعة مكونات الأصناف المركبة بشكل منفرد» ·
  «طباعة make pay» · عدد النسخ · «طابعة الكاشير» · «طابعة المطبخ» · «اسم التقرير» ·
  «مسار التقرير» · «ملاحظات التقرير» — بسبعة نطاقات هي راديوات «🧩 تفعيل إعدادات
  الطباعة» (`frmSettings.xaml.cs` L2095-L2116: 0 الإفتراضي · 1 مشتريات · 2 مبيعات ·
  3 نقطة بيع · 4 تأجير · 5 عقود · 6 تقارير) ونطاق `report:<key>` لكل تقرير؛ فالنوافذ
  نفسها لا تتفق على معنى الأعداد (`frmRptKhzna` L106 يقرأ 12، و`frmRptEntries` يقرأ 9،
  و`frmRptRentInvoices` L541 يقرأ 14) فحُفظ المعنى وسُمّي النطاق. والبحث يسير
  `report:<key>` → «تقارير» → «الإفتراضي». **الورقة تحترم الإعدادات**: `printNo` نسخاً
  كلٌّ في صفحة كما يكرّر `Printing()` الطباعة (L201-L206)، و`printType` ورقة A4 أو
  🧾 ورق صغير 80mm (راديوا `frmInvRptType`)، و`printHeader`/`printFooter` ترويسة
  المنشأة (`header.repx`) وسطر الاتصال (`footer.repx`)، و`printStamp` صورة الختم تحت
  «أعده · راجعه · المدير»، و`note` «ملاحظات التقرير» تحت الجدول، و«طابعة الكاشير /
  المطبخ» تُعرض للمشغّل ولا تُطبع؛ و`?copies=` و`?paper=` يتجاوزانها لمرةٍ واحدة.
  **🧾 والوثائق الخمس تقرأ الإعدادات كذلك** — `frmPurchInv` يطبع بـ`new Print(1)`
  «مشتريات»، و`frmSalesInvoice` بـ`new Print(InvType)` = 2 «مبيعات»، و`frmCloseShift`
  يقرأ `Inv_Id = 6` «تقارير»، والسند (`new Print(11)`) والقيد (`Inv_Id=9`) يرجعان إلى
  «الإفتراضي» لأنّ عددَيهما لا راديوَ لهما؛ فكل وثيقةٍ نسخُها وورقُها وترويسُها
  وتذييلُها وختمُها من الصفّ نفسه (`PrintTemplatesService.documentPage`).
  **«👁️ معاينة الطباعة» و«طباعة / PDF» ورقةٌ واحدة** — كلاهما يمرّ
  بـ`ReportingService.printOptionsFor()` كما يمرّ زرّا الديسكتوب بـ`Print.cs` نفسه.
  وشاشة `/settings/printing` في `apps/staff` (ضمن «الإعدادات»، بإذن
  `reporting.layout.manage`) وزرّ «إعدادات الطباعة» بجانب «طباعة / PDF» في كل تقرير.
  `apps/api/test/print-settings.spec.ts` (**15** اختباراً) و
  `scripts/verify-print-settings.mjs` (**50** نقطة تحقّق حيّة، ثلاث مراتٍ متتالية بصفر
  فشل، خطّ أساس لما كان محفوظاً، وتنظيفٌ يعيد كل نطاقٍ إلى ما كان). **852** اختبار API
  (كان 837) · 36 staff · 71 contract · tsc وlint أخضران. ومؤجَّل عن قصد: شبكة
  `PrinterSettings` «📑 ربط الطابعات بالتقارير» (الخادم لا يرى طابعات المحل)، وأثر
  `PrintItemType` و`PrintComponentsItemsIndividually` على ترتيب بنود الفاتورة،
  والصور روابط لا بايتات لأنّ السحابة لا تخزّن ملفات.
* **المرحلة 10 — التقارير، الجزء الثامن: 📑 كشوف الحساب** (`Form_WPF/frmCustAccount.xaml`
  «أرصدة حساب العملاء» (556/683) · `frmCustAccountGet.xaml` «📋 كشف حساب عميل» (747/1017) ·
  `frmCustLastPay.xaml` «📋 حركة آخر سداد للعملاء» (628/630) · `frmAccountBalance.xaml`
  «كشف حساب تفصيلي» · `frmCostCenterBalance.xaml` «تقرير مركز كلفة`). **عائلةٌ من سبع
  نوافذ خارج جدول `frmRpt*` الاثنتين والثلاثين**: أربعٌ منها كانت حيّة من المرحلتين 07 و08
  (`GET /statements/general-ledger/:id` بـ`with_descendants`، و`GET /statements/cost-center/:id`،
  و`GET /hrm/employee-statement`)، وثلاثٌ لم تكن — فبُنيت: **`customer-balances`** شبكةُ
  الأعمدة السبعة (`#` · `🔢 رقم الحساب` · `👤 اسم العميل` · `💸 حركة مدين` · `💰 حركة دائن` ·
  `⚖️ الرصيد` · `📌 الحالة`) وحركة الطرف هي حركة **حسابه** (`Entry_sub.acc_no`، L221-L231)
  والرصيد `Abs(debit − credit)` وحالته بزيادة الجانب (L258-L288) ولا يُطبع من لا حركة له؛
  و**`party-statement`** كشفٌ قيداً بسطر (`GROUP BY GlobalID, date, notes, acc_no`، L336)
  بأربع بطاقات يوضع الرصيد فيها على **جانبٍ واحد** (`UpdateSummary` L583-L609)؛
  و**`customer-last-payment`** آخر قيدٍ حرّك الحساب (`TOP 1 … ORDER BY id DESC`، L222-L231)
  بقيمته (`dept == 0 ? credit : dept`، L258) ورصيده وثلاث بطاقات `💳 الإجمالي` · `⚖️ الرصيد` ·
  `📌 السجلات` — وبلا فلتر فترة، لأنّ النافذة لا مربّع تاريخ فيها. وفلتر «🏷️ نوع الحساب»
  (الكل · عملاء · موردين) يجعل كشف العميل كشف المورد. **واستُكملت النوافذ الأربع** بفلترَي
  ⏰ الوقت (`frmAccountBalance` L458-L463: صندوقا وقتٍ مع صندوقي تاريخ، والرصيد السابق
  يقرأ الساعة نفسها) و📋 نوع القيد (بمفردات `source_type` التي يطبعها عمود «النوع»، لأنّ
  قائمة `cmbEntryType` L108-L127 بالفهرس وتخالف `GetEntryTypeName` في معنى الأرقام).
  `apps/api/test/report-party-statements.spec.ts` (**14** اختباراً) واختباران ملحقان
  بـ`accounting-statement.spec.ts` (13 · 14) و`scripts/verify-party-statements.mjs`
  (**67** نقطة تحقّق حيّة، أربع تشغيلات متتالية بصفر فشل، كل رقمٍ فرقٌ عن خطّ أساس،
  والقيود تُعكس ولا تُمحى كما في الدفاتر). **868** اختبار API (كان 852) · 36 staff ·
  71 contract · tsc وlint أخضران. ومؤجَّل عن قصد: عمود «الجوال» (لا `mobile` على
  `parties`)، وزرّا «تفاصيل» و«عرض»، و«⚖️ نوع الرصيد» الذي يُخفي عموداً في النافذة ولا
  يُسقط صفّاً.

* **المرحلة 11 — الفاتورة الإلكترونية، الجزء الأول: ⚙️ إعدادات الربط الضريبي - زاتكا
  ZATCA** (`Form_WPF/frmZatcaSetting.xaml` (472) + `.xaml.cs` (1160) ·
  `Class/ZatcaService.cs` (546) · `Class/ZatcaCredential.cs` · الجداول الثلاثة
  `SettingZatca` · `CSRProperties` · `ZatcaCredential`). **محرّك الفاتورة الإلكترونية كان
  يستقبل الشهادة جاهزة**: لا توليد، ولا تأهيل، ولا اختبار ربط — فصار للتأهيل ladder
  بأربعة درجات خلف تسعة مسارات: `GET/PUT /einvoice/settings` ·
  `POST /einvoice/settings/fill-from-company` (🔄 تعبئة تلقائي) ·
  `POST /einvoice/csr/generate` (⚡ توليد) ·
  `POST /einvoice/onboarding/compliance-csid` (🔵 بالـ 🔑 OTP) ·
  `…/production-csid` (🔐 حفظ مفتاح التشفير) · `…/compliance-check` (🧪 اختبار الربط) ·
  `…/renew` (🔄 Renews CSID) · `POST /einvoice/link/toggle` (⏸ إيقاف الربط / ▶ تشغيل).
  **جدول `einvoice_settings` جديد** (ترحيل `0062` + `down`) يحمل أعمدة
  `SettingZatca` وخصائص `CSRProperties` التسع وختم كل درجة، وأربعة أعمدة على
  `einvoice_credentials` للزوجيْن: الامتثال (`request_id`) والإنتاج (`p_request_id` ·
  `p_csid_enc` · `p_secret_enc`). و**طلب التوقيع PKCS#10 حقيقي** على `secp256k1` بموضوع
  `C·OU·O·CN` و`subjectAltName` بخمس خصائص (`SN` = السريال بصيغة
  `1-CloudERP|2-{الإصدار}|3-{uuid}` · `UID` = الرقم الضريبي · `title` = نوع الفواتير ·
  `registeredAddress` · `businessCategory`) والامتداد
  `1.3.6.1.4.1.311.20.2 = ZATCA-Code-Signing` — لأنّ `AuditorAPI` التي يستخدمها الديسكتوب
  مكتبةٌ مغلقة، فكُتب الطلب على المواصفة المنشورة، والدليل أنّ `openssl req -verify`
  يقول `self-signature verify OK`. **وبوابةٌ بثلاثة أوضاع** (🧪 محاكاة · 🔵 امتثال ·
  🔴 إنتاج): المحاكاة ليست نجاحاً دائماً — وثيقةٌ يرفضها الفحص المحلي تُرجع `FAILED` —
  وحين لا تُبلغ البوابة تكون النتيجة `502 EINVOICE_GATEWAY_UNREACHABLE` بعبارةٍ صريحة،
  لا خطأ 500 مبهم. **والست وثائق لاختبار الربط** بالبيانات الثابتة في الديسكتوب
  (UUID `8d487816…`، PIH = تجزئة البداية، «قلم رصاص» ×2 بسعر 2.00، 4.00 + 0.60 = 4.60،
  والعميل «Acme Widget's LTD 2»)، بأنواعها 388/383/381 × 0100000/0200000 وحالاتها
  CLEARED/REPORTED، وفحصٍ محليٍّ يغلق الحساب ويطلب الرقم الضريبي للمنشأة — فمؤسسةٌ لم
  تُكمل بطاقتها ترى «Standard Invoice compliance check failed.» وأسبابها. والترتيب
  محفوظ بعبارات الديسكتوب: «يجب إدخال OTP» · «يجب عليك إنشاء CSR أولاً!» · «يجب إصدار
  شهادة الامتثال أولاً» · «يجب إكمال إعدادات الربط أولاً» · «تم الحفظ» · «تم بنجاح» ·
  «تم الإيقاف بنجاح» · «تم التشغيل بنجاح». الأسرار مشفّرة `aes-256-gcm` ومقنّعة،
  والمفتاح الخاص **يُعطى مرة واحدة**، وتوليد شهادةٍ جديدة **يُلغي** الشهادات المصدَّرة
  كما يفعل `SaveCSR` بـ`DELETE FROM ZatcaCredential` (L511). وشاشة `/settings/zatca`
  بتسميات النافذة كلها، وقائمةُ الخطوات الخمس، والست وثائق بعد آخر اختبار.
  `apps/api/test/einvoicing-zatca-onboarding.spec.ts` (**18** اختباراً) و
  `scripts/verify-einvoice-zatca.mjs` (**64** نقطة تحقّق حيّة، ثلاث تشغيلات متتالية
  خضراء، وخطّ أساس يُعاد: الإعدادات وبطاقة المنشأة تعودان كما كانتا).
  **886** اختبار API (كان 868) · 36 staff · 71 contract · tsc وlint أخضران. ومؤجَّل عن
  قصد: ☁️ Load Data (يقرأ ملفّين من جهاز الكاشير)، و🏗️ Industry (لا عمودَ للنشاط
  التجاري في بطاقة المنشأة بعد — ويُبلَّغ عنه تحذيراً)، وربط مسار الإرسال الحالي
  بالبيئة المحفوظة (جاء في الجزء الثاني)، والأجزاء 4-5 (مصر · التكاملات).

* **المرحلة 11 — الفاتورة الإلكترونية، الجزء الثالث: 📊 حالة المزامنة**
  (`Form_WPF/frmInvsSyncStatusZatca.xaml` (559) + `.xaml.cs` (1165) ·
  `Reports/rptInvSumByClient.repx` · `Class/InvoiceOper.cs` `GetInvoiceTypeAr` (L346)
  و`GetCustomerTaxType` (L302)). سؤال الكاشير في آخر النهار: **أيّ هذه الفواتير قبلتها
  زاتكا؟** صارت النافذة **تقريراً مسجّلاً في محرّك التقارير** (`einvoice-sync-status`)
  لا شاشةً مكتوبةً وحدها: الأعمدة الأحد عشر نفسها (م · ID · الفرع · نوع الفاتورة · رقم
  الفاتورة · التاريخ · العميل · المستخدم · الصافي · الرسالة · حالة المزامنة، و«المستودع»
  و«نوع العملية» مخفيّان كما يخفيهما `Visible="False"`)، والمرشّحات نفسها (🔄 حالة
  المزامنة: 🔵 الكل · ✅ مرسل · ❌ غير مرسل، و📋 نوع الفاتورة: مبيعات · نقطة بيع ·
  إشعار · مقاولات · أندرويد، و📅 الفترة الزمنية بـ📌 كل الفترة أو من/إلى). **ولأنّها
  تقريرٌ مسجّل، صارت 🖨️ طباعة و👁️ معاينة تمرّان بمحرّك الطباعة نفسه** — كما يمرّ
  `PrintReport` (L970) بـ`rptInvSumByClient.repx` بترويسة المنشأة وتذييلها وختمها
  و«أعده · راجعه · المدير» — **وصار 📊 تصدير Excel ملفّ `xlsx` حقيقياً من الخادم**
  لا `.csv` خلف اسم Excel كما يكتبه `ExportToCsv` (L1078). **و«الصافي» ثلاث بطاقات لا
  واحدة**: `RecalculateNetSummary` (L329) تحسب مجموعين — `sum` للفواتير و`sum1`
  للمرتجعات — و`BuildReportDataSet` (L1058) يطبع فرقهما وحده، فعُرضت الثلاثة كلها،
  ومجاميعها محسوبة من الصفوف المعروضة فلا تخالفها. **و«نوع الفاتورة» بمنطق
  `GetInvoiceTypeAr` نفسه**: عميلٌ له رقم ضريبي ⇒ «فاتورة ضريبية»، وبيعٌ نقدي ⇒ «فاتورة
  ضريبية مبسطة»، ومرتجعٌ أو إشعار ⇒ «إشعار دائن للفاتورة الضريبية (المبسطة)».
  **و«الرسالة» نصّ الهيئة**: غلطة الإرسال، ثم رسائل التحقّق والتحذير، ثم سبب التوقّف
  («الربط موقوف…»)، من **أحدث** صفّ إرسال لا من أول ما يصادفه `GetZatcaMessage` (L310).
  **و🔄 مزامنة ZATCA صار مساراً**: `POST /einvoice/sync` بصلاحية `einvoice.submit`
  يرسل ما اختاره الكاشير سطراً سطراً — `BuildZatcaResponse` لكل سطر (L527) — ويجيب
  `sent`/`failed`/`skipped` لكل واحد: المُرسلة والمسوَّدة صفّان **مُتجاوَزان** لا
  فاشلان، و⏸ إيقاف الربط يقولها بدل أن يصمت الزرّ كما يصمت خلف
  `if (MainSetting.ZatcaIntegerationActive)` (L396)، ولا وثيقة تُحفظ والربط موقوف.
  و«تمت العملية بنجاح ✅» عبارة النافذة نفسها (L563) حين تُقبل كلها، وإلا عددُ ما أُرسل
  وما لم يُقبل. **والصلاحيات ثلاث**: القراءة `reporting.view` (لأنّ الشبكة تقرير)،
  والإرسال `einvoice.submit`، والتصدير `reporting.export.execute` — مختبرة بأدوارٍ
  حقيقيّة (المحاسب يقرأ ويُرسل ولا يُصدّر، وأمين الصندوق لا يقرأ). وشاشة
  `/settings/zatca/status` بتسميات النافذة ومرشّحاتها وتحديد الصفوف وأزرارها.
  `apps/api/test/einvoicing-zatca-sync.spec.ts` (**16** اختباراً) و
  `scripts/verify-einvoice-zatca-sync.mjs` (**53** نقطة تحقّق حيّة في أحد عشر قسماً،
  ثلاث تشغيلات خضراء، كلها على 🧪 المحاكاة، وتُعيد الإعدادات إلى خطّ أساسها).
  **918** اختبار API (كان 902) · 36 staff · 71 contract · tsc وlint أخضران. ومؤجَّل عن
  قصد: 🚫 إلغاء الفاتورة و❌ رفض الفاتورة (نداءان على وثيقة ETA — الجزء الرابع)،
  وتوقيع XAdES المغلَّف وكتلة `UBLExtensions`.

* **المرحلة 11 — الفاتورة الإلكترونية، الجزء السادس: 📱 إرسال الفاتورة عبر واتساب**
  (`Form_WPF/frmInvSale.xaml` L1190 «💬 واتساب» · `frmInvSale.xaml.cs`
  `SendWhatsapp_Click` L3124-L3126 ثم `printwhatsapp` L3128-L3199 ·
  `Class/WhatsAppSender.cs` (267) · `Class/Session.cs` L12-L31). **كان الديسكتوب يرسل
  الفاتورة من متصفّح الكاشير**: `WhatsAppSender` يفتح Chrome على ملفّ تعريفٍ دائم
  (`%LocalAppData%\MyApp\chrome-profile`، L43-L48)، فيجب أن يكون أحدهم قد مسح رمز QR
  (`InitializeWhatsAppAsync` L66)، ثم ينتظر صندوق الكتابة خمساً وعشرين ثانية (L119-L142)
  ويكتب الرسالة (L151-L153) ويمرّر ملفّ PDF إلى `input[type='file']` (L188)، ولا يسجّل
  شيئاً: صندوق رسالة يمحوه «موافق». **فصار الاتصال إعداداً يُضبط مرّة**: ترحيل `0065`
  يضيف `whatsapp_settings` (صفٌّ واحد لكل مستأجر: تفعيل · «عنوان الواتساب» Phone Number
  ID · «الرمز» مشفّراً بـ`aes-256-gcm` ولا يُقرأ إلا مقنَّعاً · «رمز الدولة» · 📎 · 🧪)
  و`whatsapp_messages` — **السجلّ الذي لم يكن له**: الرقم · النصّ · اسم المرفق وحالته ·
  معرّف ميتا · الخطأ، فيُجاب «هل وصلت الفاتورة؟» من جدول لا من ذاكرة كاشير. **والنداء
  على Cloud API كما نُشرت** (Graph `v21.0` على `https://graph.facebook.com`): رسالة نصّ،
  ثم `POST /{phone-number-id}/media` لرفع الملفّ، ثم رسالة مستند، و`GET
  /{phone-number-id}` ل🧪 اختبار — وهو سؤال «هل هذا الرقم لنا وهذا الرمز صالح له؟» الذي
  لم يكن للديسكتوب جوابٌ عنه. **والتحية تحية الديسكتوب نصّاً**:
  «🧾 مرحباً {custName}، هذه فاتورتك رقم {invRef} من {foundName}» (L3182-L3183) باسم
  المنشأة من `companyProfiles.nameAr` كما كان من `Common.FoundationInfoDT.Rows[0]["nameA"]`.
  **والرقم بقاعدته نفسها**: `0551234567` → `966551234567` بقاعدة
  `if (!text.StartsWith("966")) text = "966" + text.TrimStart('0');` (L113-L116)، إلا أنّ
  رمز الدولة صار إعداداً لا ثابتاً. **و🧪 محاكاة مفعلةٌ أبداً في الاختبارات**: لا رقم
  حقيقي يُنادى، و«❌ الرقم غير مرتبط بحساب WhatsApp أو لم يتم تحميل المحادثة.» (L142)
  يُسجَّل صفّاً لا صندوقاً. **وخمسة مسارات بصلاحيّتين**: `GET/PUT /whatsapp/settings`
  و`POST /whatsapp/test` بـ`tenant.settings.manage` (الضبط لمن يملك الإعدادات)، و
  `POST /whatsapp/send` و`GET /whatsapp/messages` بـ`sales.view` (الإرسال لمن يرى
  الفاتورة — المحاسب والكاشير كلاهما). **وسبعة رفضٍ بعباراتها**: فاتورة غير مرحَّلة 409
  `SALES_INVOICE_NOT_POSTED` «لا يمكن إرسال الفاتورة قبل ترحيلها — رحّلها أولاً.» ·
  بوابة موقوفة 409 `WHATSAPP_DISABLED` «الرجاء تفعيل الإرسال عبر واتساب.» · بلا جوال
  422 `WHATSAPP_PHONE_MISSING` «❌ لا يوجد رقم جوال للعميل» · رقمٌ تالف 422
  `WHATSAPP_PHONE_INVALID` · غير مضبوطة 404 `WHATSAPP_NOT_CONFIGURED` · فاتورة غير
  موجودة 404 · رمزٌ لا يُفكّ 500 `SECRET_DECRYPT_FAILED`. **وشاشتان**:
  `/settings/whatsapp` بتسميات النافذة وصندوق «Logging»، وبطاقة «💬 واتساب» بسجلّها على
  نافذة الفاتورة نفسها. `apps/api/test/whatsapp-invoice.spec.ts` (**17** اختباراً) و
  `scripts/verify-whatsapp.mjs` (**71** نقطة تحقّق حيّة في أحد عشر قسماً، ثلاث تشغيلات
  خضراء، تُعيد الإعدادات إلى خطّ أساسها). **951** اختبار API (كان 934) · 36 staff · 71
  contract · tsc وlint وbuild أخضران. **وملفّ الفاتورة نصٌّ عربي UTF-8 لا PDF**: لا
  مكتبة PDF في المشروع، وتصديرٌ على الخادم لملفٍّ عربي يحتاج خطّاً يشكّل الحروف،
  والطباعة عندنا صفحة HTML يطبعها المتصفّح — و`text/plain` نوع مستندٍ تقبله ميتا.
  ومؤجَّل: توقيع XAdES المغلَّف وكتلة `UBLExtensions`.

* **المرحلة 11 — الفاتورة الإلكترونية، الجزء الخامس: 💳 بوابات الدفع (جيديا ·
  NeoLeap)** (`Form_WPF/frmSettings.xaml` L1726-L1831: تاب «إعدادات جيديا» و`GroupBox`
  «NeoLeap» فيه · `frmSettings.xaml.cs` `BtnSaveGedia_Click` (L2456) · `testGedia`
  (L2498) · `BtnTestGedia_Click` (L2513) · `Btnsavneoleap_Click` (L2535) ·
  `Btntestneoleap_Click` (L4047) · `Class/Geidea.cs` (57) · `Class/NeoleapService.cs`
  (165) · `frmPOSBill.xaml.cs` L460-L492 · `frmPOSPay.xaml.cs` L428-L441). **كان
  الديسكتوب يخصم البطاقة في أثناء حفظ الفاتورة ولا يسجّل شيئاً**: يطبع إيصالاً، ويترك
  طريقة الدفع في الفاتورة تقول «شبكة». فحُفظ صفّاه (`GediaSetting` و`SettingNeoleap`)
  كما هما — «تفعيل الدفع عن طريق جيديا» · «طباعة ايصال» · «المنفذ» · «المبلغ» ·
  «Token» · «Logging» — وأُضيف **السجلّ الذي لم يكن له**: ترحيل `0064` يضيف
  `payment_gateway_settings` بمفتاح `(tenant_id, provider)` و`payment_gateway_transactions`
  بمرجعٍ فريد لكل `(مستأجر · بوابة)`، حتى لا تكون الضغطتان على 💳 خصمين. **وجيديا
  تُنادي على مواصفتها المنشورة**: `POST /payment-intent/api/v2/direct/session` لفتح
  الجلسة بتوقيع `base64(HMAC-SHA256(كلمة السرّ، المعرّف العام ‖ المبلغ بعشرتين ‖ العملة ‖
  المرجع ‖ الطابع))`، و`GET /pgw/api/v1/direct/order?MerchantReferenceId=…` لسؤالها،
  وصفحة الدفع `…/hpp/checkout/?<sessionId>` — فالجلسة تبقى ⏳ «بانتظار الدفع» حتى يدفع
  صاحب البطاقة، و🔄 `POST /payment-gateways/transactions/:id/refresh` يسألها مرّةً أخرى.
  **ونيوليب على عقدها كما في ملفّها**: طلب `SALE` واحد (`requestType` · `merchantToken` ·
  `amount` · `ecrRef` · `ecrToken` · `printFlag` · `cashBack`) وجوابه يُقرأ بمنطق
  `ParseResponse` نفسه — `ErrorMsg`، ثم `TransactionResult.StatusCode` `00` مقبولة ·
  `01` مرفوضة · `02` ملغاة — ويُخرج `ApprovalCode` · `RRN` · `STAN` ·
  `CardScheme.English` · `PAN` (مقنَّعاً `****4242`) · `TransactionType.English`؛
  أمّا النقل فكان داخل `neoleapconnector` المترجَمة، فصار عنواناً يُضبط، و«المنفذ»
  يبنيه (`http://127.0.0.1:<المنفذ>`)، ولا مسار حالة يُخترع لأنّ الجهاز يجيب في الحال.
  **و🧪 Simulation مطفأٌ أبداً في الاختبارات** (كما في زاتكا): لا بوابة تُطلب ولا بطاقة
  تُخصم، وجواب صاحب البطاقة يُقرَّر من بادئة `ecrRef` (`DECLINE-` · `CANCEL-` ·
  `ERROR-` · `UNKNOWN-` · `PENDING-`) — السبيل الوحيد لاختبار الرفض بلا بطاقة.
  **والمقبولة تُقيَّد مرّةً واحدة** عبر `SalesService.addPayment` بالوسيلة `card`
  ومفتاح التكرار نفسه، ثم يُوسَم الصفّ `settled`، فلا تُدفع الفاتورة مرتين وإن أُعيد
  السؤال. **والمرفوضة تُسجَّل ولا تُبتلع**: «العملية مرفوضة، يرجى إعادة الدفع» كانت
  صندوقَ رسالةٍ يمحوه «موافق»، وصارت صفّاً بكلمة البوابة (`Declined` ·
  `Cancelled or Error` · «تعذّر الوصول إلى بوابة NeoLeap») وبردّها الخامّ بعد حذف السرّ
  منه. **ستة مسارات بثلاث صلاحيّات**: `GET /payment-gateways` و`PUT …/:provider` و
  `POST …/:provider/test` بـ`pos.config.manage` (الإعدادات للمدير)، و
  `POST …/:provider/sale` و`POST …/transactions/:id/refresh` بـ`sales.invoice.pay`
  (التحصيل للكاشير)، و`GET …/transactions` بـ`sales.view` (السجلّ لمن يقرأ) — مختبرة
  بأدوارٍ حقيقيّة (المحاسب يقرأ ولا يُحصِّل، والكاشير يُحصِّل ولا يضبط البوابة).
  وثمانية رفضٍ بعباراتها: بوابة موقوفة 409 `PAYMENT_GATEWAY_DISABLED` · مبلغٌ غير موجب
  422 · فاتورة غير مرحَّلة 409 · أكثر من المتبقي 422 · مرجعٌ مكرَّر 409 · منفذٌ خارج
  النطاق 422 · بوابة مجهولة 422 · مفتاحٌ لا يُفكّ 500. وشاشة
  `/settings/payment-gateways` بتسميات النافذة وبطاقتيها وصندوق «Logging» و«📜 آخر
  العمليات». `apps/api/test/payment-gateways.spec.ts` (**16** اختباراً) و
  `scripts/verify-payment-gateways.mjs` (**64** نقطة تحقّق حيّة في أحد عشر قسماً، ثلاث
  تشغيلات خضراء، تُعيد إعدادات البوابتين إلى خطّ أساسها). **934** اختبار API (كان 918) ·
  36 staff · 71 contract · tsc وlint وbuild أخضران. **وقرارٌ صريح: 🇪🇬 مصر
  (`frmEtaSetting` · `EtaService` · `EtaReciptService`) خارج النطاق** — النظام موجّهٌ
  اليوم للسعودية، ويتبعه نداءا 🚫 إلغاء الفاتورة و❌ رفض الفاتورة لأنّهما على وثيقة
  ETA؛ ومصادرها مثبتة في الوثيقة تُقرأ يوم تُطلب. ومؤجَّل: توقيع XAdES المغلَّف وكتلة
  `UBLExtensions`.

* **المرحلة 11 — الفاتورة الإلكترونية، الجزء الثاني: 🧾 الإرسال والتوقيع والسلسلة**
  (`Form_WPF/frmSentEinvoice.xaml` (358) + `.xaml.cs` (304) · أعمدة
  `frmInvsSyncStatusZatca.xaml` (559) · `Class/ZatcaService.cs` `IntegrateInvoice`
  (L78-L410) و`GetEncodedInvoiceQRCode` (L460) و`LoadZatcaCredential` (L430) ·
  `Class/InvoiceOper.cs` `SendZatca` (L2209)). **كان الإرسال فرعاً واحداً خلف متغيّر
  بيئة**: الوثيقة تُبنى وتُجزَّأ وتُوقَّع، ثم تُترك إن لم تكن بوابةٌ مضبوطة. فصار
  الإرسال درجةً كاملة على البيئة المحفوظة في «⚙️ إعدادات الربط الضريبي»: **الضريبية
  `0100000` إلى التخليص** (`POST /invoices/clearance/single` بترويسة
  `Clearance-Status: 1`) فتعود بوثيقةٍ مُعادة التوقيع تُحفظ في `cleared_invoice`،
  **ويرمزُها يُقرأ منها** بمسار XPath الديسكتوب نفسه (L474-L477: الوسم
  `AdditionalDocumentReference` الذي `cbc:ID`ـه `QR`) لا من وثيقتنا؛ **والمبسّطة
  `0200000` إلى الترحيل** (`/invoices/reporting/single`) فتحفظ رمزها المحسوب، لأن الهيئة
  لا تُعيد وثيقةً في الترحيل. و**ترحيل `0063`** يضيف إلى `einvoice_submissions` — وهي
  صفّ `ZatcaResponse` في الديسكتوب — ثلاثة أعمدة: `chain_index` (عدّاد ICV: كان داخل
  `jsonb` فلا يُرتَّب عليه ولا يُعرض على مفتّش)، و`authority_status` (كلمة الهيئة
  نفسها `CLEARED`/`REPORTED` كما في `ZatcaResponse.Status` L538-L540)، و
  `cleared_invoice` (الوثيقة التي يطلبها المفتّش)، وفهرساً على `(tenant_id,
  created_at DESC)` لأن الشبكة تصفّح بالأحدث أولاً. **والسلسلة** تسحب التجزئة السابقة
  والعدّاد في استعلامٍ واحد بـ`SELECT … FOR UPDATE`: لا فاتورتان تشتركان في عدّاد.
  **والمقبولة لا تُرسل مرتين**: إرسالٌ ثانٍ أو إعادةٌ لفاتورةٍ مقبولة =
  `409 EINVOICE_ALREADY_ACCEPTED` «تم إرسال هذه الفاتورة مسبقاً — استخدم «🔁 إعادة
  الإرسال» إن فشل الإرسال.»؛ **والفشل لا يُسقط البيع**: الوثيقة محفوظة أصلاً، فتُكتب
  الغلطة على الصفّ ويُرجَع `201` بحالة `failed`؛ **و⏸ إيقاف الربط** يوقف عند
  الوثيقة الموقّعة (`signed` + `LINK_PAUSED`) فإذا شُغِّل الربط أكملها 🔁 إعادة
  الإرسال بذات التجزئة وذات البايتات، رافعاً `attempts` وحده. و**صار للشبكة ثلاثة
  مسارات**: `GET /einvoice/filings` (🔍 عرض بـ«رقم الصفحة:» و«حجم الصفحة:»، موصولة
  بالفاتورة: رقمها · نوعها · عميلها · فرعها · مستخدمها · صافيها)، و
  `GET /einvoice/filings/:id` (📄 بيانات الفاتورة: الوثيقتان والوسوم الثمانية بأسمائها
  ومكانها في السلسلة)، و`GET /einvoice/chain`. و`inspectInvoiceXml()` يفحص الوثيقة قبل
  أن تُتلى: مجاميعٌ لا تُغلق تُسقط الإرسال، ورقمٌ ضريبيٌّ غيرُ سعوديّ الشكل تحذيرٌ لا
  منع. و`cbc:PrepaidAmount` دائماً `0.00` — لا حقلَ مدفوعاتٍ مقدَّمة في نموذج
  الديسكتوب، وإعلانُ نقد الصندوق مدفوعاً مقدَّماً يُصفّر `PayableAmount`. **حقيقةٌ
  غيّرت الترتيب**: `.xaml.cs` لا يكلّم زاتكا — مساره `api/v1.0/documents/recent` على
  `api.invoicing.eta.gov.eg` (L62 وL75)، و`UUID` و`Public URL` حقّان من حقوق وثيقة
  **ETA**، و🚫 إلغاء الفاتورة و❌ رفض الفاتورة نداءان مصريّان — فالقائمة وأزرارها هنا،
  والزرّان إلى الجزء الرابع. وشاشة `/settings/zatca/sent` بتسميات النافذة وأعمدة
  `frmInvsSyncStatusZatca` (م · رقم الفاتورة · نوع الفاتورة · التاريخ · العميل · الفرع ·
  المستخدم · الصافي · حالة المزامنة · الرسالة · تفاصيل) ومرشّحاتها (🔵 الكل · ✅ مرسل ·
  ❌ غير مرسل · من/إلى · 🔄 حالة المزامنة ZATCA) و🖨️ طباعة و🔁 إعادة الإرسال.
  `apps/api/test/einvoicing-zatca-filing.spec.ts` (**16** اختباراً) و
  `scripts/verify-einvoice-zatca-filing.mjs` (**53** نقطة تحقّق حيّة في أحد عشر قسماً،
  ثلاث تشغيلات متتالية خضراء، تعمل كلها على 🧪 المحاكاة فلا يخرج منها نداءٌ إلى هيئة،
  وتُعيد الإعدادات إلى خطّ أساسها ولا تُلغي شهادةً قائمة). **902** اختبار API (كان
  886) · 36 staff · 71 contract · tsc وlint أخضران. ومؤجَّل عن قصد: 🚫 إلغاء الفاتورة
  و❌ رفض الفاتورة (نداءان على وثيقة ETA — الجزء الرابع)، و📊 حالة المزامنة بوصفها
  نافذةً مستقلّة (الجزء الثالث)، وتوقيع XAdES المغلَّف وكتلة `UBLExtensions`.

* **المرحلة 10 — التقارير، الجزء السادس: 💰 تقارير الخزينة والرواتب والمستخدمين**
  (`Form_WPF/frmRptKhzna.xaml` «حركة الصندوق» (558/538) · `frmRptSalary.xaml` «تقرير
  الرواتب» (489/190) · `frmRptReseved.xaml` «تقرير الرواتب المستحقة» (393/225) ·
  `frmrptUsersRecords.xaml` «سجلات المستخدمين» (313/168) · `frmRptRentInvoices.xaml`
  «تقرير فواتير التأجير» (562/716)). **خمسة تقارير** — «حركة الصندوق» كشفاً بسطر
  «رصيد سابق» يفتح الفترة ورصيدٍ متحرك على كل سطر وبطاقتي «⚖️ الرصيد الإجمالي» و«📅
  رصيد الفترة المحددة»، وحسابُ الصندوق مأخوذٌ من الخزينة نفسها لا بمطابقة الاسم كما في
  `frmRptKhzna.xaml.cs` L159-L164؛ و«تقرير الرواتب» بإذن صرفٍ لكل سطر حيث «💰 الإجمالي =
  الصافي + الخصومات» و«إجمالي الرواتب» مجموعُ الصوافي (L104-L113)؛ و«تقرير الرواتب
  المستحقة» بمسيّرٍ لكل سطر (رقم سنده قيدُه، وملاحظاته سببُ العكس، وعدّاد موظفيه
  ومستحقه من شبكة التفاصيل التي يفتحها الديسكتوب بزر «👁️ عرض»)؛ و«سجلات المستخدمين»
  من سجلّ التدقيق (`Log4NetLog`) بجهاز المنادِي وعمليته ومستخدمه؛ و«تقرير فواتير
  التأجير» بثلاثة بنود live — «تأجير» فاتورةٌ مُرحَّلة، و«معلق» لم تُرحَّل، و«حجوزات»
  حجزٌ بلا فاتورة — وبطاقات «إيرادات · مرتجع · الصافي» على قاعدة `CalcIncome`
  (L258-L274: 1 و3 إيراد، و2 مرتجع، و4 خارج الحساب). `apps/api/test/report-treasury-hrm.spec.ts`
  (**9** اختبارات) و`scripts/verify-reports-treasury-hrm.mjs` (**62** نقطة تحقّق حيّة،
  أربع مراتٍ متتالية بصفر فشل، كل رقمٍ فارقٌ عن خطّ أساس، والسندات تُلغى والقيود تُعكس،
  وما لا رجعة فيه يُرفض: `SALARY_PAYMENT_POSTED` · `EMPLOYEE_ON_PAYROLL` ·
  `ACCOUNT_POSTED`). **837** اختبار API (كان 828) · 36 staff · 71 contract · tsc وlint
  أخضران. ومؤجَّل عن قصد: `frmInvRptType` «🖨️ افتراضي طباعة الفواتير» (نافذة إعدادٍ
  تكتب `UPDATE sett SET val = 1|2` — إلى الجزء السابع)، و«إجمالي الفترة:» (تسميةٌ بلا
  صندوق قيمة عند الديسكتوب نفسه)، وفلتر «📱 الجوال»، و`Marine.IS_InPlan` علماً ثابتاً.

* **المرحلة 10 — التقارير، الجزء الخامس: 📒 تقارير المحاسبة**
  (`Form_WPF/frmRptBalances.xaml` «أرصدة الحسابات» (540/662) · `frmRptEntries.xaml`
  «القيود اليومية» (751/788) · `frmRptIncomeStatement.xaml` «أرباح وخسائر حسابات رئيسية»
  (510/637) · `frmRptCostCenter.xaml` «تقرير مراكز التكلفة» (560/842) ·
  `frmTaxRptPeriod.xaml` «إقرار ضريبي» (910/952)). **ستة تقارير** — «أرصدة الحسابات»
  بعشرة أعمدة و**صيغة الرصيد من وجهين** (`حركة = max(مدين − دائن، 0)`، ثم `ختامي =
  افتتاحي + حركة`، ثم تصفيةٌ ثانية تُبقي وجهاً واحداً) و«الحساب الرئيسي» شجرةً
  (`accounts.path <@ <المختار>` سيرُ `GetParent` في `ParentCode`)، و«القيود اليومية»
  بسبعة أعمدة وستة عشر نوع قيد من `EntryTypes` وحالةٍ تقرأ «لاغي» من القيد العكسي،
  و«🧾 تفاصيل القيد» بسبعة أعمدة وإجمالي المدين والدائن والفرق، و«أرباح وخسائر حسابات
  رئيسية» بـ`FinalAcc = 2` (`accounts.type IN ('revenue','expense')`) مُجمَّعةً على
  الآباء مع سطر «قيمة مخزون بضاعة آخر المدة حتى هذا التاريخ» و«صافي أرباح العام»،
  و«تقرير مراكز التكلفة» بأربعة عشر عموداً — «تجميعي» بكل الأبناء و«تفصيلي»
  بالأبناء المباشرين أو المركز نفسه إن لم يكن له أبناء — و«الإقرار الضريبي» بثلاثة عشر
  بنداً (ستة مبيعات وستة مشتريات وصافي الضريبة) من `TaxRptPeriod.repx`، حيث «سندات
  الصرف» تقرأ سند الصرف **والقيد الضريبي** (`is_vat`) مفروزاً بحساب الضريبة من
  `tax_groups.vat_account_id`، و«ربع سنة» و«شهري» يكتبان الفترة فوق صندوقي التاريخ كما
  تفعل `SetDate`. `apps/api/test/report-accounting.spec.ts` (**12** اختباراً) و
  `scripts/verify-reports-accounting.mjs` (**77** نقطة تحقّق حيّة، ستّ مراتٍ متتالية
  بصفر فشل، كل رقمٍ فارقٌ عن خطّ أساس، والقيود تُعكس لا تُلغى، والحسابات والمراكز التي
  حملت حركة تُرفض حذفها: `ACCOUNT_POSTED` · `ACCOUNT_HAS_CHILDREN` ·
  `COST_CENTER_IN_USE`). **828** اختبار API (كان 816) · 36 staff · 71 contract · tsc
  وlint أخضران. ومؤجَّل عن قصد: «المبيعات المحلية الخاضعة للنسبة الصفرية» وبندا
  «الاستيرادات» (النافذة لا تملؤها أصلاً)، و`cost_center.type = 2`، وأزرار «تفاصيل».

* **المرحلة 10 — التقارير، الجزء الرابع: 📚 تقارير المخزون والأرقام التسلسلية**
  (`Form_WPF/frmRptInventory.xaml` «📋 الفواتير» (580/769) · `frmRptItemsActivity.xaml`
  «مادة باجمالي الحركات» (824/964) · `frmRptItemsActivityDetailed.xaml` «حركة صنف
  تفصيلي» (829/1195) · `frmRptItemsExpiration.xaml` «صلاحية المواد» (599/448) ·
  `frmRptSerialNo.xaml` «حركة الأرقام التسلسلية» (516/491) ·
  `frmRptSerialNoSummary.xaml` «أرصدة الأرقام التسلسلية» (432/324) ·
  `frmRptProducedItems.xaml` «تقرير مواد المنتجة» (481/376)). **ثمانية تقارير** —
  «تقرير مستندات المخزون» بثمانية أنواع عملية من `cmbOperation` (مناقلة مرسلة · مناقلة
  مستلمة · بضاعة أول مدة · أمر توريد · أمر صرف · أمر إنتاج · طلب بضاعة · تسوية جردية)،
  و**«مادة باجمالي الحركات» بثلاثة عشر عمود حركة وصيغة الرصيد نفسها** (`100+20−5−10+2−1
  −25+3−2+7−4−8 = 77`، كل عمودٍ حجم حركة والإشارة من اسمه) مع «متوسط التكلفة» من رصيد
  المخزون و«إجمالي التكلفة» = الرصيد × متوسط التكلفة، و«حركة صنف تفصيلي» برصيدٍ متحرك
  واسم نوع الفاتورة ورقم المرجع و«🔄 نوع العملية» و«📋 أنماط الفواتير»، و«صلاحية المواد»
  من `dbo.ItemsExpirationStock` (`AlterDb.txt:2157`) بباقي سنوات وأشهر وأيام، و«حركة
  الأرقام التسلسلية» و«أرصدة الأرقام التسلسلية» من `funCalculateSerialNoSummary`
  (`AlterDb.txt:3615`) — العدد رصيدٌ لا عدد صفوف: ما استُهلك خرج وما أُرجع عاد —
  و«تقرير مواد المنتجة» (🏭 المواد المنتجة) و«مكونات المواد المنتجة» (🔧 المكونات) بأربع
  بطاقات (إجمالي المواد · الرصيد · التكلفة · البيع). `apps/api/test/report-inventory.spec.ts`
  (**10** اختبارات) و`scripts/verify-reports-inventory.mjs` (**150** نقطة تحقّق حيّة، كل
  رقمٍ مستأجَرٍ واسع فارقٌ عن خطّ أساس، والتنظيف في `finally`، وما لا يُلغى مفحوصٌ أنه
  يُرفض: أمرُ إنتاجٍ مكتمل `PRODUCTION_ORDER_INVALID_STATUS` ومناقلةٌ مستلمة
  `TRANSFER_INVALID_STATE`). **816** اختبار API (كان 806) · 36 staff · 71 contract ·
  tsc وlint أخضران. ومؤجَّل عن قصد: 👤 المستخدم في «مستندات المخزون»، و«المجموع · الخصم
  · الإجمالي · الضريبة · الصافي» لمستندات المخزون (السحابة تحفظ تكلفةً وكمية لا سعراً
  وضريبة)، و«أمر توريد» و«طلب بضاعة» — وثيقتان في السحابة لا تُحرّكان الرصيد.

* **المرحلة 10 — التقارير، الجزء الثالث: 🧾 تقارير الفواتير والإشعارات والحركة اليومية**
  (`Form_WPF/frmRptInvSalesDetails.xaml` «تقرير فواتير المبيعات» (1143/1513) ·
  `frmRptInvSalesDetailsPos.xaml` «تقرير مبيعات الفواتير» ·
  `frmRptInvSalesDetailsPosAndroid.xaml` «تقرير مبيعات أندرويد» ·
  `frmRptInvNotfic.xaml` «تقرير الإشعارات» · `frmRptInvPurchaseDetails.xaml`
  «تفاصيل فواتير المشتريات» · `frmRptDailySales.xaml` «تقرير مبيعات حسب اليوم» ·
  `frmRptDailyProcess.xaml` «تقرير الحركة اليومية» · `frmRptInvAnalysis.xaml`
  «تقرير تحليل المبيعات»). **سبعة تقارير: صفّ فاتورةٍ واحد (21 عموداً: نوع الفاتورة ·
  رقم الفاتورة · 🔗 رقم المرجع · التاريخ · الوقت · نوع الدفع · المدفوع · العميل · نقدي ·
  شبكة · المجموع · الخصم · الإجمالي · الضريبة · ضريبة إضافية · إجمالي الضريبة · الصافي ·
  المستودع · الفرع · المندوب · المستخدم) تتقاسمه ثلاث نوافذ** — الفواتير (`inv_type`
  2/3/20) والإشعارات (21/22) — و«تفاصيل فواتير المشتريات» (17 عموداً بـ«المدفوع»
  و«المتبقي»)، و«مبيعات حسب اليوم» (الرقم · التاريخ · اليوم · الإجمالي قبل الضريبة ·
  الضريبة · الإجمالي) باسم اليوم من `ToString("ddd", ar)`، و«الحركة اليومية» بست
  حركاتٍ مرتَّبة (`DoProcess`: مبيعات · مرتجع مبيعات · نقطة البيع · مرتجع نقطة البيع ·
  مشتريات · مرتجع مشتريات) ونقديها وآجلها، و«تحليل المبيعات» بثمانية أبعاد
  (المخزن · العميل · الصنف · مندوب البيع · المستخدم · الأيام · الشهور · مجموعة الصنف)
  ونسبتيه. **«📊 ملخص النتائج» عشر بطاقات بالإشارات: `Calc(x) = purchases.Sum(x) −
  returns.Sum(x)`** — المرتجع يخصم، وكذلك الإشعار الدائن (`credit_note` سالب و
  `debit_note` موجب). و«نوع الدفع» نصّ `GetPaymentText` (آجل · نقدي · شبكة · متعدد)،
  و«🔗 رقم المرجع» يُقرأ من رابط الفاتورة (`reference_invoice_id`) لأن `inv.Reff_No`
  صندوقٌ نصّي لا مقابل له. `apps/api/test/report-invoices.spec.ts` (**15** اختباراً)
  و`scripts/verify-reports-invoices.mjs` (**159** نقطة تحقّق حيّة، كل رقمٍ فارقٌ عن خطّ
  أساس، والتنظيف في `finally` إلا الفاتورة المسدَّدة التي تمنع قاعدة الدفاتر إلغاءها).
  **806** اختبار API (كان 791) · 36 staff · 71 contract · tsc وlint أخضران. ومؤجَّل عن
  قصد: أنواع `DoProcess2` (سندات القبض) و`FrmRptSalesChart` و🧑‍💼 المندوب في المشتريات
  و«رقم المرجع» نصّاً حرّاً.

* **المرحلة 10 — التقارير، الجزء الثاني: 📦 تقارير الأصناف**
  (`Form_WPF/frmRptItemsSalesDetails.xaml` «مبيعات الأصناف تجميعي» — وهي نفسها
  «مشتريات الأصناف تجميعي» بـ`OperType = 2` — و`frmRptItemsSalesDetailsPOS.xaml`
  و`frmRptItemsProfit.xaml` و`frmRptItemsProfitDetails.xaml` و`frmRptSalesByCategory.xaml`
  و`frmRptCategorySaleByDay.xaml`). **سبعة تقارير من ست نوافذ: «مبيعات الأصناف تجميعي»
  (رمز الصنف · الصنف · المجموعة · الكمية · صافي البيع) و«نقطة البيع» (المحصورة في
  `inv_type=3`) و«أرباح المواد تجميعي» (الكمية · متوسط التكلفة · صافي البيع · الربح ·
  نسبة الربح) و«أرباح المواد تفصيلي» (ستة عشر عموداً: الرقم · التاريخ · نوع العملية ·
  المستودع · المادة · الوحدة · الكمية · التكلفة · السعر · المجموع · الإجمالي · الخصم ·
  الربح · …) و«تقرير مبيعات الأصناف حسب المجموعة» (إجمالي الكمية · الإجمالي · الضريبة ·
  الصافي · الخصم) و«تقرير المبيعات اليومية للمجموعة» (الرمز · المجموعة · اليوم ·
  التاريخ · الإجمالي) و«مشتريات الأصناف تجميعي».** وكل صنفٍ صافٍ من مردوده
  (`saleVal − retSaleVal + posVal − posRetVal`)، وصنفٌ لا حركة له لا يظهر
  (`if (!hasMovement) continue;` — أيّ حركة، لا صافٍ غير صفر، بخلاف الجزء الأول).
  وخصمُ رأس الفاتورة موزَّعٌ **عند الحفظ** في `line.net` لا في التقرير، فصارت «الضريبة»
  تُقرأ من السطر لا مضروبةً في 15%. وصار `grandTotal` في المحرّك **بطاقةً أو قائمة
  بطاقات**: «💵 إجمالي صافي البيع» + «📦 إجمالي الكميات»، وخمس بطاقات في التفصيلي،
  والشريط المطبوع `(totals-strip)` يرسمها كلها. `apps/api/test/report-items-summary.spec.ts`
  (**14** اختباراً) و`scripts/verify-reports-items.mjs` (**126** نقطة تحقّق حيّة، أربع
  تشغيلات خضراء، كل رقمٍ فارقٌ عن خطّ أساس، والتنظيف في `finally` — حتى الفواتير
  تُبطَل كلها). **791** اختبار API (كان 777) · 36 staff · 71 contract · tsc وlint
  أخضران. ومؤجَّل عن قصد: 👤 المستخدم و🧑‍💼 المندوب (لا مرشِّح عضوية بعد)،
  والضريبة الإضافية، وزرّا «تفاصيل» و«📄 الفاتورة».

* **المرحلة 10 — التقارير، الجزء الأول: 📊 حركة المبيعات**
  (`Form_WPF/frmRptSalesInPeriod.xaml` «حركة المبيعات» و`Reports/RptSalesInPeriod1.repx`
  و`RptSalesInPeriod2.repx` و`header.repx`/`footer.repx`). **نافذةٌ ذات تبوبيْن يقرآن
  الوثائق نفسها: الأول «📊 إجمالي المبيعات» (رقم الصنف · الصنف · الكمية · الإجمالي)
  والثاني «🧾 عرض الفواتير» (رقم الحركة · رقم الفاتورة · نوع الفاتورة · التاريخ ·
  الوقت · آجل · نقدي · شبكة · الإجمالي · الضريبة · الخصم · الصافي)، وتحت كل شبكة
  «💰 إجمالي المبيعات:» — `txtSumSale` مجموعُ الصافي و`txtSumSale2` المبيعات ناقص
  المردودات.** وفلاترها: 🧾 نوع الفاتورة («مبيعات نقطة البيع» · «مبيعات عادية») و📅
  التواريخ و⏰ الوقت (HH:mm:ss) بجانب كل تاريخ؛ ورفضُها الأول «لا توجد عمليات
  بالجدول». فصار للتقريريْن تعريفان في سجلّ التقارير، وثلاث خصالٍ جديدة في المحرّك
  لم تكن فيه: `grandTotal` (💰 الرقم الواحد تحت الشبكة، من صفوف الشاشة نفسها، وعمودٌ
  مخفيّ يحمل إشارة المردود) و`emptyAr` (جملة التقرير الفارغ) و`signature`
  («أعده · راجعه · المدير»)، وصنفا مرشِّح جديدان: `time` و`invType`؛ و`GET
  /reports/print/:key` يطبع التقرير برأس المنشأة واسم «المستخدم» وتاريخ الطباعة.
  `apps/api/test/report-sales-movement.spec.ts` (**10** اختبارات)
  و`scripts/verify-reports-sales.mjs` (**59** نقطة تحقّق حيّة، أربع تشغيلات خضراء،
  وكل رقمٍ فيها فارقٌ عن خطّ أساس، والتنظيف في `finally`). **777** اختبار API (كان
  767) · 36 staff · 71 contract · 17 database · tsc وlint أخضران. ومؤجَّل عن قصد:
  `SettingPrint` (الطابعة وعدد النسخ والختم) إلى جزءٍ لاحق، وصور الرأس والتذييل.

* **المرحلة 09 — الوحدات الرأسية، الجزء التاسع: ⛵ المرسى — ➕ الإضافات**
  (`Form_WPF/frmAdditions.xaml` «📋 إضافات» — لوحتها «📋 إدارة الإضافات»، و«🎁
  الإضافات» في `Form_WPF/frmBookingM.xaml` «الحجوزات»). **أصغر نوافذ المرحلة، وأوحدُها
  التي لا تُملأ تعاريفها يدوياً في كل حجز: ثلاثة صناديق (🔢 الرقم — مقروء فقط — و📝
  الاسم و💰 القيمة) وثلاثة أزرار (➕ جديد · 💾 حفظ · 🗑️ حذف)، وشبكة تحتها بالأعمدة
  نفسها. وهي ما يملأ «🎁 الإضافات» في الحجز: `LoadAdditions` = `select id, Name from
  Additions where IsDeleted=0`، واختيارٌ منها يكتب «السعر» من `SalePrice`
  (`cmbAdditions_SelectionChanged`).** وحفظها: رفضٌ بلا اسم «يجب إدخال اسم الإضافة ⚠️»،
  وقيمةٌ فارغةٌ صفر، ثم `insert`/`update`، و«✅ تم الحفظ بنجاح» أو «✅ تم حفظ
  التعديلات بنجاح»؛ وحذفها: «يجب تحديد الإضافة المراد حذفها ⚠️» ثم تأكيد ثم `delete
  from Additions`. ترحيل 0060 يضيف `marina_additions` (الرقم · الاسم · القيمة، وحذفٌ
  ناعم) و`marina_booking_additions.addition_id` — `BookingAddition.AditionID`، فصار
  صفّ «🎁 الإضافات» يشير إلى تعريفه بدل أن ينسخ اسمه فقط. و«➕» على الشبكة يجمع كمّية
  إضافةٍ مكرَّرة على صفّها (`Quantity += quant`) ولا يفتح صفّاً ثانياً، و«الإجمالي» =
  الكمية × السعر، و«يجب إدخال الكمية  » بكميةٍ فارغة. `apps/api/test/marina-additions.spec.ts`
  (**8** اختبارات) و`scripts/verify-marina-additions.mjs` (**44** نقطة تحقّق حيّة، ثلاث
  تشغيلات خضراء، والتنظيف في `finally`). **767** اختبار API (كان 759) · 36 staff ·
  71 contract · 17 database · tsc وlint أخضران. ومؤجَّل عن قصد: «تعريف مالك»
  (`frmOwners`) إلى جزءٍ يبني بطاقته، والطباعة والتقارير إلى مرحلتها.

* **المرحلة 09 — الوحدات الرأسية، الجزء الثامن: 🛒 متجر سلة**
  (`Form_WPF/FrmSallah.xaml` «تكامل Salla API»، و`Class/SallaAPI.cs` و
  `Class/ProductsManager.cs` و`Class/OrdersManager.cs` و`Class/CustomersManager.cs` و
  `Class/SallaAuth.cs`). **النافذة عند الديسكتوب أربعة أزرار تُحصي ما تجلبه ولا تحفظه:
  «📦 جلب المنتجات» → «تم جلب {n} منتج.»، و«📋 جلب الطلبات» → «تم جلب {n} طلب.»،
  و«➕ إضافة منتج» → «تم إضافة المنتج بنجاح.»، و«📥 جلب الطلبات (2)» → `await Task.Run(() => { })`
  وصندوق رسالة. والرمزُ مموضعٌ في الكود (`new SallaAPI("2adcaba8-…")`)， وقوائم «متجر سلة»
  الثلاث في `Home.xaml` L394 معالجاتُها فارغة، ونوافذها (`FrmSallaProducts` · `FrmOrderSalla`
  · `FrmSallaBranchMapping`) معلَّقة وغير موجودة.** وقراءة `Class/ManagerOnline.cs` أثبتت
  أنه **ليس من سلة**: نبضةُ رخصةٍ (QLicense) وتاريخ ZATCA إلى
  `app-cloud-rmxb.onrender.com`. ترحيل 0059 يضيف `salla_products` (مرآة ما في المتجر) و
  `salla_orders` (كل طلبٍ برقمه البعيد وحالته ومرآته وارتباطه بفاتورته) — فصار للإحصاء
  مكانٌ يوضع فيه، وصار الرقم البعيد مانعاً لتكرار الاستيراد. والنقل (`SallaTransport`)
  محقون: `fetch` في الإنتاج، ومتجرٌ في الذاكرة حين يبدأ معرّف المتجر بـ `MOCK-` أو حين
  تُضبط `SALLA_TRANSPORT=mock` — وبه صار مسارٌ لا يُختبر عند الديسكتوب قابلاً للاختبار.
  و«➕ إضافة منتج» يُرسل صنفاً حقيقياً بالمفاتيح الأربعة التي يرسلها الديسكتوب
  (`name · price · quantity · description`) لا كائناً مثبَّتاً. `apps/api/test/salla-store.spec.ts`
  (**10** اختبارات) و`scripts/verify-salla.mjs` (**40** نقطة تحقّق حيّة، ثلاث تشغيلات
  خضراء، والتنظيف في `finally`). **759** اختبار API (كان 749) · 36 staff · 71 contract ·
  17 database · tsc وlint أخضران. ومؤجَّل عن قصد: منعُ تحويل منتجات المتجر إلى أصناف
  محلية، وربطُ الطلب بعميلٍ قائم، ومزامنة الكمية مع المخزون، و`ManagerOnline`.

* **المرحلة 09 — الوحدات الرأسية، الجزء السابع: ⛵ المرسى — 📋 بطاقة الفئة و⏰ فترات
  التأجير** (`Form_WPF/frmGroupM.xaml` «📋 بطاقة فئة» و`Form_WPF/frmAddPeriod.xaml`
  «⏰ فترات التأجير»). **الفئة هي تعريفة المرسى: منها يُسعَّر الحجز في `frmBookingM` —
  قيمة الساعة وقيمة النصف ساعة وعرضاهما بالدقائق؛ والسحابة كان لها فئةٌ باسمها ورمزها
  لا أكثر، ولا سعرَ فيها ولا مدة.** وحفظ `frmGroupM` ثلاثة أمور بنسقٍ واحد: صفُّ
  `GroupMarine`، ثم `delete RentPeriodSub where MGroupID=…`، ثم `ساعة` من قيمة الساعة
  و`نصف ساعة` من قيمة النصف ساعة — **في كل حفظة**، حتى لو كانت `frmAddPeriod` قد أضافت
  مدداً أخرى؛ و`frmAddPeriod` مرآتها: `delete` ثم كل صفٍّ من شبكة «⏰ المدة · 💵 السعر ·
  🎁 العرض · 🗑️». ورفوضها بلسانها: «ادخل الفئة» · «الفئة تم ادخالها مسبقا» · «يجب
  إستكمال البيانات ⚠️» · «هذه الفئة لها ارتباطات فرعية لايمكن حذفها» · «اختر الفئة ليتم
  حذفها». ترحيل 0058 يضيف على `vessel_groups`: 🔢 الرقم · الاسم (EN) · قيمة الساعة ·
  عرض الساعة (دقيقة) · قيمة النصف ساعة · عرض النصف ساعة (دقيقة) · رابط الصورة؛ وعلى
  `vessel_group_pricing`: ⏰ المدة (`RentPeriod.id`) وطولها بالدقائق و🎁 العرض — وقيد
  `period_kind` وُسِّع من أربع قيم إلى عشر لأن المدد عشر. و🖼️ صورة الفئة رابطٌ لا بايتات
  (`GroupMarine.image` عمود صورة، ولا مخزن ملفّاتٍ هنا). و⏰ المدة العشر ثابتةٌ في الخدمة
  كما ثبت نصّا «حجز عادي» و«بحر مفتوح» في الجزء السادس: لا نافذةَ للقائمة. و⏮ ◀ ▶ ⏭
  نُقلت كما هي — تقف عند الطرف (`if (!reader.HasRows) return;`) — وهي أول نافذةٍ تُنقل
  أسهمها. وأُضيف `DELETE /marina/vessels/{id}` (تقاعد مركب) لأن الفئة التي تحمل مركباً
  لا تُمحى، فبلا هذا الطريق لا مخرج. `apps/api/test/marina-group-cards.spec.ts`
  (**9** اختبارات) و`scripts/verify-marina-groups.mjs` (**58** نقطة تحقّق حيّة، ثلاث
  تشغيلات خضراء، والتنظيف في `finally`). **749** اختبار API (كان 740) · 36 staff ·
  71 contract · 17 database · tsc وlint أخضران. ومؤجَّل عن قصد: سلة إلى الجزء الثامن،
  والطباعة والتقارير إلى مرحلتها، وتعاريف `Additions` إلى جزءٍ يبني تعاريف المرسى.

* **المرحلة 09 — الوحدات الرأسية، الجزء السادس: ⛵ المرسى — الحجوزات والمخالفات**
  (`Form_WPF/frmBookingM.xaml` «الحجوزات» و`Form_WPF/frmViolationM.xaml` «المخالفات» و
  `Form_WPF/frmInvoiceRentSrch.xaml` «بحث الفواتير»). **الحجز عند الديسكتوب وثيقةٌ
  برقمها وتاريخها وقيمتها ومدتها وإضافاتها، ومجاميعها أربعة: «إجمالي الإضافات · الإجمالي
  · ضريبة 15% · الصافي» — والسحابة كان لها حجزٌ بلا رقم ولا حالة ولا نوع ولا مدة ولا
  قيمة، وإضافاتُه مبلغٌ واحد بلا كمية ولا سعر.** وما يحفظه الديسكتوب صفقةٌ واحدة تكتب
  ثلاثة جداول: `RentInvoice` ثم `Booking` ثم `delete BookingAddition` وإدراجها من جديد؛
  وأوّل ما ترفضه «يجب تحديد مدة الحجز» — ساعةٌ ودقيقة على صفر. والمجاميع `CalcuAll`
  بنصّها: `الضريبة = ROUND(الإجمالي × MainVAT ÷ 100, 2)` و`الصافي = الإجمالي + الضريبة`
  و`MainVAT` من `SettingGeneral where Inv_Id=4` (ضريبة المرسى وحدها، و«ضريبة 15%» في
  الملف ظلّها). والمخالفة أصغر: 🔢 الرقم (`MAX(id)+1`) · ⛵ المركب · ⚠️ نوع المخالفة ·
  ⏱️ مدة المخالفة (يوم) · 📝 ملاحظة، وثلاثة رفوض بترتيبها: «يجب اختيار المركب» ·
  «يجب تحديد مدة المخالفة» · «يجب تحديد نوع المخالفة». ترحيل 0057 يضيف على
  `marina_bookings`: الرقم · 📅 التاريخ · 🚢 نوع الحجز · ⏱️ المدة (ساعة · دقيقة) ·
  💰 القيمة؛ وعلى الإضافات: الكمية وسعر الوحدة؛ وعلى المخالفات: الرقم · النوع · المدة؛
  وعلى فاتورة التأجير: الضريبة والصافي. والحالة والنوع يُحفظان بنصّهما العربي لأن
  `cmbBookingStatu.Content` و`rbNormal` هكذا يكتبانهما، و`'booked'` القديم يُقرأ
  «مؤكد». و«🔍 البحث» صار مرشِّحاتٍ على القائمة، و«🔍 خيارات البحث» صارت مرشِّحاتٍ على
  فواتير التأجير (العميل أو جواله · التاريخان · الصافي من/إلى). وعمود «الحالة» في شبكة
  المخالفات مربوطٌ بالمدة عند الديسكتوب (`Binding="{Binding period}"`) — فصار لكلٍّ
  عموده. `apps/api/test/marina-booking-documents.spec.ts` (**11** اختباراً) و
  `scripts/verify-marina.mjs` (**45** نقطة تحقّق حيّة، تشغيلان أخضران، والتنظيف في
  `finally`). **740** اختبار API (كان 729) · 36 staff · 71 contract · 17 database ·
  tsc وlint أخضران. ومؤجَّل عن قصد: بطاقة الفئة وأسعارها (`frmGroupM`) إلى الجزء
  السابع، والطباعة والتقارير إلى مرحلتها، ورفع الضريبة إلى سطر فاتورة البيع مع الفاتورة
  الإلكترونية.

* **المرحلة 09 — الوحدات الرأسية، الجزء الخامس: 👓 النظارات**
  (`Form_WPF/frmGlasses.xaml` «👓 بيانات النظارات»، ومعها
  `Form_WPF/frmInvSale.xaml.cs` L2505 `glassesOptions` و`Class/InvoiceOper.cs` L1662
  و`Class/Print.cs` L710 و`Other_Column`). **عشر قيمٍ لعينين، وأسماؤها ليست في الملف:**
  «👓  القياسات» عمودان — «🔴 العين اليمنى (RE)» و«🟢 العين اليسرى (LE)» — وخمسة
  صناديق في كلٍّ، وعناوينها تُقرأ وقت التشغيل
  (`select isnull(L1,'LE-SPH') … isnull(R5,'RE-IPD') from Other_Column`)؛ فالتبويب
  الثاني «⚙  أسماء الحقول» — حقل 1…5 لليمين و6…10 لليسار — هو ما يسمّيها كل مؤسسة،
  و«💾 حفظ الأسماء» يستبدل الصفّ (`delete` ثم `insert`) لا يُرقّعه. ترحيل 0056 يضيف
  `optics_field_labels` على صورة `Other_Column` نفسها: عشرة أعمدة وبدائلها في defaults
  الأعمدة، وصفٌّ واحد لكل مؤسسة، ولا بذور — فمن لم يفتح النافذة يقرأ «RE-SPH» …
  «LE-IPD» كما يفعل `isnull`. والقيم نصوص: أعمدة `SPH … IPD` في الديسكتوب `VarChar`
  و`Conversions.ToString` لا يُحلّل، ف«PL» و«+1.25» تُحفظ كما كُتبت وبلا تحقّق. وحدة
  `optics` كانت قائمة بلا شاشة ولا اختبار، فصارت: `GET/POST /optics/prescriptions` و
  `GET/PATCH/DELETE /optics/prescriptions/{id}` و`GET/PUT /optics/field-labels`،
  والقراءة `optics.view` والكتابة `optics.manage`، وقسم الطباعة يحمل العناوين مع
  الصفوف؛ وشاشتان في وحدة «👓 النظارات»: `/optics/prescriptions` (أزرارها «🔄 جديد ·
  ✔ إدراج · ✖ خروج» بنصّها) و`/optics/field-labels`. والرفض «الرجاء اختيار عميل» هو
  جملة الديسكتوب (`frmOrderDetails.xaml.cs` L324): نافذة النظارات لا ترفض شيئاً،
  ورفضاها للفاتورة لا للوصفة. `apps/api/test/optics-prescriptions.spec.ts` (**11**
  اختباراً) و`scripts/verify-optics.mjs` (**33** نقطة تحقّق حيّة، تشغيلان أخضران،
  والتنظيف في `finally`). **729** اختبار API (كان 718) · 36 staff · 71 contract ·
  17 database · tsc وlint أخضران. ومؤجَّل عن قصد: فتح البطاقة من سطر الفاتورة
  (`invoice_line_id` جاهز) وغلاف `frmInvPOS` الفارغ.

* **المرحلة 09 — الوحدات الرأسية، الجزء الرابع: 📏 القياسات**
  (`Form_WPF/frmMeasurements.xaml` «إدارة قياسات العملاء» و
  `Form_WPF/frmMeasurementDetails.xaml` «📏 بيانات القياس» و
  `Form_WPF/frmMeasurementAttributes.xaml` «📏 إدارة خصائص القياسات»). **القياس عند
  الديسكتوب وثيقةٌ باسمها وتاريخها وقيمها، والسحابة كانت تحفظ `jsonb` واحداً بلا اسم
  ولا تاريخ ولا شاشة — ولا شيء من «خصائص القياس» التي تُبنى منها بطاقة القياس وقت
  التشغيل.** ترحيل 0055 يضيف `tailoring_measurement_attributes`
  (اسم الخاصية · ترتيبها · حالتها) وعمودين على `customer_measurements`: 👤 اسم صاحب
  القياس و📅 التاريخ. والحساب منقولٌ بنصّه: القيمة تُكتب إن فسّرت عدداً أكبر من الصفر
  (`btnSave_Click` في `frmMeasurementDetails`)، و📐 عدد المقاسات هو عدد ما كُتب،
  والترتيب `ISNULL(MAX(DisplayOrder),0)+1`، و«🔕 تعطيل» هو `IsActive = 0` لا حذفاً
  («سيتم إخفاؤها من القياسات الجديدة»)، و«▲▼ تحريك» يبادل الترتيب مع الجار. والخصائص
  الثلاث المبذورة — الطول · العرض · الكم — هي مثال الديسكتوب نفسه في سؤال الإضافة:
  «أدخل اسم الخاصية (مثل: الطول، العرض، الكم)»؛ فصفوف `MeasurementAttributes` بيانات
  لا كود، وهذه الثلاث وحدها ما يسمّيه المستودع. والرفوض بنصّها: «الرجاء إدخال رقم
  الجوال أو اسم العميل» · «لم يتم العثور على عميل» · «الرجاء البحث عن عميل أولًا» ·
  «الرجاء إدخال اسم صاحب القياس» · «الرجاء إدخال قياس واحد على الأقل». النهايات:
  `GET/POST /tailoring/measurements` و`GET/PATCH/DELETE /tailoring/measurements/{id}` و
  `GET/POST/PATCH /tailoring/measurement-attributes` و`…/{id}/deactivate` و`…/{id}/move`
  — القراءة `tailoring.view` والكتابة `tailoring.manage` — وشاشتان:
  `/tailoring/measurements` (البحث و«العميل: …» «الجوال: …» والشبكة والبطاقة) و
  `/tailoring/measurements/attributes`، ومجموعة «القياسات» في وحدة 🧵 التفصيل. وقراراتٌ
  مُعلَّلة في `PHASE_09_VERTICALS.md` §7.3 — أهمّها: **القيم تُفتاح بمعرّف الخاصية لا
  باسمها** فإعادة التسمية لا تُضيّع رقماً مأخوذاً؛ و**المفاتيح الحرّة القديمة باقية**
  لأنها أعمدة «📐 المقاسات» في `frmCustomers` L1184 وهي الوثيقة نفسها عند الديسكتوب؛
  و👤 الاسم مرفوضٌ إن أُرسل فارغاً لا إن أُغفل — فبقي توافق النهاية القديمة، و«قياس
  بتاريخ …» هو عنوان الديسكتوب للقياس بلا اسم. `apps/api/test/tailoring-measurements.spec.ts`
  (**11** اختباراً) و`scripts/verify-measurements.mjs` (**37** نقطة تحقّق حيّة؛ ثلاث
  تشغيلات متتالية خضراء، والتنظيف في `finally` ففشلُ فحصٍّ لا يترك صفوفاً، و🔢 الترتيب
  يعود كما كان، والخاصية المضافة تُعطَّل لا تُحذف). **718** اختبار API (كان 707) ·
  36 staff · 71 contract · 17 database · tsc وlint أخضران. ومؤجَّل عن قصد: شاشة
  «📐 المقاسات» على بطاقة العميل (`frmCustomers` L1184) و`sp_DeleteMeasurement` حرفيّاً.

* **المرحلة 09 — الوحدات الرأسية، الجزء الثالث: 🧾 فاتورة التفصيل**
  (`Form_WPF/frmViewOrders.xaml` «عرض الطلبات - ViewOrders» و`Form_WPF/AddNewSizes.xaml`
  «إضافة مقاس جديد» و`Form_WPF/frmSandQ.xaml` بـ`ISTailor = true`). **«عرض الطلبات»
  لا يقرأ `TailoringOrders`: `SearchInData` L55 يقرأ `Inv_Tailor` — وثيقةٌ أخرى برقمها
  وإجماليها ومدفوعها وباقيها.** ترحيل 0054 يضيف ثلاثة جداول: `tailoring_invoices`
  (رقم · العميل · الجوال · التاريخ · العدد · السعر · الإجمالي · المدفوع · الحالة ·
  نوع الثوب · `measurements jsonb` · ملاحظات) و`tailoring_invoice_payments`
  (`voucher_id` → سند القبض، `ON DELETE set null`) و`tailoring_garment_types`
  (سعودي · بحريني · اماراتي · كويتي، مبذورة كما في `typeCB` L423). والحساب منقولٌ
  بنصّه: 💵 الإجمالي = 💰 السعر × 🔢 العدد (`CalculateTotalPrice` L860)، و💰 الإجمالي في
  الشبكة هو الصافي × 1.05 (L88) — نسبة الـ5% نفسها التي يمرّرها `CreateInvoice` L419 إلى
  نقطة البيع — و⏳ الباقي = الصافي − المدفوع (L90)، والرفضان «برجاء اختيار العميل»
  و«يرجي إدخال السعر» (`btnSave_Click` L191). والـ39 عموداً من `Inv_Sub_Tailor` تصير
  `measurements jsonb` بمفاتيحها كما في الديسكتوب (`height1` · `shoulder` ·
  `handShape` …)، وتسمياتها تُخدم في `GET /tailoring/measurement-fields` بمجموعاتها
  الثلاث (📐 المقاسات · ✨ الأشكال والتفاصيل · 📏 مقاسات إضافية) فترسمها الشاشة من
  السجلّ، ويُرفض أي مفتاحٍ ليس فيه. النهايات: `GET /tailoring/garment-types` و
  `GET /tailoring/measurement-fields` و`GET/POST /tailoring/invoices` و
  `GET/PATCH/DELETE /tailoring/invoices/{id}` و`POST …/status` و`POST …/payments` —
  القراءة `tailoring.view` والكتابة `tailoring.manage` — وشاشة `/tailoring/invoices`:
  شبكة `frmViewOrders` بصندوق بحثها «🔍 الهاتف أو اسم العميل...» و«النتائج: N»، ونافذة
  «👁️ عرض» ببطاقة `AddNewSizes` كاملة، ونافذتا «🔄 تغيير الحالة» و«💵 إستلام دفعة».
  وقراراتٌ مُعلَّلة في `PHASE_09_VERTICALS.md` §6.3 — أهمّها: **الحالة من صفوف
  `tailoring_order_statuses` نفسها** فدورةٌ واحدة تُسمّى مرةً واحدة؛ و👔 نوع الثوب جدولٌ
  جديد غير `tailoring_types`؛ ورقم الفاتورة `TI-000001` من سلسلة الوثائق؛
  و**«إستلام دفعة» تُسجَّل دائماً، وتكتب سند قبض حقيقياً بعبارة «تم استلام دفعة من
  عملية رقم {code}» (L683) إن أُرسل الصندوق** — والسند `ON DELETE set null` يبقى في
  الخزينة إن حُذفت الفاتورة. ومؤجَّل عن قصد: زرّ «فاتورة» في «⚙️ لوحة التحكم» (يملأ
  سلّة ويستدعي نقطة البيع) و`frmSandQ` كاملاً وشاشة القياسات.
  `apps/api/test/tailoring-invoices.spec.ts` (**11** اختباراً) و
  `scripts/verify-tailoring-invoices.mjs` (**41** نقطة تحقّق حيّة؛ تشغيلان متتاليان
  أخضران والثاني يبدأ من قاعدة بلا فواتير وينتهي بلا أثر، والسند باقٍ). **707** اختبار
  API (كان 696) · 36 staff · 71 contract · 17 database · tsc وlint أخضران.

New permissions `inventory.production.manage` and `inventory.production.complete` (123
total): planning a recipe and consuming the warehouse against it are different decisions.
Posting a contracting return reuses `projects.bill.post` — reversing certified work is the
same authority taken backwards.

### Round 7 — file-level operations and the report designer (2026-09-08)

The last six screens in the tree are the ones that can destroy a company's data, so each
was built around what it refuses to do. Migration `0028` adds `backup_runs`, `restore_runs`,
`maintenance_runs`, `company_files` and `report_layouts`, all under FORCE RLS.

* **النسخ الإحتياطي** (`/settings/backup`, `POST /settings/backups`) — a logical, tenant-scoped
  snapshot: every table carrying `tenant_id`, read through RLS, with per-table row counts and
  a sha256 checksum. It excludes identity (`users`, `memberships`, `roles`) and the audit log,
  because re-importing credentials or a rewritten audit trail is an attack, not a restore. Past
  50 000 rows it fails with `BACKUP_TOO_LARGE` and points at `pg_dump` instead of writing an
  export nobody could restore.
* **إستعادة البيانات** (`/settings/restore`) — dry run by default; applying is **additive only**
  (insert-missing, never delete or overwrite) and requires the file code typed back
  (`RESTORE_CONFIRMATION_REQUIRED`). Tables are retried across passes so foreign-key order
  resolves itself, and `tenant_id` is forced to the current file so a foreign snapshot cannot
  smuggle rows across.
* **تدوير البيانات** (`/settings/data-rotation`) — deletes operational logs only (notifications,
  outbox jobs, idempotency keys) older than a cutoff that must be at least 90 days in the past
  (`ROTATION_CUTOFF_TOO_RECENT`), and shows the documents it is *not* deleting next to them. The
  audit log cannot be rotated at all: migration `0001` revokes DELETE on it from `erp_api`, and
  the preview reports that as `retainedByDesign` rather than pretending otherwise.
* **صيانة الفواتير** (`/settings/invoice-maintenance`) — scans for header totals that disagree
  with their lines, posted invoices with no journal entry, numbering gaps and stale drafts.
  The repair rewrites **draft** totals only; a posted discrepancy is reported for a credit note,
  never silently edited.
* **إنشاء ملف** (`/settings/new-file`) — a sibling company file is a new tenant, provisioned
  through the signup path so it starts **unlicensed** with a pending activation request: a tenant
  permission must never be able to mint licensed tenants. Master data (accounts, catalog, parties,
  structure) can be copied with every id remapped; documents, balances and users never cross.
* **مصمم التقارير** (`/support/report-designer`, `/reports/layouts`) — layouts store presentation
  only: column choice, order, headings and default filters. The report's SQL stays in the
  server-side catalog, so a designer cannot become a query editor pointed at other tenants' data.
  Saved layouts appear as a picker on every report screen (`?layout=<id>`, `layout=none` for the
  raw columns).

Six new permissions (129 total): `settings.backup.manage`, `settings.restore.manage`,
`settings.rotation.manage`, `settings.maintenance.manage`, `settings.companyfile.create`,
`reporting.layout.manage`.

Fixed on the way: `ReportingService` read the module-level database singleton instead of the
injected handle, so under test it queried a different database than the one the test had
provisioned. Both it and `ReportLayoutsService` now take `DATABASE_HANDLE`.

Still `planned` — 1 screen: إعدادات جهاز التحضير (preparation device), excluded by the customer.

## Billing and live-data integration notes

- Neon migrations through `0019_billing_subscriptions` are applied to the connected database.
- Customer pricing, subscription status, manual activation requests, Stripe Checkout, and webhook handling use the live API paths; no UI fallback data is used for these flows.
- Admin billing review is available at `/billing`, and the platform page reads the live tenant context.
- Workspace tests pass after adding billing navigation coverage. Production acceptance still requires configured Stripe webhook signing secret and end-to-end payment verification.

## Phase-01 Notes

- Monorepo skeleton created with `apps/{api,admin,customer,migrator}` and `packages/{database,contracts,config,testing}`.
- Shared TypeScript, ESLint, Prettier, and workspace configuration established.
- Money guard and env/config skeleton added in the shared config package.
- Docker compose skeleton for postgres, redis, minio, and mailhog added.
- Verify script is wired to run the project bootstrap checks and smoke test.
- No runtime application modules or database schema were created, in line with Phase 01 scope.

## Phase-02 Notes

- NestJS platform bootstrap implemented at the API app boundary: `RequestIdMiddleware` →
  helmet/CORS → global `api/v1` prefix → zod pipes → RFC 9457 `application/problem+json`
  exception filter → request-context and idempotency interceptors.
- `packages/contracts` (error codes, problem shape, pagination/filter/sort helpers,
  permission registry, request-id), `packages/config` (env schema, tenant-settings
  registry) and `packages/database` (Drizzle client, migration runner, CLI) established.
- `/health/live` and `/health/ready` outside the versioned prefix.
- Completed items that Phase 02 had left open: ESLint flat config that actually runs,
  coverage/tooling config, the generated `packages/contracts/openapi.json` artifact, and
  `docs/PHASE_02_IMPLEMENTATION_REPORT.md`.

## Phase-03 Notes

- Schema: `tenants, users, memberships, roles, permissions, role_permissions,
  membership_roles, refresh_tokens, tenant_settings` + `erp_migrations`, applied by
  `packages/database/migrations/0000_platform_identity.sql` (267 lines) with a reversible
  counterpart in `migrations/down/`. Verified idempotent (apply → skip) and reversible
  (down → re-apply) against a real PostgreSQL 16 cluster.
- RLS `ENABLE` + `FORCE` on `memberships, roles, role_permissions, membership_roles,
  tenant_settings`; `refresh_tokens`, `tenants`, `users`, `permissions` stay platform-wide.
- Roles: `erp_api` (NOBYPASSRLS, pinned on every migration run) and `erp_migrator`
  (BYPASSRLS, migration-only), created `NOLOGIN` in SQL; `LOGIN` + password only from
  `pnpm db:roles` so no credential is ever written into a migration.
- Guard pipeline frozen by `API_ARCHITECTURE §2` and asserted by `app.module.spec.ts`:
  `RateLimitGuard → AuthGuard → TenantGuard (RLS GUC) → BranchScopeGuard → PermissionsGuard`.
- Auth: RS256 access tokens (15 min, `sub/tid/mid/scope/jti`), 256-bit rotating refresh
  tokens stored as SHA-256, family revocation on reuse, Argon2id `m=65536,t=3,p=4`,
  lockout after 5 failures, 10/min login bucket, 423 for a suspended tenant, 403 for a
  forged `tid`.
- Testing: `packages/testing` provides the `TESTING_STRATEGY §6` isolation harness; it is
  applied to `memberships` and `roles` with all four proofs plus a direct-SQL RLS probe.
  Integration tests run against an embedded PostgreSQL with no Docker dependency.
- Toolchain: workspace packages now emit `dist/` and are consumed as compiled JavaScript at
  runtime (tests still resolve them to TypeScript source through vitest aliases). This is
  what makes `pnpm run build`, `openapi:export` and the entry-point smoke check pass.

## Phase-04 Notes

- Schema: `audit_log, files, notifications, outbox_jobs, idempotency_keys,
  document_sequences` applied by `packages/database/migrations/0001_platform_services.sql`
  with a reversible counterpart in `migrations/down/`. All six carry `ENABLE`+`FORCE`
  RLS; `audit_log` additionally has `UPDATE, DELETE, TRUNCATE` revoked from `erp_api`,
  so immutability is a privilege, not a convention (proved in `test/audit.spec.ts` by
  asserting SQLSTATE `42501`).
- Audit: a global `AuditInterceptor` records every successful mutating request
  (entity/action/actor/after/meta) and auth events including failures; a service that
  knows the previous state writes the row itself inside its transaction — with a real
  `before` — and marks the request audited so exactly one row is produced. Sensitive
  keys are redacted structurally at any depth before the row is written.
- Files: `POST /files/presign` → client PUT → `POST /files/{id}/finalize` →
  `GET /files/{id}/download` → `GET /files/{id}/content` (302). SigV4 is implemented
  in-repo and verified against the AWS reference vector; object keys are
  `tenants/{tid}/{yyyy}/{mm}/{fileId}/{name}`. `VirusScanner` and the SMTP mailer are
  ports with no-op/console adapters, per the phase's out-of-scope list.
- Jobs: queues `einvoice, notifications, reports-export, migration, maintenance`; nothing
  publishes from inside a business transaction — services write `outbox_jobs` rows and
  `OutboxPublisher` drains them per tenant (`FOR UPDATE SKIP LOCKED`, exponential backoff
  capped at 1 h, dead-letter at `OUTBOX_MAX_ATTEMPTS`). No component uses BYPASSRLS.
- `WORKER=1` boots the same image as an application context with no HTTP listener; it
  starts cleanly without Redis (inert driver, outbox rows simply stay `pending`).
- Idempotency: `idempotency_keys` replaces the Phase-02 in-memory map. The stored
  response is **text**, so a replay is byte-identical; a reused key with a different
  payload is a 409 `IDEMPOTENCY_REPLAY`; a failed handler releases the claim.
- Deviations recorded as CR-004 (unknown setting key on write: 404 → 400) and CR-005
  (additional file/notification/job endpoints + `platform.notification.view|manage`,
  `platform.job.view`).
- Known gap: no Docker in the build environment, so the presign→upload→finalize→download
  flow was verified against an in-memory storage fake rather than live MinIO, and the
  BullMQ hop was verified against a recording queue fake. Everything that touches
  PostgreSQL — including all RLS and concurrency proofs — ran against a real server.

## Round 8 — printed documents and editable master data

- **Printing is real.** `apps/api/src/modules/reporting/print-templates.service.ts`
  replaces the one-line HTML stubs with full A4 documents (company header + VAT/CR
  number, counterparty, lines, totals, payments, tafqeet, signatures, ZATCA QR when the
  invoice has been reported). Routes: `/reports/print/{invoices|purchase-invoices|
  vouchers|journal-entries|shifts}/:id`. The admin viewer lives at
  `/print/[doc]/[id]` and every document screen links to it.
- **Master-data cards can be corrected and withdrawn.** New `PATCH`/`DELETE` endpoints for
  catalog items, categories, units and tax groups, accounts, cost centres, salesmen,
  expense cards and HRM departments/jobs/employees. `apps/admin/components/directory.tsx`
  grew `edit` and `onDelete`, and the item, category, unit, account, cost-centre, branch,
  cash-location, warehouse, customer, supplier, salesman, payment-method, expense and HRM
  screens all use them.
- **What editing refuses is the point.** A used item keeps its SKU and base unit; a used
  tax group keeps its rate; a posted account keeps its number, nature and side; a category
  or unit with items behind it, an account with children or entries, and a department with
  staff cannot be deleted at all; an item, an employee or a salesman that already appears
  on a document is archived instead of removed. Reparenting an account moves its whole
  subtree (`path`/`level`) in one statement.
- `POST /sales/salesmen` did not exist while the screen already posted to it — added, with
  `sales.salesman.manage` (permission count 130; re-run `pnpm db:seed`).

## Round 9 — real report exports

- **`POST /reports/:key/export` produces actual files.** It used to return CSV whatever the
  caller asked for, and the admin never called it at all — the screen serialised the rows it
  had already rendered, which ignored the saved layout and dropped anything not on screen.
  The export now re-runs the report server-side with the same filters and returns
  `{ filename, mimeType, encoding, content }`.
- **`xlsx` is a genuine workbook**, written by `apps/api/src/modules/reporting/xlsx.ts` — a
  dependency-free OOXML + ZIP writer (`node:zlib` deflate, hand-rolled CRC-32). Right-to-left
  sheet, frozen header row, auto-filter, `#,##0.00` numeric cells, bold totals band. Verified
  by unzipping the output and by opening it with a third-party reader.
- **`pdf` returns a print-ready A4 landscape page** on the company letterhead with the header
  band repeating on every page, handed to the browser's print dialog. No PDF renderer is
  bundled: Arabic PDF text needs an embedded font with contextual shaping, and the print
  dialog already yields a smaller, selectable document.
- **Filters are printed as words.** `branchId=<uuid>` becomes `الفرع: الفرع الرئيسي` in both
  the workbook caption band and the printed header; the lookup is best-effort and can never
  fail an export.
- Codes stay codes: only clean decimals become numeric cells, so `1101`, `SI-000006` and any
  value with leading zeros survive the trip to Excel intact.
- Tests: `xlsx.spec.ts` (6) plus four export cases in `test/printing-and-cards.spec.ts`.

## Round 9 (part 2) — ZATCA e-invoicing is a real document, not a mock

- **The invoice XML is a UBL 2.1 document** built from the tenant's own data
  (`apps/api/src/modules/einvoicing/zatca/ubl.ts`): seller party with VAT/CR and national
  address, buyer party, per-line tax categories, one `cac:TaxSubtotal` per rate, closing
  `cac:LegalMonetaryTotal`, `388`/`381` type codes and the `0100000`/`0200000` standard vs
  simplified flag. It replaces a five-element fake that no validator would have accepted.
- **The hash chain is real.** `einvoice_chain` now also carries the invoice counter (ICV,
  migration `0029`), handed out with the previous hash (PIH) under `FOR UPDATE`; both are
  embedded in the document, and the next invoice's PIH is this invoice's hash.
- **The QR is the tenant's.** TLV tags 1–5 are built from the company card and the invoice —
  the old code hard-coded `Tenant seller` and a VAT number of fifteen zeros. Tags 6–8 (hash,
  ECDSA signature, public key) appear only when the tenant has uploaded an EC private key.
- **The system no longer claims acceptance it did not get.** New submission states
  `prepared` (document built, no credentials) and `signed` (signed, no gateway configured);
  `reported`/`cleared` are written only after a real `2xx` from `ZATCA_API_BASE_URL`, and the
  HTTP response is stored. `retry` re-files the stored document instead of flipping a flag.
- Admin: الإعدادات ← المزامنة ← Zatca explains the states, shows the counter and the invoice
  profile, and can download the stored XML for any submission.
- Still credential-bound and documented as such in the module README: the XAdES signature
  block, ZATCA onboarding (CSR → compliance CSID → production CSID) and QR tag 9.
- Tests: `zatca/zatca.spec.ts` (9) and `test/einvoicing.spec.ts` (6, integration).

## Round 10 — the customer portal stops being a mock-up

- **`apps/customer` now serves real customers.** Every screen that used to render a hard-coded
  row is gone or wired: dashboard, invoices, invoice detail (lines, totals, payments, printed
  A4 HTML), statement with a running balance and a CSV download, payments, and a read-only
  "بياناتي" card. The screens with no backing API — بيع سريع، استعلام مخزون، صندوق المهام،
  الإشعارات، منتقي المستأجر — were deleted rather than left as furniture.
- **A portal login is an ordinary user with an empty role.** `portal_accounts` (migration
  `0030`, RLS forced, `UNIQUE (tenant_id, user_id)`) links a login to exactly one party; the
  membership carries the permission-free system role `Customer portal`, so every
  `@RequiresPermission` route answers 403, and `/portal/*` — which carries no permission
  decorator — resolves the party from the token, never from the request. A foreign invoice is
  a **404**, not a 403. See `apps/api/src/modules/portal/README.md`.
- **Granting access is a back-office action**: المبيعات ← أخرى ← وصول العملاء للبوابة, or the
  «بوابة العميل» button on بطاقة عميل. The generated one-time password is shown exactly once,
  and `mustChangePassword` sends the buyer to `/auth/change-password` on first sign-in.
- **The client talked to `http://localhost:3000` and therefore only ever worked on a
  developer's laptop.** It now uses the app's own origin (`/api/v1`, rewritten by
  `next.config.mjs`), which is also what makes the portal usable behind a proxy or preview URL.
- `/verify` decodes a ZATCA QR (TLV) in the browser — seller, VAT number, timestamp, total, VAT
  and whether tags 6–8 are present — instead of printing a canned sentence. No endpoint, no
  account, nothing to leak.
- Tests: `apps/api/test/portal.spec.ts` (10, containment-first) and `apps/customer` 8.
  Repository total **475**.

## Round 11 — security and settings the desktop edition always had

- **TOTP two-factor authentication is real, end to end.** Migration `0031` adds
  `users.mfa_enabled` and `mfa_recovery_codes` (SHA-256 hashes only). Enrolment is
  two-phase: `POST /auth/mfa/enroll` seals a fresh secret under AES-256-GCM
  (`secret-box.ts`, same `v1:` envelope as the e-invoicing credentials, key from
  `DATA_ENC_KEY`) but does not enforce 2FA; `POST /auth/mfa/enable` flips
  `mfa_enabled` only after a valid code proves the authenticator was actually
  configured, and issues eight one-time `XXXX-XXXX` recovery codes (ambiguous glyphs
  excluded) shown exactly once. Login with 2FA on returns 401 `MFA_REQUIRED` when the
  code is missing and treats a wrong code as a failed login (lockout counter
  advances). Recovery codes are single-use and accepted wherever the 6-digit code is.
  Disabling requires the account password. `totp.ts` is RFC 4226/6238 on
  `node:crypto`, pinned against the RFC 6238 test vectors. Admin UI: الإعدادات ←
  المستخدمون ← التحقق بخطوتين, plus a code step on the login screen.
- **Mail actually delivers.** `MAIL_TRANSPORT=smtp` now routes through a hand-rolled
  SMTP client (`SmtpMailer` — EHLO, opportunistic STARTTLS, AUTH LOGIN, dot-stuffing,
  RFC 2047 subjects; no new dependency), tested against an in-process fake relay.
  Granting portal access e-mails the buyer their one-time password unless
  `notify:false`; delivery failure never rolls back the grant. `console` stays the
  default transport; MailHog in the compose file is the target (`SMTP_HOST=localhost
  SMTP_PORT=1025`).
- **The language screen exists.** الإعدادات ← عامة ← اللغة flips the whole document
  between Arabic/RTL and English/LTR and persists in `localStorage`. The chrome — app
  shell, navigation tree (both names already lived in `navigation.ts`), login, common
  states — is fully bilingual via `lib/i18n.tsx`; screen content stays Arabic-first by
  design and the page says so.
- Tests: `test/mfa.spec.ts` (12), `totp.spec.ts` (7), `secret-box.spec.ts` (4),
  `mailer.spec.ts` (3), portal suite +2 (invite mail, `notify:false`). API **372**,
  admin **35**; repository total **508**. Migrations through **0031**.

## Conventions

- `docs/` remains the authoritative documentation source.
- Phase outputs must be self-verifying and must not contradict `PROJECT_CONTRACT.md` or `TARGET_ARCHITECTURE.md`.
- Implementation for later phases starts from this foundation only.
- A phase is `COMPLETE` only when `pnpm run verify` exits 0 on a clean checkout.

## Phase-05 Notes

- Schema: ten tables in `packages/database/migrations/0002_organization.sql` (424 lines)
  with `migrations/down/0002_organization.down.sql` (56 lines). Cycle proved on a real
  PostgreSQL 16 cluster: `up → 26 tables / 21 policies / 21 FORCE-RLS relations / 73
  indexes`, `up again → 0 applied, 3 skipped`, `down → 16 tables / 11 policies`,
  `up again → 26 tables` and `erp_api` still `NOBYPASSRLS`.
- The Phase-04 hand-off is closed: `document_sequences.branch_id` now carries its
  deferred FK to `branches (id) ON DELETE RESTRICT`, and the `company_profile` logo is
  the first entity registered in the `FileAttachmentRegistry` (which PHASE_04 shipped
  deliberately empty).
- Defaults: one default branch / warehouse / price list per tenant, one **per kind** for
  cash locations, one base currency — each enforced by a partial unique index
  (`… WHERE is_default AND deleted_at IS NULL`) and serialised by a transaction-scoped
  advisory lock, so eight concurrent "make me the default" requests all return 200 and
  exactly one default survives.
- Money and rates are decimal strings end to end (ADR-006). `resolveFx` reports which
  rung answered (`identity | direct | inverse | triangulated`) and, when triangulated,
  the pivot and the **staler** of the two legs; intermediate legs keep full precision so
  a derived rate never rounds twice.
- `resolvePostProfile(branchId, docType)` walks branch+docType → branch+`'*'` →
  tenant+docType → tenant+`'*'` and fails hard with `ACCOUNT_PROFILE_MISSING` rather than
  guessing an account.
- Account ids (`cash_locations.account_id`, `warehouses.inventory_account_id`, the
  posting-profile mapping) and `price_list_items.item_id` are shape-validated uuids with
  no FK until PHASE_07 / PHASE_06 (CR-006); every such column carries a
  `ValidatedAtRuntime` comment in the migration and the schema.
- Deviations recorded as CR-006 (deferred FKs), CR-007 (two `.view` permissions),
  CR-008 (`DELETE` = soft delete + the three read-only resolution routes), CR-009 (the
  prompt's "+9 tables" is a miscount; §4 and `DATABASE_DESIGN §5` both name ten).
