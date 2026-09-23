# 08 — مساعد محاسبي ذكي AI

> الأولوية: P2 - 2 أسبوع
> السوق: Zoho Zia / QuickBooks AI — تسويق قوي

## المشكلة
المحاسب الجديد لا يعرف أين يجد تقرير أو كيف يعالج حالة. المساعد يجيب فوراً.

## النطاق

### يدخل
- واجهة دردشة `/assistant` في staff — `اسأل: كم ربح فرع الرياض؟`
- محرك RAG: يقرأ `report-catalog` + `navigation.ts` + وثائق النظام + بيانات المستأجر (مجمّعة لا تفصيلية)
- 3 مهارات:
  1. **إجابة عن النظام:** "كيف أنشئ قيد؟" → يشرح + رابط الشاشة
  2. **أرقام مجمعة:** "مبيعات اليوم" → ينادي `GET /reports/sales-summary?from=today` ويجيب
  3. **اقتراحات:** "عندك 5 فواتير متأخرة >30 يوم"
- جدول `ai_conversations` (id, tenant_id, user_id, messages: jsonb)
- إعداد مزود AI في المنصة (OpenAI / Anthropic / محلي) + مفتاح مشفر

### لا يدخل
- كتابة قيود تلقائية بدون مراجعة — خطر
- قراءة كل القيود للتوصية — خصوصية، نبدأ بمجاميع

## التصميم التقني

### ترحيل 0102
```sql
ai_conversations (id, tenant_id, user_id, title, messages jsonb, created_at)
ai_settings (tenant_id, provider, model, enabled, limits)
ai_usage_logs (id, tenant_id, tokens_in, tokens_out, cost, created_at)
```

### API
- `POST /ai/chat` { message, conversation_id? } → يجيب stream
- `GET /ai/conversations`
- `POST /ai/suggest` — يقترح تنبيهات يومية (cron)
- `GET /ai/skills` — قائمة المهارات المتاحة

### محرك
```ts
// 1. تصنيف النية
intent = classify(message) // 'how_to' | 'report' | 'anomaly' | 'general'

// 2. إذا report → استدعاء أداة
if intent == 'report' → callTool('sales-summary', params)

// 3. إذا how_to → بحث في navigation.ts + docs
context = searchDocs(message)

// 4. بناء prompt + استدعاء LLM
answer = llm.chat({ system: "أنت مساعد ERP سعودي...", context, tools })
```

### أدوات (Tools) يملكها الـ LLM
- `get_sales_summary(from,to,branch_id)`
- `get_overdue_invoices()`
- `get_low_stock()`
- `search_help(query)` → يبحث في docs

### UI
- `/assistant` — دردشة مثل ChatGPT بتصميم عربي، اقتراحات سريعة: "مبيعات اليوم" "عملاء متأخرون" "كيف أرحل قيد؟"
- زر عائم `💬 مساعد` في كل شاشة يفتح drawer
- `/settings/ai` — تفعيل + اختيار مزود + حدود استهلاك

### أمان وخصوصية
- لا يرسل أرقام هوية أو رواتب تفصيلية للـ LLM — فقط مجاميع
- سجل استهلاك توكنز + تكلفة + حد شهري في `usage_counters`
- إيقاف من المنصة لكل مستأجر

### صلاحيات
- `ai.assistant.use` — كل المستخدمين، `ai.settings.manage` — أدمن

## معايير القبول
- [ ] سؤال "كيف أنشئ فاتورة مبيعات؟" → يجيب بالخطوات + رابط `/sales/invoices/new`
- [ ] سؤال "مبيعات اليوم" → يرقم حقيقي من DB
- [ ] اقتراح يومي "عندك 3 أصناف ستنفد"
- [ ] لا يجيب عن بيانات مستأجر آخر (عزل)
- [ ] اختبار `ai-assistant.spec.ts` 8 حالات mock LLM
- [ ] `verify-ai.mjs` 12 نقطة

## الجهد
- Backend: 5 أيام (RAG + أدوات + streaming)
- Frontend: 3 أيام (دردشة + زر عائم)
- تكلفة: ~$0.02 لكل محادثة

## تسويق
"أول ERP سعودي بمساعد ذكي يفهم محاسبتك" — عنوان قوي للموقع.
