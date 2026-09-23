# 06 — نقطة بيع أوفلاين + PWA + مسح كاميرا

> الأولوية: P2 - 2 أسبوع
> السوق: Foodics / Salla POS — مطلوب في المرسى والمحلات بلا نت

## المشكلة
POS الحالي يحتاج نت دائماً. في المرسى والفروع النائية ينقطع النت وتتوقف المبيعات.

## النطاق

### يدخل
- PWA: Service Worker يخزن الأصناف والأسعار والعملاء محلياً (IndexedDB)
- وضع أوفلاين: إنشاء فاتورة بلا نت → تخزن في `offline_queue` → تزامن عند عودة النت
- مسح باركود بالكاميرا: `BarcodeDetector` API + مكتبة `html5-qrcode`
- طابعة بلوتوث/شبكة: `Web Bluetooth` أو `Web Print` للطابعة الحرارية 80mm
- شاشة `/pos/offline-queue` — قائمة فواتير معلقة

### لا يدخل
- تطبيق Native — نبدأ PWA فقط
- دفع إلكتروني أوفلاين — نقد فقط في الأوفلاين

## التصميم التقني

### Frontend (staff)
- `apps/staff/app/pos/offline/` — صفحة POS خفيفة
- `lib/offline-db.ts` — Dexie.js wrapper لـ IndexedDB: `items`, `customers`, `invoices_queue`
- `lib/sync-engine.ts` — عند `navigator.onLine` → يرفع الطابور `POST /pos/offline-sync`
- Service Worker: `next-pwa` يخزن `/api/v1/items?limit=1000` + `/api/v1/parties?type=customer`

### API
- `GET /pos/offline-data` — حزمة واحدة: أصناف + أسعار + عملاء + ضرائب (مضغوطة)
- `POST /pos/offline-sync` { invoices: [...] } — يستقبل دفعات أوفلاين، يتحقق من تسلسل + مخزون، يرجع نجاح/فشل لكل فاتورة

### منطق التضارب
- تسلسل فواتير: رقم مؤقت `OFFLINE-xxx` → عند المزامنة يأخذ رقم حقيقي من `sequences`
- مخزون: إذا صنف نفد أثناء الأوفلاين → الفاتورة ترفض وتظهر في `offline-queue` كـ `conflict` مع اقتراح

### UI
- شارة `🟢 متصل` / `🔴 أوفلاين - 3 فواتير معلقة` في رأس POS
- زر `📷 مسح` يفتح الكاميرا → يقرأ باركود → يضيف للسلة
- `/pos/offline-queue` — جدول فواتير معلقة + زر `مزامنة الآن`

### اختبارات
- `offline-pos.spec.ts` — محاكاة أوفلاين + تزامن
- `verify-offline-pos.mjs` — يقطع الشبكة في المتصفح ويجرب

## معايير القبول
- [ ] قطع النت → إنشاء فاتورة 3 أصناف → تبقى في IndexedDB
- [ ] عودة النت → تزامن تلقائي خلال 10 ثوانٍ
- [ ] مسح باركود بكاميرا الموبايل → يضيف الصنف
- [ ] طابعة 80mm تطبع من المتصفح في الأوفلاين
- [ ] تضارب مخزون → يظهر كـ `تعارض` مع حل

## الجهد
- Frontend: 6 أيام (PWA + IndexedDB + كاميرا + طابعة)
- Backend: 2 يوم (offline-data + sync)
