# 17 — إعادة تصميم الواجهات إلى مستوى SaaS احترافي (UI/UX Pro)

> الهدف: تحويل 232 شاشة من واجهات وظيفية إلى واجهات احترافية بمستوى Stripe / Linear / Vercel مع رسوم بيانية وحركات جمالية
> الحالة: وثيقة مطالبة جاهزة للنسخ في محادثة جديدة

---

## 📋 المطالبة الاحترافية الجاهزة للنسخ (انسخ من هنا)

```
أنت مصمم UI/UX خبير + مطور Frontend متخصص في SaaS ERP. مهمتك إعادة تصميم واجهات نظامي السحابي إلى مستوى احترافي عالمي.

### السياق:
- النظام: Cloud SaaS ERP سعودي — 232 شاشة ready في apps/staff + لوحة منصة 34 صفحة + موقع تسويقي 29 صفحة + بوابة عملاء 10 صفحات
- التقنية: Next.js 15.5.25 + Tailwind CSS + TypeScript + شاشات RTL عربية أولاً
- الحالي: واجهات وظيفية تعمل لكنها بسيطة — جداول عادية + بطاقات KPI ثابتة + لا حركات + لا رسوم بيانية متقدمة
- المطلوب: واجهات احترافية من الآخر — مثل Stripe Dashboard + Linear + Vercel + Notion

### ما أريده بالضبط:

#### 1. نظام تصميم (Design System) موحد:
- إنشاء `apps/staff/app/globals.css` جديد + `tailwind.config.ts` محدث مع:
  - لوحة ألوان احترافية: primary #2563eb + neutral slate + semantic (success #10b981 / warning #f59e0b / danger #ef4444) + درجات 50-950
  - تايبوغرافي: خط Tajawal / IBM Plex Arabic للعربي + Inter للإنجليزي + مقاسات h1-h6 + line-height مضبوط
  - مسافات: نظام 4px (4,8,12,16,24,32,48)
  - ظلال: 5 مستويات shadow-sm → shadow-2xl ناعمة
  - نصف قطر: 8 مستويات radius
  - حركات: transition 150ms/300ms + ease-out/in-out

#### 2. مكتبة مكونات احترافية (استبدل المكونات الحالية):
- Button: 5 أنواع (primary/secondary/ghost/danger/link) + 3 أحجام + loading + icon
- Card: مع header/footer + hover lift + border subtle
- Input: مع label عائم + error + icon + RTL
- Table: مع sticky header + zebra + hover + skeleton loading + empty state جميل + ترتيب
- Badge: 6 ألوان + dot
- Modal/Drawer: مع backdrop blur + حركة slide
- Tabs: مع underline متحرك
- Dropdown/Select: مع بحث + صور
- KPI Card: مع أيقونة + trend + sparkline
- Chart: خط/عمود/دائري/مساحة باستخدام Recharts أو Chart.js مع ألوان متناسقة
- Skeleton: لكل مكون
- Empty State: مع أيقونة كبيرة + نص + زر إجراء
- Toast: مع أيقونة + حركة

#### 3. إعادة تصميم الصفحات الرئيسية (ابدأ بهذه بالترتيب):

**أ. لوحة التحكم `/` (Dashboard):**
- هيدر ترحيبي: "مرحباً أحمد، إليك ملخص اليوم" + تاريخ هجري/ميلادي
- 4 بطاقات KPI كبيرة مع: أيقونة + رقم + نسبة تغير + sparkline صغير + لون حسب الحالة
- رسمان بيانيان: مبيعات 7 أيام (Area Chart متدرج) + توزيع حسب الفرع (Donut)
- جدولان مصغران: آخر 5 فواتير + أصناف ستنفد مع شارة تحذير
- حركات: بطاقات تظهر بتأخير متدرج (stagger 100ms) + أرقام تعد تصاعدياً (count-up)
- خلفية: شبكة نقطية خفيفة + بطاقات بظل ناعم

**ب. قائمة الفواتير `/sales/invoices`:**
- شريط فلاتر علوي جميل: بحث + تاريخ + حالة (chips) + فرع + زر فلتر متقدم
- جدول احترافي: checkbox + رقم فاتورة بلون + عميل مع أفاتار + مبلغ + حالة Badge ملونة + تاريخ نسبي "منذ ساعتين" + قائمة إجراءات بثلاث نقاط
- شريط أدوات سفلي عند التحديد: عدد المحدد + إجراءات جماعية
- Empty State: "لا توجد فواتير" مع رسم توضيحي + زر إنشاء
- حركات: صف يظهر عند hover مع ظل + إجراءات تظهر

**ج. بطاقة الفاتورة `/sales/invoices/[id]`:**
- هيدر: رقم + حالة كبيرة + أزرار إجراءات + شريط تقدم (مسودة→مرحلة→مدفوعة)
- عمودان: يسار تفاصيل + يمين ملخص مالي مع رسم دائري للضريبة
- جدول بنود مع: صورة صنف + اسم + كمية مع +/- + سعر + إجمالي + حركة حذف ناعمة
- ملخص: Subtotal + ضريبة + خصم + إجمالي بخط كبير
- Timeline جانبي: من أنشأ، متى رُحّل، من دفع

**د. التقارير `/reports/[key]`:**
- هيدر مع فلاتر تاريخ جميلة + زر تصدير + طباعة
- بطاقات ملخص علوية 3-4
- رسم بياني كبير تفاعلي (Bar/Line) مع tooltip جميل + ألوان متدرجة
- جدول مع ترتيب + بحث + تصدير
- حركات: الرسم يرسم نفسه عند التحميل

**هـ. الإعدادات `/settings/*`:**
- Sidebar جانبي للتنقل + محتوى رئيسي
- بطاقات إعدادات مع أيقونة + وصف + toggle جميل

#### 4. رسوم بيانية وإحصائيات:
- استخدم Recharts (أو Tremor) — لا Chart.js قديم
- كل رسم: gradient fill + tooltip مخصص جميل + حركة رسم 800ms + responsive
- ألوان: لوحة واحدة متناسقة (أزرق/بنفسجي/أخضر) — لا ألوان عشوائية
- إحصائيات: أرقام كبيرة + trend أخضر/أحمر + مقارنة

#### 5. حركات جمالية (Framer Motion):
- Page transition: fade + slide 200ms
- Card hover: lift 4px + shadow increase
- Button: scale 0.98 عند ضغط
- List: stagger children 50ms
- Modal: backdrop blur + scale from 0.95
- Skeleton → Content: crossfade
- لا إفراط — حركات ناعمة سريعة (150-300ms)

#### 6. تحسينات عامة:
- RTL كامل مضبوط — لا كسر
- Dark mode جاهز (حتى لو غير مفعل — استخدم CSS variables)
- Responsive: موبايل أولاً — جداول تتحول لبطاقات في الموبايل
- Loading states جميلة في كل مكان — لا فراغ أبيض
- Empty states مع رسوم توضيحية
- أفاتار + شارات + Tooltips
- شريط جانبي قابل للطي مع أيقونات + نص

### التقنية:
- لا تغير API — فقط UI
- لا تغير `navigation.ts` — فقط حسّن عرضه
- استخدم `framer-motion` + `recharts` + `lucide-react` للأيقونات (استبدل الإيموجي بأيقونات احترافية لكن احتفظ بالعربية)
- Tailwind فقط — لا CSS modules كثيرة
- مكونات في `apps/staff/components/ui/` — كل مكون ملف واحد
- حافظ على `lib/reports.ts` و `lib/api.ts`

### معايير القبول:
- [ ] `pnpm --filter @erp/staff build` أخضر + First Load < 150kB
- [ ] `pnpm --filter @erp/staff exec tsc --noEmit` 0 أخطاء
- [ ] كل شاشة رئيسية (/, /sales/invoices, /sales/invoices/[id], /reports/[key], /settings/*) بتصميم جديد
- [ ] Lighthouse: Performance >90, Accessibility >95
- [ ] RTL لا ينكسر + موبايل جميل
- [ ] حركات 60fps — لا تقطيع
- [ ] Dark mode variables جاهزة
- [ ] لا إيموجي عشوائي — أيقونات Lucide متناسقة

### ابدأ بهذا الترتيب:
1. Design System (colors, typography, shadows, motion) — 1 يوم
2. مكتبة مكونات UI (Button, Card, Table, KPI, Chart) — 2 أيام
3. Dashboard `/` — 1 يوم
4. قائمة الفواتير + بطاقة — 1.5 يوم
5. التقارير + رسوم — 1 يوم
6. باقي الشاشات تدريجياً

### ممنوع:
- لا تغير منطق API أو DB
- لا تكسر RTL
- لا تستخدم مكتبات ثقيلة (لا MUI, لا Ant Design)
- لا إيموجي في الأزرار الرئيسية — أيقونات احترافية
- لا حركات بطيئة >400ms
- لا ألوان نيون أو تدرجات قوية

أريد واجهات تقول "هذا نظام يدفع عليه 500 ريال شهرياً بلا تردد" — مستوى Stripe/Linear.

ابدأ الآن بـ Design System + Dashboard.
```

---

## 🎯 شرح المطالبة (للمطور)

### لماذا هذه الصيغة تعمل؟

1. **محددة جداً:** تذكر أسماء ملفات حقيقية (`navigation.ts`, `globals.css`, `lib/reports.ts`)
2. **تذكر أمثلة عالمية:** Stripe/Linear/Vercel — يعرفها كل مصمم
3. **تمنع الأخطاء:** "لا تغير API" + "لا تكسر RTL" + "لا MUI"
4. **ترتيب واضح:** Design System أولاً ثم Dashboard ثم الباقي
5. **معايير قابلة للقياس:** Lighthouse >90, First Load <150kB, 60fps

### ماذا تتوقع من المحادثة الجديدة؟

المحادثة الجديدة ستبدأ بـ:

1. **يوم 1:** ينشئ `tailwind.config.ts` + `globals.css` مع نظام ألوان + يثبت `framer-motion + recharts + lucide-react`
2. **يوم 2-3:** يبني `components/ui/` — Button, Card, Table, KPI, Chart, Skeleton, Empty
3. **يوم 4:** يعيد تصميم `/` Dashboard مع رسوم Area + Donut + حركات stagger
4. **يوم 5-6:** يعيد تصميم `/sales/invoices` + `/sales/invoices/[id]`
5. **يوم 7:** يعيد تصميم `/reports/[key]` مع رسوم تفاعلية

### نصائح لاستخدام المطالبة:

- **انسخ المطالبة كاملة** كما هي — لا تختصر
- **أرفق معها:** `apps/staff/app/globals.css` الحالي + `tailwind.config.ts` + صورة من Dashboard الحالي (إن وجد)
- **قل له:** "ابدأ بـ Design System فقط وتوقف — أريد أرى الألوان أولاً" — حتى لا يبني كل شيء مرة واحدة
- **بعد كل مرحلة:** `pnpm --filter @erp/staff build` + لقطة شاشة

### مكتبات مقترحة (مذكورة في المطالبة):

```json
{
  "framer-motion": "^11.0.0",
  "recharts": "^2.12.0",
  "lucide-react": "^0.400.0"
}
```

- `framer-motion` للحركات
- `recharts` للرسوم (أخف من Chart.js وأجمل مع Tailwind)
- `lucide-react` للأيقونات (بديل احترافي للإيموجي)

### أمثلة إلهام (أرسلها مع المطالبة):

- Stripe Dashboard: https://dashboard.stripe.com
- Linear: https://linear.app
- Vercel Dashboard: https://vercel.com/dashboard
- Tremor Dashboard: https://www.tremor.so
- shadcn/ui: https://ui.shadcn.com

---

## 📁 ملفات إضافية تحتاجها المحادثة الجديدة

عندما تبدأ المحادثة الجديدة، أرفق:

1. هذه الوثيقة
2. `apps/staff/app/globals.css` الحالي
3. `apps/staff/tailwind.config.ts` الحالي
4. `apps/staff/components/app-shell.tsx` — الشريط الجانبي
5. `apps/staff/app/page.tsx` — Dashboard الحالي
6. لقطة شاشة من النظام الحالي (إن أمكن)

---

## ✅ قائمة تحقق بعد التنفيذ

- [ ] Design System موحد (ألوان + خطوط + ظلال + حركات)
- [ ] 10 مكونات UI احترافية في `components/ui/`
- [ ] Dashboard جديد مع رسوم Area + Donut + KPI + stagger
- [ ] قائمة فواتير بجدول احترافي + Empty State
- [ ] بطاقة فاتورة بعمودين + Timeline
- [ ] تقارير برسوم تفاعلية
- [ ] حركات 60fps في كل مكان
- [ ] RTL سليم + موبايل جميل
- [ ] Build أخضر + First Load <150kB
- [ ] Lighthouse >90
- [ ] لا كسر API

---

> هذه الوثيقة جاهزة — انسخ المطالبة أعلاه والصقها في محادثة جديدة مع ذكر الفرع `arena/01a0acbb-cloud-saas-erp`
