# مطالبة احترافية لإعادة تصميم الواجهات — نسخة سريعة للنسخ

> انسخ المطالبة أدناه كاملة والصقها في محادثة جديدة — ستعطيك واجهات بمستوى Stripe/Linear

---

## 🚀 المطالبة الجاهزة (نسخة مختصرة سريعة)

```
أعد تصميم واجهات apps/staff إلى مستوى SaaS احترافي عالمي مثل Stripe Dashboard + Linear.

السياق: ERP سعودي 232 شاشة، Next.js 15 + Tailwind + RTL عربي أولاً. الواجهات الحالية وظيفية لكن بسيطة.

المطلوب:
1. Design System: ألوان احترافية (primary #2563eb + slate + success/warning/danger) + خط Tajawal/Inter + ظلال ناعمة 5 مستويات + حركات 150-300ms + radius 8 مستويات في globals.css + tailwind.config.ts

2. مكتبة مكونات في components/ui/: Button (5 أنواع + loading) + Card (hover lift) + Table (sticky + skeleton + empty) + KPI Card (أيقونة + trend + sparkline) + Chart (Recharts Area/Bar/Donut مع gradient + tooltip جميل) + Badge + Modal (backdrop blur) + Skeleton + Empty State + Toast + Input (label عائم)

3. أعد تصميم بالترتيب:
   - `/` Dashboard: هيدر ترحيبي + 4 KPI كبيرة مع sparkline + رسمين Area و Donut متدرجين + جدولين مصغران + حركات stagger 100ms + count-up للأرقام + خلفية نقطية خفيفة
   - `/sales/invoices`: فلاتر chips جميلة + جدول احترافي (أفاتار عميل + Badge ملون + تاريخ نسبي) + شريط إجراءات جماعية + Empty State برسم
   - `/sales/invoices/[id]`: هيدر مع حالة كبيرة + شريط تقدم + عمودين (تفاصيل + ملخص مالي مع Donut) + جدول بنود مع صورة + Timeline
   - `/reports/[key]`: فلاتر تاريخ + 3 بطاقات ملخص + رسم كبير تفاعلي + جدول
   - `/settings/*`: Sidebar + بطاقات مع toggle جميل

4. رسوم: Recharts فقط — gradient + tooltip مخصص + حركة 800ms + ألوان متناسقة (أزرق/بنفسجي/أخضر) + responsive

5. حركات Framer Motion: page fade+slide 200ms + card hover lift 4px + button scale 0.98 + list stagger 50ms + modal scale 0.95 + skeleton crossfade — كلها 150-300ms، 60fps

6. تحسينات: RTL سليم + موبايل بطاقات بدل جدول + Dark mode variables + Loading جميل + Empty برسم + Lucide icons بدل إيموجي + Sidebar قابل للطي

التقنية: لا تغير API/DB/navigation.ts — Tailwind فقط — framer-motion + recharts + lucide-react — مكونات في components/ui/

معايير: build أخضر <150kB + tsc 0 + Lighthouse >90 + RTL سليم + 60fps + لا إيموجي عشوائي + لا MUI/Ant

ابدأ بـ Design System + Dashboard فقط وتوقف لأراجع الألوان.

أريد واجهات تقول "هذا نظام بـ 500 ريال شهرياً بلا تردد".
```

---

## 📎 النسخة الكاملة المفصلة

انظر `docs/future-enhancements/17_UI_REDESIGN_PRO_PROMPT.md` — فيها نفس المطالبة لكن مفصلة مع شرح + أمثلة + قائمة تحقق + مكتبات.

---

## 🎨 أمثلة إلهام أرسلها مع المطالبة

- Stripe: https://dashboard.stripe.com
- Linear: https://linear.app/features
- Tremor: https://www.tremor.so
- shadcn: https://ui.shadcn.com
- Vercel: https://vercel.com/dashboard

---

## 📦 ملفات أرفقها مع المطالبة في المحادثة الجديدة

1. `apps/staff/app/globals.css`
2. `apps/staff/tailwind.config.ts`
3. `apps/staff/components/app-shell.tsx`
4. `apps/staff/app/page.tsx`
5. هذه الوثيقة

---

> الفرع: `arena/01a0acbb-cloud-saas-erp` — اعمل عليه فقط
