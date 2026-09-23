# 10 — مستودعات متقدمة WMS + تصنيع خفيف BOM

> الأولوية: P3 - 3 أسابيع
> السوق: Odoo / NetSuite WMS — مطلوب للمستودعات الكبيرة

## المشكلة
اليوم مستودع واحد = كمية واحدة. لا يوجد رفوف/مواقع، ولا تصنيع (قائمة مواد).

## النطاق

### أ. WMS
- جدول `warehouse_bins` (id, warehouse_id, code: A-01-01, zone, is_active)
- جدول `bin_balances` (bin_id, item_id, lot_id?, quantity)
- حركة مخزنية تختار Bin: عند استلام → يختار Bin، عند صرف → يختار من Bin
- شاشة `/inventory/bins` + `/inventory/bin-balances`
- جرد بالـ Bin + نقل بين Bins

### ب. BOM تصنيع خفيف
- جدول `boms` (id, item_id المنتج النهائي, name, version)
- جدول `bom_lines` (bom_id, component_item_id, qty, scrap_percent)
- أمر تصنيع `manufacturing_orders` (id, bom_id, qty_planned, qty_produced, status: draft|in_progress|done, cost)
- عند إكمال أمر → يصرف المكونات (متوسط متحرك) + يستلم المنتج النهائي + يحسب تكلفة
- شاشة `/manufacturing/boms` + `/manufacturing/orders`

### لا يدخل
- MRP تخطيط احتياجات — مرحلة ثانية
- باركود Bin معقد — نبدأ يدوي

## التصميم التقني

### ترحيل 0104
```sql
warehouse_bins (id, tenant_id, warehouse_id, code, zone, aisle, rack, level, is_active)
bin_balances (id, bin_id, item_id, lot_id, quantity, updated_at, unique(bin_id,item_id,lot_id))
boms (id, tenant_id, product_item_id, name, version, is_active)
bom_lines (id, bom_id, component_item_id, qty, unit_id, scrap_percent)
manufacturing_orders (id, tenant_id, bom_id, qty_planned, qty_produced, status, cost_total, created_by)
manufacturing_moves (id, order_id, item_id, type: consume|produce, qty, cost)
```

### API
- `GET/POST /inventory/bins?warehouse_id=`
- `POST /inventory/bin-transfers` { from_bin, to_bin, item_id, qty }
- `GET/POST /manufacturing/boms`
- `POST /manufacturing/orders` { bom_id, qty }
- `POST /manufacturing/orders/:id/produce` { qty } — يصرف ويستلم بقيد مخزني

### منطق التكلفة
- عند produce: تكلفة المنتج = مجموع (متوسط المكونات * كمية) / كمية المنتج
- يستخدم نفس محرك المتوسط المتحرّك الموجود

### UI
- `/inventory/bins` — خريطة مستودع بسيطة (رفوف)
- `/inventory/bin-balances` — رصيد كل Bin
- `/manufacturing/boms` — بطاقة BOM مع مكونات
- `/manufacturing/orders` — أوامر + تكلفة فعلية vs مخططة

## معايير القبول
- [ ] إنشاء Bin A-01-01 → استلام 10 حبة فيه → رصيد Bin = 10
- [ ] صرف من Bin → ينقص
- [ ] BOM منتج X = 2*Y + 1*Z → أمر تصنيع 5 → يصرف 10Y+5Z ويستلم 5X بتكلفة صحيحة
- [ ] اختبار `wms-bom.spec.ts` 10 حالات

## الجهد
- Backend: 7 أيام (WMS + BOM + أوامر)
- Frontend: 5 أيام
