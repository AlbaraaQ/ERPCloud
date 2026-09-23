# Phase 01 — Users/permissions UI + navigation dedup (done 2026-09-10)

## 1A. Staff users & roles — from read-only to real CRUD

Desktop reference: `Form_WPF/frmAddUsers*`, `frmUsersPermissions*`, `frmOperPermission*`,
`Class/User.cs`, `Class/FormPermission.cs` (per-form Editable/Addable/Delete/Search/Print).

Cloud API (already exists, verified): `memberships.controller.ts`
(`GET/GET :id/POST/PATCH :id/DELETE :id/POST :id/scopes`), `roles.controller.ts`
(`GET/GET :id/POST/PUT :id/POST :id/permissions`), `identity.controller.ts`
(`GET me`, `GET permissions`).

Work:
- `apps/staff/app/settings/users/page.tsx`: list + invite (POST), edit status/roles
  (PATCH), remove (DELETE), per-membership scopes editor (`POST :id/scopes`).
- `apps/staff/app/settings/roles/page.tsx`: list + create (POST), rename (PUT),
  permission matrix editor (`POST :id/permissions`), using the registry from
  `GET /permissions` grouped by namespace.
- Gating follows the desktop's 5 verbs: view/create/edit/delete/print map to the
  cloud permission codes on each button; forbidden → `<Forbidden/>`, never a mock.

Accept: owner manages users + roles end-to-end on the staff surface; no `*` grants;
tenant_owner touches only its own tenant (existing API guards, unchanged).

## 1B. Navigation dedup — 18 duplicate hrefs → 0

Rule applied per group (see survey in session notes):
- **True duplicates** (identical label + href, e.g. `purchase-credit-note`/`pn-credit`,
  `vouchers-report`/`purchase-vouchers`/`sales-vouchers`): merged into one entry.
- **Dead links** (`status: 'ready'` with no page: `purchases/notes/credit`,
  `reports/invoice-profit`, `sales/notes/debit`): merged + demoted to `status: 'api'`
  with the endpoint named — the screen says so instead of 404ing.
- **Wrong hrefs** (distinct function sharing a list page: `opening-stock`,
  `item-card`, marina/project cards, contractor card): given their own href
  (existing subpage or `?view=` anchor) or demoted to `'api'` when the screen is
  genuinely a later phase's work.
- **Cross-module shortcuts** (same card reachable from sales + marina + projects):
  kept only where the desktop menu also repeats the entry, with module-qualified
  labels; otherwise removed.

Accept: audit script reports 159 screens, 0 duplicate hrefs (was 183 / 18), and every `'ready'`
href resolves to a real page (checked in CI by `apps/staff/tests/navigation.spec.ts`).
Non-ready entries use the `/s/` scaffold namespace and render as disabled in the
sidebar instead of linking to a 404.

---

## R1 — مطابقة شاشتي المستخدمين والصلاحيات (تكملة المرحلة 01)

**الحالة: مُنجَز.** أربعة أجزاء: (١) **«تجاوز الخصم الافتراضي» صار رمزاً** —
`ckDiscount` في `frmUsersPermissions.xaml:262` هو `sales.discount.override` في السجلّ
(`packages/contracts/src/permissions.ts:207`)، ومن يحمله يتخطّى حدّ عضويته؛ (٢) **حدّ
الخصم حدُّ عضويةٍ لا جدولٌ موازٍ** — العمودان `memberships.max_discount_pct` و
`max_discount_amount` (ترحيل `0085`) بديلاً عن `OperMaxDiscount(MaxDicount,
MaxDicountParcent, emp)`؛ (٣) **تسميات الديسكتوب على الشاشتين** (`/settings/users` ·
`/settings/roles`) كما هي بأرقام أسطرها؛ (٤) **اختبارٌ وسكربت**: `identity-rbac.spec.ts`
(**18**) و`scripts/verify-identity-rbac.mjs` (**78 نقطة في 9 أقسام** — تشغيلٌ متعاقب
يعيد الحالة إلى ما كانت عليه).

> **القاعدة الحاكمة:** كل تسميةٍ عربية في هذا القسم منسوخةٌ من ملف الديسكتوب **بسطرها**،
> وكل ما لا مقابل له في `Desktop_ERP` مذكورٌ في §R1.7 «ما اخترعناه»، وكل شاشةٍ فيه تُسمّى
> ملفها.

### R1.1 المصادر (ملفات `Desktop_ERP`)

| المجال | الملفات والأسطر |
|---|---|
| بطاقة المستخدمين | `Form_WPF/frmAddUsers.xaml` (524) + `.xaml.cs` (595) — `Window_Loaded` س36 · `LoadDG` س66 (استعلامٌ يجمع `Employees, Users` ويُسقط `IS_Deleted`) · `btnSave_Click` س127 (تفرّد اسم الدخول س163 · الرقم السري س180 · قيد الموظف الواحد س197 وس212 · `insert into Users(...)` س229 · `update Users ...` س242) · `btnDelete_Click` س287 (يمنع الحذف إن كان للموظف فواتير س323 أو قيود س342) · الأزرار س469–517 |
| مصفوفة الشاشات | `Form_WPF/frmUsersPermissions.xaml` (426) + `.xaml.cs` (715) — `LoadTreeNodes` س153 · «الأفعال الظاهرة» س189–199 · تحميل الممنوح س218 · `SaveFormsPermission` **حذفٌ ثم إدراج** س418/437/489 · `SaveOperPermission` (OperNo > 7) س505–546 · `OperMaxDiscount` س553–560 · التسميات س167–418 |
| صلاحيات العمليات | `Form_WPF/frmOperPermission.xaml` (157) + `.xaml.cs` (145) — `SavePermission` س117–124 بـ`OperNo` **1..5** س78–91 · لكل منحٍ **كلمة مرور وتاريخ** (`pwd` · `lastChanged`) |
| خصائص التشغيل | `Class/User.cs` (166) — `LoadUserOperPermission` س50 (قراءة `OperationPermission` س57) · تعيين `OperNo` **8..20** على خصائص `User` س73–123 |
| الأفعال الخمسة | `Class/FormPermission.cs` (349) — قراءة الأعمدة الخمسة س100–104 · مطابقة الأزرار بأسمائها س110–145 · التعطيل (`IsEnabled=false` + رمادي + `Opacity .75`) · قوائم أسماء الأزرار س261–299 · جدول `Forms` س167 |

### R1.2 من جداول الديسكتوب إلى السحابة

| الديسكتوب | السحابة | لماذا |
|---|---|---|
| `Users` (اسم دخولٍ وكلمة مرورٍ ورقم سريٍّ و`IS_Deleted`) | `users` + `memberships` | الدخول حسابٌ واحد يعبر المستأجرات، و**العضوية** هي صفّ «الموظف في هذه المنشأة» (الدور والنطاق والحالة وحدّ الخصم) |
| `User_Permissions(Form_id, IS_New, IS_Save, IS_Delete, IS_Search, IS_Print, IS_Edit)` | `roles` + `role_permissions` + سجلّ `permissions.ts` (**145 رمزاً · 24 وحدة**، مقروءةً من `GET /permissions`) | «صلاحية لكل نموذج» ← «صلاحية لكل رمز» |
| `Forms` (شجرة الشاشات وأعمدة `IS_*_Visible`) | لا مقابل | الشجرة في الديسكتوب **بياناتٌ** تُدار في القاعدة؛ والسحابة تُبقي الشاشات في الكود والصلاحيات في الرموز |
| `OperationPermission(OperNo, pwd, lastChanged, Activated)` | رموز السجلّ (`treasury.shift.close` · `sales.return.create` · `sales.discount.override` · …) | منحٌ مؤقّتٌ بكلمة مرور ← رمزٌ في دور |
| `OperMaxDiscount(MaxDicount, MaxDicountParcent, emp)` | `memberships.max_discount_pct` / `max_discount_amount` (ترحيل `0085`) | الحدّ **صفةُ عضوية** لا جدولاً ثالثاً يُزامَن معها |
| `Employees` | لا مقابل بعد | يبقى في الديسكتوب؛ وربطُه بـ`hrm.employees` عملُ مرحلةٍ أخرى |

### R1.3 جدول النموذج × الأفعال الخمسة

`User_Permissions` يحمل **ستّة أعمدة لخمسة أفعال**: الحفظ يكتب `IS_New` و`IS_Save` معاً
بالقيمة نفسها (`frmUsersPermissions.xaml.cs:489–490`)، والقراءة تقرأ خمسةً فقط
(`FormPermission.cs:100–104`). وكل فعلٍ لا يُعرض في الشجرة إلا إذا أذِن عمودُ ظهوره في
`Forms` (`frmUsersPermissions.xaml.cs:189–199`):

| الفعل في الديسكتوب | عمود المنح | عمود الظهور | خاصية `FormPermission` | نظيره في السحابة |
|---|---|---|---|---|
| حفظ | `IS_Save` (`IS_New` معه) | `IS_New_Visible` | `Addable` · `Editable` | `.create` أو `.manage` |
| تعديل | `IS_Edit` | `IS_Save_Visible` | `Editable` | `.manage` |
| حذف | `IS_Delete` | `IS_Delete_Visible` | `Delete` | `.manage` (وللمُترحَّل `.void`) |
| بحث | `IS_Search` | `IS_Search_Visible` | `Search` | `.view` |
| طباعة | `IS_Print` | `IS_Print_Visible` | `Print` | `.view` — **لا رمز طباعةٍ منفصل** |

والفرق الجوهري: الديسكتوب **يُخفي الزرّ ويعطّله** (`ApplyFrmPermissionInternal`)، والسحابة
**تردّ النداء** — فمن تجاوز الشاشة يجد الخادم في وجهه. ومن هنا جاء §R1.6.

### R1.4 التسميات الحرفية بأسطرها

**أ) `frmUsersPermissions.xaml` — «صلاحيات المستخدمين» (العنوان س6، واللافتة س167):**

| السطر | التسمية |
|---|---|
| 191 | 👤 الموظف |
| 199 | 👤 اسم المستخدم |
| 207 | 🔑 كلمة السر |
| 226 | 🖥️ صلاحيات الشاشات *(تبويب)* |
| 245 | ⚙️ صلاحيات أخرى *(تبويب)* |
| 257 | ⚙️ العمليات المسموحة |
| 263–299 | ثلاث عشرة خانة: «تجاوز الخصم الافتراضي» 263 · «تجاوز أعلى سعر بيع» 266 · «تجاوز أدنى سعر بيع» 269 · «تجاوز أعلى سعر شراء» 272 · «تجاوز أدنى سعر شراء» 275 · «البيع بأقل من متوسط التكلفة» 278 · «تعديل سعر» 281 · «الاطلاع على التكلفة» 284 · «تعديل التاريخ في الفواتير» 287 · «إظهار مخزون المواد» 290 · «تعديل بيانات المادة» 293 · «إظهار حسابات الفروع» 296 · «إلغاء كلمة المرور على الخصم» 299 |
| 312 | 💰 حدود الخصم |
| 324 · 326 | أعلى قيمة للخصم (`MaxDicount`) |
| 332 · 334 | أعلى نسبة للخصم % (`MaxDicountParcent`) |
| 399–418 | 🖨️ طباعة · 🗑️ حذف · 💾 حفظ · ➕ جديد |

**ب) `frmAddUsers.xaml` — «إضافة المستخدمين» (العنوان س6، واللافتة س217):**

| السطر | التسمية |
|---|---|
| 234 | 👤 الموظف |
| 243 | 🔑 اسم المستخدم |
| 252 | إضافة موظف جديد *(تلميح زرّ ➕ س251)* |
| 273 | 🔒 كلمة المرور |
| 282 | 🔢 الرقم السري |
| 291 | الدخول بالرقم السري |
| 299 | محذوفات |
| 325 | 📋 قائمة المستخدمين |
| 351–417 | الأعمدة: الرقم 351 · رقم الموظف 358 · 👤 الموظف 365 · 🔑 اسم المستخدم 378 · 🔢 الرقم السري 391 · Password 404 · الدخول بالرقم السري 411 · ⚙️ الصلاحيات 417 |
| 421 | ⚙️ تعديل الصلاحيات |
| 469–517 | ✖ · ⏮ · ◀ · ▶ · ⏭ · 🗑️ حذف · 🖨️ طباعة · 💾 حفظ · ➕ جديد |

**ج) `frmOperPermission.xaml` — «صلاحيات العمليات» (العنوان س6، واللافتة س101):**

| السطر | التسمية |
|---|---|
| 122 | 👤 المستخدم |
| 125 | 🔑 كلمة المرور الجديدة |
| 128 | 📅 التاريخ |
| 135 | ⚙️ الصلاحيات المتاحة |
| 137–141 | 🔒 إغلاق اليومية · ↩️ الترجيع · 🏷️ الخصم · ☕ الضيافة · 🚢 إستبعاد مركب |
| 152–153 | 💾 حفظ · ✖ خروج |

### R1.5 العمليات المسموحة — من `OperNo` إلى الرموز

**أولاً: خمسٌ تُمنح من نافذة «صلاحيات العمليات» باختيار الموظف** (`frmOperPermission.xaml.cs:78–91`):

| OperNo | التسمية | المقابل في السحابة |
|---|---|---|
| 1 | 🔒 إغلاق اليومية | `treasury.shift.close` (فتح/إغلاق الوردية) و`treasury.shift.post` (ترحيل قيدها) |
| 2 | ↩️ الترجيع | `sales.return.create` |
| 3 | ☕ الضيافة | بندُ مصروفاتٍ في إغلاق اليومية (`expenses.hospitality`) يُرحَّل بـ`treasury.shift.post` — لا رمز خاصّ |
| 4 | 🏷️ الخصم | `sales.discount.override` — نفس دلالة `ckDiscount` في النافذة الأخرى |
| 5 | 🚢 إستبعاد مركب | `marina.manage` (وحدة المراسي) — لا رمز خاصّ للاستبعاد |

**وثانياً: ثلاث عشرة من نافذة «صلاحيات المستخدمين»** (`User.LoadUserOperPermission` · `Class/User.cs:73–123`):

| OperNo | التسمية الحرفية | خاصية `User` | المقابل في السحابة |
|---|---|---|---|
| 16 | تجاوز الخصم الافتراضي | `PassDefDiscount` | **`sales.discount.override` — منفَّذ ومُختبَر** |
| 8 | تجاوز أعلى سعر بيع | `PassHeighestSalePrice` | `pos.priceoverride` (معلَنٌ في السجل، غير مستعمل — R4) |
| 9 | تجاوز أدنى سعر بيع | `PassLowestSalePrice` | `pos.priceoverride` (R4) |
| 10 | البيع بأقل من متوسط التكلفة | `BuyLessAvrgCost` | لا رمز — مؤجَّل (§R1.8) |
| 11 | تجاوز أعلى سعر شراء | `PassHeighestPurchasePrice` | لا رمز — مؤجَّل (R3) |
| 12 | تجاوز أدنى سعر شراء | `PassLowestPurchasePrice` | لا رمز — مؤجَّل (R3) |
| 13 | تعديل سعر | `EditPrice` | `catalog.price.manage` |
| 14 | تعديل التاريخ في الفواتير | `EditInvDate` | لا رمز — مؤجَّل |
| 15 | الاطلاع على التكلفة | `ShowCosts` | لا رمز — مؤجَّل (§R1.7) |
| 17 | إظهار حسابات الفروع | `ShowBranchsAccounts` | **نطاق الفرع** على العضوية (`branch_scope`) — §R1.7 |
| 18 | إظهار مخزون المواد | `ShowItemsInvertory` | `inventory.view` |
| 19 | تعديل بيانات المادة | `EditItemInfo` | `catalog.item.manage` |
| 20 | إلغاء كلمة المرور على الخصم | `DisableDiscPassword` | لا مقابل — السحابة لا تطلب كلمة مرورٍ على الخصم أصلاً (§R1.7) |

> الأرقام **6 و7** غير مستعملةٍ في الديسكتوب (لا خانةَ لهما في أيٍّ من النافذتين)، فلا
> يُخترع لهما رمز.

### R1.6 القرار: «صلاحية لكل نموذج» ↔ «صلاحية لكل رمز»

الديسكتوب يمنح الصلاحية **لنموذجٍ (شاشة)** بخمسة أفعال، والسحابة تمنحها **لرمزٍ** يصف
فعلَ وحدةٍ واحدة. والقرار — بعد قراءة `SaveFormsPermission` و`LoadTreeNodes` — أن:

1. **النموذج لم يُنقل كشجرة**، ولم يُنشأ جدولُ `forms` ولا `user_permissions`: شجرةُ
   الديسكتوب قائمةُ شاشاتٍ في بياناته، ونظيرُها في السحابة هو سجلّ الرموز (145 رمزاً في
   24 وحدة) الذي تقرأه شاشتا المستخدمين والأدوار من `GET /permissions`.
2. **الأفعال الخمسة لم تُضغط في رمزٍ واحدٍ ولا تُركت بلا مقابل**: لكلّ فعلٍ رمزٌ من عائلة
   المورد نفسها (`.view` · `.create` · `.manage` · `.void` · `.post`)، والطباعة تُستعمل
   فيها صلاحية القراءة المعلَنة على نقطة الطباعة (`sales.invoices/:id/print-data` →
   `sales.view` · `shift-closes/:id/print-data` → `treasury.view`) **بلا اختراع رمز طباعة**.
3. **المنح في السحابة صفوفُ دورٍ لا صفوفُ شاشة**: `role_permissions` يُبدَّل كلّه عند الحفظ
   (كالديسكتوب في حذفه-ثم-إدراجه)، لكن تُكتب `version` وتُسجَّل في التدقيق، وتُرفض رموزٌ
   مجهولة (422) — بينما الديسكتوب كان يقبل أي `Form_id` في الشجرة.
4. **ما تُجيده الشاشة يُقال في الشاشة**: «الاطلاع على التكلفة» و«إظهار حسابات الفروع»
   و«تعديل التاريخ» لا رموز لها اليوم، فالسحابة **لا تدّعي أنها تحجبها**: شاشة الرصيد
   تُظهر «متوسط التكلفة» لمن يملك `inventory.view`، ونطاق الفرع هو ضابط «حسابات الفروع».

### R1.7 ما اخترعناه

1. **نطاق الفرع بديلاً عن `ShowBranchsAccounts`**: الديسكتوب يفتح خانةً فتُفرَّغ
   `Accounting.BranchCondition` فيرى الموظف كل الفروع (`Class/User.cs:111`). وفي السحابة
   صار النطاق **صفةً على العضوية** (`branch_scope: null` = كل الفروع · قائمةٌ = فروعٌ
   مقيَّدة)، تُضبط من الشاشة نفسها وتُقرأ في `branch-scope.guard`. أعمق من الخانة: يحكم
   ما يراه الموظف أينما ذهب لا في المحاسبة وحدها. *(الاسم مخترَعٌ: لم يكن في الديسكتوب
   نطاقٌ اسمه؛ أقربُ نصٍّ إليه هو الخانة س296 وشرط `Accounting.BranchCondition`.)*
2. **حدّ الخصم عمودان على `memberships`**: «هل تُفعَّل الخانة؟» صار رمزاً
   (`sales.discount.override`)، و«إلى أي مدى؟» صار رقماً على العضوية — كما كان الصفُّ في
   `OperMaxDiscount` مفتاحُه الموظف. `null` = بلا حدّ · `0` = حدٌّ يمنع. والدقّة
   `numeric(7,4)` و`numeric(20,4)` بدل `Int` في الديسكتوب (س559: `MaxDicount` و
   `MaxDicountParcent` يُحوَّلان إلى `SqlDbType.Int`) — لأنّ حدّاً بنسبةٍ صحيحةٍ لا يقبل
   7.5٪، والسحابة تبيع بالهللة. والفحص يجمع **خصم السطور + خصم الرأس** وإلا لصار خصمُ
   سطرٍ خصماً بلا حدّ.
3. **«تجاوز الخصم الافتراضي» رمزٌ لا كلمة مرور**: الديسكتوب يطلب كلمة مرورٍ للخصم إن لم
   تُلغَ بالخانة رقم 20. وفي السحابة الرمزُ يرفع الحدّ عن حامله، والحدُّ نفسُه يحكم الباقي
   — فلا كلمةَ مرورٍ على الخصم، ولذلك لا مقابل لخانة «إلغاء كلمة المرور على الخصم».
4. **كلمة المرور لكل عمليةٍ في `OperationPermission.pwd` أُسقطت**: المنح في السحابة
   يُقاس بالرمز في الدور، لا بمفتاحٍ يُكتب عند كل عملية.
5. **«الاطلاع على التكلفة» بلا رمز** (قرارٌ لا سهو): لو أُضيف لوجب ضبطه على كل مسارٍ
   يُظهر تكلفةً — بما فيه التقارير والطباعة — وقبلها لم يكن في السجلّ ما يحمله. سُجّل في
   المؤجَّل صراحةً بدل أن يُدَّعى.

### R1.8 الملفات والاختبارات والأرقام

| ما سُلِّم | الملف |
|---|---|
| دلالة الحدّ والتجاوز | `apps/api/src/common/discount-limit.ts` (109 أسطر) — `assertDiscountWithinLimit` يُستدعى في مسار الإنشاء الوحيد `sales.service.ts` (`createInTx`)، فيمرّ منه الحقل والكاشير والمردود |
| الرابطة `ckDiscount` ↔ الرمز | `packages/contracts/src/permissions.ts:207` · حزمة المالك `rbac.ts:405` |
| مخطّطات الحدّ | `packages/contracts/src/platform/discount-limits.ts` (48) — نسبةٌ 0..100 وقيمةٌ بلا سالب، بأربع خاناتٍ عشرية |
| العمودان | `packages/database/src/schema/tenancy.ts` + ترحيل `0085_membership_discount_limits.sql` (+`.down`) — مطبَّقٌ رقم **86** |
| القراءة | `TenantGuard` يحمّل الحدّين في سياق الطلب · `auth.service.ts` (الدخول) · `identity.service.ts` (`/me`) · `mappers.ts` · `MembershipDto` |
| الكتابة | `memberships.service.ts` (إنشاءٌ وتعديل) — `null` يُكتب صراحةً فلا يبقى حدٌّ قديم |
| الشاشات | `apps/staff/app/settings/users/page.tsx` (عمودُ «حدّ الخصم» · حقولُ الدعوة والتعديل بـ«أعلى نسبة للخصم %» و«أعلى قيمة للخصم») · `sales/invoices/new` و`sales/pos` تعرضان «حدّك: …» قبل الكتابة |
| الاختبار | `apps/api/test/identity-rbac.spec.ts` — **18/18** (منها: حامل `sales.discount.override` يمرّر خصماً فوق حدّه، والعضوية المقَيَّدة نفسها تُرفض 422) |
| التحقّق الحيّ | `scripts/verify-identity-rbac.mjs` — **78/78 في 9 أقسام**، يُعاد تشغيله فيعيد كل حدٍّ إلى خطّ أساسه |

**وسكربت التحقّق يفعل ما تفعله اليد**: يقرأ خطّ الأساس، ثم يدعو مستخدماً (ويُمرّر
مفتاحاً غريباً و150٪ و-5 وبلا أدوار فيُرفض 400)، ثم يضيف فرعاً إلى نطاق عضويةٍ ويلغيه،
ويقرأ السجلّ ويرفض رمزاً مجهولاً، ويثبت أن الكاشير يُرفض 403 على `/memberships` و`/roles`
ويمرّ على `/permissions` و`/sales/invoices` و`/me`، ويضبط حدَّ خصمٍ 5٪ ثم 5٪+10 ويقيس
الرفض 422 بحدّه المُخترَق (`percent` مقابل `amount` والمقدار والأساس في `errors[0]`)،
ويثبت أن خصم السطر والرأس يُجمعان (5+6 > 10)، وأن فاتورةً بلا خصم تمرّ، وأن مَن يحمل
`sales.discount.override` يمرّر 60 على 1000 في حين يُرفض المحاسب والكاشير، ثم **ينظّف**:
يحذف العضوية المدعوّة والفرع المؤقّت ويعيد الحدود `null`.

**وأُصلح أثناء البوابات** (نقدُ المراجعة لم يكشفه، واللينت كشفه): الكتلة التي تعرض الحدّ
في `sales/invoices/new` و`sales/pos` كانت تُسمّي متغيّرها المحلّي `amount`، وقاعدة
`no-restricted-syntax` في `eslint.config.mjs` (المعرّفات النقدية `price|amount|total|
balance|cost|rate`) تمنع **تعريف** معرّفٍ بهذا الاسم خارج `Decimal`/نصّ — فأُعيدت التسمية
إلى `capAmount` وبقيت القيمة نصّيةً كما هي (`8 أخطاء ← 0`).

**ما أُجِّل عن قصد** (يُقرأ مع §6 في `AUDIT_PHASES_01_04.md`): رموزُ تجاوز الأسعار الأربعة
و«البيع بأقل من متوسط التكلفة» و«تعديل التاريخ» (R4 للكاشير وR3 للمشتريات · الرمز
`pos.priceoverride` معلَنٌ غير مستعمل) · «الاطلاع على التكلفة» ·
`Class/ListUsers.cs` و`ListUserPermission.cs` و`ListOperationPermission.cs` (شاشات قوائم
الديسكتوب — لا شاشةَ لها في السحابة، والقائمة هي `GET /memberships`) · «محذوفات»
(الديسكتوب يُظهر المحذوفين بخانة؛ السحابة تُخفي المحذوف وتُعيد 404 — كما في القسم 8 من
السكربت).
