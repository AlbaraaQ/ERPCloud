# 18 — إعادة تصميم كل الواجهات (staff + platform-admin + marketing) إلى مستوى احترافي عالمي

> الهدف: 3 أسطح بمستوى Stripe/Linear/Vercel — كل سطح له شخصيته
> تاريخ: 2026-09-23

---

## 📋 المطالبة الاحترافية الشاملة — انسخها كاملة في محادثة جديدة

```
أنت فريق تصميم UI/UX + Frontend خبير في SaaS. مهمتك إعادة تصميم 3 تطبيقات كاملة إلى مستوى احترافي عالمي.

### السياق العام:
- النظام: Cloud SaaS ERP سعودي — الفرع `arena/01a0acbb-cloud-saas-erp`
- 3 تطبيقات:
  1. `apps/staff` — لوحة الموظفين (ERP) — 232 شاشة ready — Next.js 15 + Tailwind + RTL عربي أولاً
  2. `apps/platform-admin` — لوحة تحكم المنصة (Super Admin) — 34 صفحة — Next.js + Tailwind
  3. `apps/marketing` — الموقع التسويقي — 29 صفحة (18 عربي + 10 إنجليزي) — Next.js + Tailwind + i18n
- الحالي: واجهات وظيفية تعمل لكنها بسيطة — جداول عادية + KPI ثابتة + لا حركات + لا رسوم متقدمة
- المطلوب: 3 مستويات احترافية مختلفة — كل سطح له شخصية

---

### 🎯 أولاً: apps/staff — لوحة الموظفين (ERP) — شخصية: Stripe Dashboard

**الشخصية:** احترافي، هادئ، كثيف بيانات لكن منظم — مثل Stripe/Linear

**Design System:**
- ألوان: primary #2563eb (أزرق احترافي) + slate 50-950 + success #10b981 + warning #f59e0b + danger #ef4444
- خط: Tajawal 400/500/700 للعربي + Inter للإنجليزي + مقاسات مضبوطة h1 32px → h6 14px
- ظلال: 5 مستويات ناعمة shadow-sm → 2xl
- radius: 8 مستويات 4px → 24px
- حركات: 150ms/300ms ease-out

**مكتبة مكونات `apps/staff/components/ui/`:**
- Button: 5 أنواع (primary/secondary/ghost/danger/link) + 3 أحجام + loading spinner + icon + RTL
- Card: header/footer + hover lift 4px + border slate-200 + shadow-sm → shadow-md on hover
- Input: label عائم + error أحمر + icon + RTL + focus ring أزرق
- Table: sticky header + zebra slate-50 + hover slate-100 + skeleton + empty state برسم + ترتيب + checkbox + إجراءات بثلاث نقاط
- Badge: 6 ألوان + dot + حجمين
- Modal/Drawer: backdrop blur + حركة scale 0.95 → 1 + slide من اليمين (RTL)
- Tabs: underline متحرك أزرق
- Select: بحث + أفاتار
- KPI Card: أيقونة في مربع ملون + رقم كبير 32px + نسبة تغير أخضر/أحمر + sparkline صغير + trend
- Chart: Recharts Area/Bar/Donut/Line مع gradient + tooltip مخصص أبيض بظل + حركة رسم 800ms
- Skeleton: لكل مكون + shimmer
- Empty State: أيقونة كبيرة 64px + عنوان + وصف + زر إجراء + رسم توضيحي
- Toast: أيقونة + حركة slide من الأعلى + ألوان حسب النوع
- Avatar: صورة + fallback حرف + حالة online
- Tooltip: أسود مع سهم + حركة

**صفحات تعيد تصميمها بالترتيب:**

1. **Dashboard `/` :**
   - هيدر: "مرحباً أحمد 👋، إليك ملخص اليوم" + تاريخ هجري/ميلادي + زر إجراءات سريعة
   - 4 KPI كبيرة: مبيعات اليوم/هذا الشهر/عملاء متأخرون/أصناف ستنفد — كل واحدة: أيقونة في مربع ملون + رقم 32px + نسبة + sparkline + trend
   - رسمان: Area Chart مبيعات 7 أيام متدرج أزرق→شفاف + Donut توزيع حسب الفرع مع legend
   - جدولان مصغران: آخر 5 فواتير (رقم+عميل بأفاتار+مبلغ+Badge) + أصناف ستنفد مع شارة تحذير صفراء
   - حركات: بطاقات stagger 100ms + أرقام count-up + رسم يرسم نفسه
   - خلفية: شبكة نقطية خفيفة slate-100

2. **قائمة الفواتير `/sales/invoices` :**
   - شريط فلاتر علوي: بحث مع أيقونة + تاريخ + حالة chips ملونة + فرع + زر فلتر متقدم + زر إنشاء أزرق كبير
   - جدول: checkbox + رقم فاتورة أزرق + عميل بأفاتار + مبلغ + حالة Badge + تاريخ نسبي "منذ ساعتين" + قائمة إجراءات
   - شريط سفلي عند التحديد: "3 محدد" + إجراءات جماعية
   - Empty: رسم فاتورة + "لا توجد فواتير" + زر إنشاء
   - حركات: صف hover ظل + إجراءات تظهر

3. **بطاقة الفاتورة `/sales/invoices/[id]` :**
   - هيدر: رقم كبير + حالة Badge كبيرة + شريط تقدم (مسودة→مرحلة→مدفوعة) + أزرار طباعة/تعديل/حذف
   - عمودان: يسار تفاصيل العميل + بنود مع صورة صنف + كمية +/- + سعر + إجمالي + حركة حذف ناعمة
   - يمين: ملخص مالي + Donut ضريبة + Timeline (من أنشأ، متى رُحّل)
   - ملخص سفلي: Subtotal + ضريبة + خصم + إجمالي 28px bold

4. **التقارير `/reports/[key]` :**
   - هيدر: عنوان + فلاتر تاريخ جميلة + زر تصدير CSV/PDF + طباعة
   - 3-4 بطاقات ملخص علوية
   - رسم كبير تفاعلي Bar/Line مع tooltip جميل + ألوان متناسقة
   - جدول مع ترتيب + بحث
   - حركات: رسم يرسم نفسه

5. **الإعدادات `/settings/*` :**
   - Sidebar جانبي للتنقل + محتوى رئيسي ببطاقات مع أيقونة + toggle جميل

---

### 🛡️ ثانياً: apps/platform-admin — لوحة المنصة — شخصية: Vercel + Linear Dark

**الشخصية:** تقني، داكن، كثيف بيانات، للمطورين — مثل Vercel Dashboard / Linear

**Design System مختلف:**
- ألوان: خلفية slate-950 داكنة للـ Sidebar + محتوى أبيض/فاتح — أو ثيم داكن كامل اختياري
- ألوان: primary بنفسجي #7c3aed + slate + ألوان حالة
- خط: JetBrains Mono للأرقام/الأكواد + Inter/Tajawal للنص
- بطاقات: border + shadow أقل + أكثر حدة
- جداول: كثيفة، خط صغير 13px، monospace للأرقام

**مكتبة مكونات `apps/platform-admin/components/ui/`:**
- نفس المكونات لكن بثيم داكن للـ Sidebar + ثيم فاتح للمحتوى
- Metric Card: رقم monospace كبير + رسم صغير + حالة
- Health Badge: أخضر/أحمر مع نبض pulse
- Log Table: monospace + ألوان حسب المستوى + sticky
- Code Block: مع نسخ + تمييز

**صفحات تعيد تصميمها:**

1. **Overview `/` :**
   - 6 بطاقات MRR/ARR/عملاء/استخدام/صحة/مهام — كل واحدة رقم monospace + sparkline + trend
   - رسمان: MRR 30 يوم Area بنفسجي + استخدام 7 أيام Bar
   - جدولان: آخر عملاء + تنبيهات صحة مع نبض
   - حركات: نبض للتنبيهات + count-up

2. **العملاء `/tenants` :**
   - جدول كثيف: شعار + اسم + خطة Badge + حالة + MRR monospace + استخدام شريط + إجراءات
   - فلاتر: خطة + حالة + بحث
   - بطاقة عميل `/tenants/[id]` بتبويبات 8 مع أيقونات + محتوى منظم

3. **الفوترة `/invoices`, `/subscriptions`, `/revenue` :**
   - جداول مالية مع أرقام monospace + شارات حالة + رسوم MRR
   - `/revenue`: رسم Area كبير + جدول تفصيلي

4. **العمليات `/jobs`, `/health`, `/files`, `/backups` :**
   - `/health`: 6 مجسات مع شارة خضراء/حمراء + رسم p95 + لافتة حادثة حمراء إن وجدت
   - `/jobs`: جدول طابور مع حالة + نبض + إجراءات إعادة/إلغاء
   - `/files`: جدول ملفات مع فحص + حجر + معاينة

5. **التحليلات `/analytics` :**
   - قمع: سجل→فعل→رحل→زاتكا مع نسب + رسم قمع
   - أفواج + تنبيهات + تصدير CSV

---

### 🌐 ثالثاً: apps/marketing — الموقع التسويقي — شخصية: Stripe + Linear Landing

**الشخصية:** تسويقي، جذاب، متحرك، يبيع — مثل Stripe.com / Linear.app

**Design System مختلف:**
- ألوان: تدرجات جريئة أزرق→بنفسجي + خلفيات داكنة/فاتحة متناوبة + ألوان نيون خفيفة
- خط: كبير جداً للعناوين 48-72px bold + نص 18px + مسافات واسعة
- حركات: كثيرة لكن ناعمة — parallax + fade + slide + gradient animation
- بطاقات: زجاجية glassmorphism + تدرجات + ظلال كبيرة

**مكتبة مكونات `apps/marketing/components/ui/`:**
- Button: كبير + تدرج + حركة hover scale + shadow
- Card: زجاجي + تدرج حدود + hover lift كبير
- Feature Card: أيقونة كبيرة + عنوان + وصف + رسم صغير
- Pricing Card: مع شارة "الأكثر شيوعاً" + تدرج + قائمة حقوق مع ✓
- Testimonial: مع أفاتار + نجوم + اقتباس
- FAQ: accordion متحرك
- Hero: مع رسم/صورة + تدرج خلفية متحرك

**صفحات تعيد تصميمها:**

1. **الرئيسية `/` :**
   - Hero: عنوان كبير 64px "نظام ERP سحابي سعودي متكامل" + وصف 20px + زرين (ابدأ مجاناً + عرض توضيحي) + رسم Dashboard متحرك + تدرج خلفية أزرق→بنفسجي متحرك + شبكة نقطية
   - شريط شعارات عملاء (إن وجد) متحرك
   - 6 ميزات: أيقونة كبيرة + عنوان + وصف + رسم صغير + حركة عند scroll
   - قسم زاتكا: شارة + شرح + رسم فاتورة
   - قسم إحصائيات: 4 أرقام كبيرة مع count-up عند scroll
   - شهادات عملاء: 3 بطاقات مع نجوم
   - CTA أخير: تدرج كبير + زر
   - Footer: روابط + نشرة بريدية + أيقونات تواصل

2. **الأسعار `/pricing` :**
   - مبدل شهري/سنوي متحرك + توفير 20%
   - 3 بطاقات أسعار: أساسية/احترافية/مؤسسية — الوسطى مميزة بتدرج + شارة
   - جدول مقارنة حقوق مع ✓/✗
   - أسئلة شائعة accordion
   - حركات: بطاقات stagger + hover lift

3. **المحتوى `/blog`, `/cases`, `/help` :**
   - شبكة مقالات ببطاقات مع صورة + تاريخ + عنوان + وصف + حركة hover
   - صفحة مقال: هيدر كبير + محتوى منسق + مشاركة + مقالات ذات صلة

4. **التواصل `/contact`, `/demo` :**
   - نموذج جميل مع حقول عائمة + زر تدرج + رسم جانبي
   - معلومات تواصل مع أيقونات

5. **عام:**
   - Navbar شفاف يصبح أبيض عند scroll + حركة
   - Footer كبير مع روابط + نشرة + تدرج
   - حركات scroll: كل قسم يظهر fade+slide عند دخول الشاشة (IntersectionObserver + Framer Motion)
   - خلفيات: تدرجات + شبكات نقطية + أشكال هندسية خفيفة

---

### 🛠️ التقنية الموحدة للثلاثة:

- لا تغير API أو DB — فقط UI
- لا تغير `navigation.ts` في staff — فقط حسّن عرضه
- استخدم: `framer-motion` + `recharts` (أو `tremor`) + `lucide-react` للأيقونات
- Tailwind فقط — لا MUI/Ant Design
- مكونات في `components/ui/` لكل تطبيق — كل مكون ملف واحد
- حافظ على RTL — لا تكسره
- Dark mode variables جاهزة (CSS variables)
- Responsive موبايل أولاً

**مكتبات تثبتها في كل تطبيق:**
```json
{
  "framer-motion": "^11.0.0",
  "recharts": "^2.12.0",
  "lucide-react": "^0.400.0"
}
```

**للتسويقي إضافي:**
```json
{
  "clsx": "^2.0.0",
  "tailwind-merge": "^2.0.0"
}
```

### 📏 معايير القبول:

**staff:**
- [ ] build أخضر First Load <150kB + tsc 0 + Lighthouse >90
- [ ] Dashboard جديد Area+Donut+KPI+stagger
- [ ] جداول احترافية + Empty State + حركات 60fps
- [ ] RTL سليم + موبايل بطاقات

**platform-admin:**
- [ ] build أخضر + ثيم داكن Sidebar + أرقام monospace
- [ ] Overview MRR+Health مع نبض + رسوم
- [ ] جداول كثيفة + Log + Health badges
- [ ] Lighthouse >90

**marketing:**
- [ ] build أخضر + Lighthouse >95 + Performance >90
- [ ] Hero بتدرج متحرك + Dashboard متحرك
- [ ] Pricing ببطاقات مميزة + جدول مقارنة + FAQ
- [ ] حركات scroll fade+slide + count-up + parallax خفيف
- [ ] Navbar شفاف→أبيض + Footer كبير + SEO (sitemap/robots/OG) سليم
- [ ] موبايل جميل + RTL/EN

**عام:**
- [ ] لا كسر API + لا إيموجي عشوائي + لا مكتبات ثقيلة
- [ ] حركات 150-300ms فقط + 60fps
- [ ] Dark variables جاهزة

### 🚀 ترتيب التنفيذ (مهم — مرحلة واحدة في النافذة):

**المرحلة 1 — Design System موحد (1 يوم):**
- أنشئ tailwind.config.ts + globals.css لكل تطبيق مع ألوان + خطوط + ظلال + حركات
- ثبت المكتبات الثلاثة في كل تطبيق
- ابنِ Button + Card + Badge + Skeleton كأساس

**المرحلة 2 — staff Dashboard (1.5 يوم):**
- أعد تصميم `/` فقط — KPI + Area + Donut + جداول مصغرة + حركات
- توقف — أرني لقطة شاشة

**المرحلة 3 — staff قوائم وبطاقات (2 أيام):**
- `/sales/invoices` + `/sales/invoices/[id]` + `/reports/[key]`

**المرحلة 4 — platform-admin (2 أيام):**
- Overview + tenants + revenue + health + jobs

**المرحلة 5 — marketing (2.5 أيام):**
- `/` Hero + Features + Pricing + Footer + حركات scroll

**المرحلة 6 — باقي الشاشات تدريجياً**

### ممنوع:
- لا تغير منطق API/DB
- لا تكسر RTL
- لا MUI/Ant Design
- لا إيموجي في الأزرار الرئيسية — Lucide فقط
- لا حركات >400ms أو ثقيلة
- لا ألوان نيون قوية في staff/platform — فقط marketing
- لا تغير مسارات — فقط تصميمها

أريد 3 واجهات تقول:
- staff: "هذا ERP يدفع عليه 500 ريال شهرياً بلا تردد" (Stripe)
- platform-admin: "هذه لوحة تحكم بمستوى Vercel" (تقني)
- marketing: "هذا موقع يبيع مثل Stripe.com" (تسويقي)

ابدأ الآن بالمرحلة 1 — Design System للثلاثة.
```

---

## 🎯 شرح المطالبة

### لماذا 3 شخصيات مختلفة؟

- **staff** = يستخدمه محاسب 8 ساعات يومياً → يحتاج هدوء + كثافة + تنظيم (Stripe)
- **platform-admin** = يستخدمه مطور/DevOps → يحتاج داكن + monospace + كثيف (Vercel)
- **marketing** = يراه عميل لأول مرة 10 ثوانٍ → يحتاج إبهار + تدرجات + حركات (Stripe.com)

### ترتيب التنفيذ المقترح:

1. **يوم 1:** Design System للثلاثة + Button/Card/Badge/Skeleton
2. **يوم 2-3:** staff Dashboard `/` — KPI + Area + Donut + stagger
3. **يوم 4-5:** staff قوائم + بطاقات
4. **يوم 6-7:** platform-admin Overview + Tenants + Health
5. **يوم 8-10:** marketing Hero + Pricing + Features + حركات scroll

### ملفات أرفقها مع المطالبة في المحادثة الجديدة:

```
apps/staff/app/globals.css
apps/staff/tailwind.config.ts
apps/staff/components/app-shell.tsx
apps/staff/app/page.tsx
apps/platform-admin/app/globals.css
apps/platform-admin/tailwind.config.ts
apps/platform-admin/app/page.tsx
apps/marketing/app/globals.css
apps/marketing/tailwind.config.ts
apps/marketing/app/page.tsx
```

### أمثلة إلهام أرسلها:

- staff: https://dashboard.stripe.com + https://linear.app
- platform-admin: https://vercel.com/dashboard + https://github.com/dashboard
- marketing: https://stripe.com + https://linear.app/homepage + https://www.tremor.so

---

## ✅ قائمة تحقق نهائية

- [ ] 3 Design Systems (staff هادئ أزرق، platform داكن بنفسجي، marketing تدرجات جريئة)
- [ ] 3 مكتبات UI في components/ui/ لكل تطبيق
- [ ] staff Dashboard جديد + قوائم + بطاقات + تقارير
- [ ] platform Overview MRR + Health نبض + جداول كثيفة
- [ ] marketing Hero تدرج متحرك + Pricing مميز + حركات scroll
- [ ] حركات 60fps + RTL سليم + موبايل جميل + Builds خضراء + Lighthouse >90/95

---

> الفرع: `arena/01a0acbb-cloud-saas-erp` — اعمل عليه فقط — مرحلة واحدة في النافذة ثم توقف
