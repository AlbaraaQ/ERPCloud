# مطالبة شاملة — إعادة تصميم كل الواجهات (staff + platform-admin + marketing)

> نسخة سريعة جاهزة للنسخ — انسخ المطالبة داخل ``` والصقها في محادثة جديدة

---

## 🚀 المطالبة الجاهزة (انسخ من هنا)

```
أعد تصميم 3 تطبيقات كاملة إلى مستوى احترافي عالمي: staff (Stripe) + platform-admin (Vercel) + marketing (Stripe.com)

السياق: ERP سعودي 232 شاشة staff + 34 صفحة platform-admin + 29 صفحة marketing — Next.js 15 + Tailwind + RTL

### staff — شخصية Stripe Dashboard:
- Design System: primary #2563eb + slate + success/warning/danger + Tajawal/Inter + ظلال 5 مستويات + حركات 150-300ms
- مكونات components/ui/: Button 5 أنواع + Card hover lift + Table sticky+skeleton+empty + KPI Card (أيقونة+رقم32px+trend+sparkline) + Chart Recharts Area/Bar/Donut gradient+tooltip + Badge + Modal blur + Skeleton + Empty + Toast + Avatar
- صفحات: 
  - `/` Dashboard: هيدر ترحيبي + 4 KPI كبيرة + Area 7 أيام متدرج + Donut فروع + جدولين مصغران + stagger 100ms + count-up
  - `/sales/invoices`: فلاتر chips + جدول احترافي (أفاتار+Badge+تاريخ نسبي) + شريط إجراءات جماعية + Empty برسم
  - `/sales/invoices/[id]`: هيدر حالة كبيرة + شريط تقدم + عمودين + Donut ضريبة + Timeline
  - `/reports/[key]`: فلاتر تاريخ + 3 بطاقات + رسم كبير تفاعلي + جدول
  - `/settings/*`: Sidebar + بطاقات toggle جميل

### platform-admin — شخصية Vercel Dark:
- Design System: Sidebar slate-950 داكن + محتوى فاتح + primary بنفسجي #7c3aed + JetBrains Mono للأرقام + بطاقات حادة
- مكونات: Metric Card monospace + Health Badge نبض pulse + Log Table monospace + Code Block
- صفحات:
  - `/` Overview: 6 بطاقات MRR/ARR/عملاء/صحة + Area MRR بنفسجي + Bar استخدام + جدول عملاء + تنبيهات نبض
  - `/tenants`: جدول كثيف شعار+خطة Badge+MRR monospace+شريط استخدام
  - `/revenue`, `/invoices`, `/subscriptions`: جداول مالية monospace + رسوم
  - `/health`, `/jobs`, `/files`, `/backups`: مجسات خضراء/حمراء نبض + طابور + فحص ملفات

### marketing — شخصية Stripe.com Landing:
- Design System: تدرجات جريئة أزرق→بنفسجي + عناوين 48-72px + مسافات واسعة + glassmorphism + حركات كثيرة ناعمة
- مكونات: Button تدرج + Card زجاجي + Feature Card أيقونة كبيرة + Pricing Card مميزة + Testimonial + FAQ accordion + Hero برسم متحرك
- صفحات:
  - `/` : Hero 64px + زرين + Dashboard متحرك + تدرج متحرك + شبكة نقطية + 6 ميزات + إحصائيات count-up + شهادات + CTA تدرج + Footer كبير + Navbar شفاف→أبيض عند scroll
  - `/pricing`: مبدل شهري/سنوي + 3 بطاقات (الوسطى مميزة) + جدول مقارنة + FAQ
  - `/blog`, `/cases`, `/help`: شبكة بطاقات + صفحة مقال منسقة
  - `/contact`, `/demo`: نموذج حقول عائمة + رسم جانبي
  - حركات scroll: كل قسم fade+slide عند دخول الشاشة + parallax خفيف

### تقنية موحدة:
- لا تغير API/DB/navigation.ts — Tailwind فقط — framer-motion + recharts + lucide-react في كل تطبيق
- مكونات في components/ui/ لكل تطبيق
- RTL سليم + Responsive موبايل بطاقات + Dark variables + 60fps + حركات 150-300ms فقط
- لا MUI/Ant + لا إيموجي عشوائي + لا ألوان نيون في staff/platform

### معايير:
- staff: build <150kB + tsc 0 + Lighthouse >90 + RTL سليم
- platform: build أخضر + ثيم داكن + monospace + نبض + Lighthouse >90
- marketing: build أخضر + Lighthouse >95 + Performance >90 + حركات scroll + موبايل جميل

### ترتيب:
1. Design System للثلاثة + Button/Card/Badge/Skeleton (1 يوم)
2. staff Dashboard `/` فقط وتوقف (1.5 يوم)
3. staff قوائم وبطاقات (2 أيام)
4. platform Overview+Tenants+Health (2 أيام)
5. marketing Hero+Pricing+Features (2.5 أيام)
6. الباقي تدريجياً

ابدأ بالمرحلة 1 — Design System للثلاثة.

أريد:
- staff: "ERP بـ 500 ريال بلا تردد" (Stripe)
- platform: "لوحة بمستوى Vercel"
- marketing: "موقع يبيع مثل Stripe.com"
```

---

## 📎 النسخة المفصلة الكاملة

انظر `docs/future-enhancements/18_UI_REDESIGN_ALL_APPS_PRO_PROMPT.md` — 400+ سطر مع شرح كل صفحة + أمثلة + قائمة تحقق.

---

## 📦 ملفات أرفقها مع المطالبة

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

## 🎨 إلهام

- staff: dashboard.stripe.com + linear.app
- platform: vercel.com/dashboard + github dashboard
- marketing: stripe.com + linear.app/homepage + tremor.so

> الفرع: `arena/01a0acbb-cloud-saas-erp` — مرحلة واحدة ثم توقف
