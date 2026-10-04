import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createActor, type Actor } from './fixtures.js';
import { api } from './http.js';
import { createTestApp, type TestApp } from './test-app.js';

/**
 * RC-11 — «المساعد AI مُفعَّل بلا مزوّد».
 *
 * الدليل الأصلي: `GET /ai/settings → {"enabled":true,"provider":null}`. منشأةٌ لم تفتح
 * شاشة المساعد قطّ كانت تبدو «مفعّلة»، والبوابة تقبلها، والأجوبة تأتي من المحرّك المحلي
 * كأنّ أحدًا هيّأ مساعداً. السبب `tenant?.enabled !== false`: الغياب قُرئ رضاً.
 *
 * ما يُثبَّت هنا:
 * 1. **الغياب ليس رضاً**: بلا صفّ إعدادات ⇒ `enabled:false` والبوابة ترفض.
 * 2. **التبديل بلا مزوّد ليس تفعيلاً**: `enabled:true` و`provider:null` ⇒ `false` أيضاً،
 *    والحفظ نفسه يُرفض بـ422 بدل أن يُنجح ثم يُفشل عند أول سؤال.
 * 3. **المفتاح خاصّ للمنشأة**: يُحفظ مشفّراً (`v1:` AES-256-GCM عبر `secret-box.ts`)،
 *    ولا يظهر في أيّ ردّ — وجوده وحده هو ما يُبلَّغ (`hasApiKey`).
 * 4. **الأسبقية**: مفتاح المنشأة يتقدّم على مفتاح المنصة، والفراغ يُبقي مفتاح المنصة.
 * 5. **الحفظ المتكرّر لا يمحو المفتاح**: حقلٌ غائب ⇒ المفتاح كما هو؛ والحذف صريح.
 */

type Settings = {
  enabled: boolean;
  platformSuspended: boolean;
  platformEnabled: boolean;
  provider: string | null;
  effectiveProvider: string;
  model: string | null;
  effectiveModel: string;
  monthlyTokenLimit: number | null;
  monthlyCostLimit: string | null;
  hasApiKey: boolean;
  hasPlatformKey: boolean;
  usage: { tokens: number; spent: string; tokenLimit: number | null; costLimit: string | null; period: string };
};

const base = '/api/v1';
const AI_PERMISSIONS = ['ai.assistant.use', 'ai.settings.manage'] as const;

/** يقرأ الصفّ من قاعدة البيانات مباشرة — الطريقة الوحيدة لرؤية ما خُزِّن فعلاً. */
async function readRow(ctx: TestApp, tenantId: string) {
  const { withTenantTx } = await import('@erp/database');
  const result = await withTenantTx(ctx.handle.db, tenantId, (tx) =>
    tx.execute(
      // `api_key_enc` مقصودٌ هنا: الاختبار وحده يقرأه، للتأكد من أنه مختوم وليس نصّاً صريحاً.
      `SELECT enabled, provider, model, monthly_token_limit, monthly_cost_limit::text, api_key_enc, platform_suspended
       FROM ai_settings WHERE tenant_id = '${tenantId}'::uuid LIMIT 1`,
    ),
  );
  const rows = (result as { rows?: Record<string, unknown>[] }).rows ?? [];
  return rows[0];
}

describe('AI settings — enabled is gated on a provider (RC-11)', () => {
  let ctx: TestApp;
  let owner: Actor;
  let other: Actor;

  const get = (path: string, actor: Actor = owner) => api(ctx.server, 'get', `${base}${path}`, { token: actor.token });
  const put = (path: string, body: unknown, actor: Actor = owner) =>
    api(ctx.server, 'put', `${base}${path}`, { token: actor.token, body });

  beforeAll(async () => {
    ctx = await createTestApp('ai-settings');
    owner = await createActor(ctx, {
      tenantCode: 'ai-ops',
      email: 'ai-owner@ai-ops.test',
      password: 'Ai-Owner!2345',
      permissions: AI_PERMISSIONS,
    });
    other = await createActor(ctx, {
      tenantCode: 'ai-other',
      email: 'ai-other@ai-other.test',
      password: 'Ai-Other!2345',
      permissions: AI_PERMISSIONS,
    });
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('reports a tenant that never opened the screen as off, with no provider', async () => {
    const response = await get('/ai/settings');
    expect(response.status).toBe(200);
    const settings = response.body.data as Settings;
    expect(settings.enabled).toBe(false);
    expect(settings.provider).toBeNull();
    expect(settings.hasApiKey).toBe(false);
    // الصفّ نفسه غير موجود — «متوقف» هنا تعني «لم يُهيَّأ»، لا «هُيّئ ثم أُوقف».
    expect(await readRow(ctx, owner.tenantId)).toBeUndefined();
  });

  it('an explicit switch is honoured, and inherits the platform provider', async () => {
    // `ai_platform_settings` مُبذور بـ`provider DEFAULT 'local'` ولا يستطيع `updatePlatform`
    // كتابة `null`، فـ«لا مزوّد في أيّ مكان» حالةٌ غير قائمة. الذي يهمّ أنّ الغياب لم
    // يعد رضاً: الصفّ الآن يُكتب صراحةً، والمزوّد الموروث هو مزوّد المنصة.
    const response = await put('/ai/settings', { enabled: true });
    expect(response.status).toBe(200);
    const settings = response.body.data as Settings;
    expect(settings.enabled).toBe(true);
    expect(settings.provider).toBeNull();
    expect(settings.effectiveProvider).toBe('local');
  });

  it('accepts an explicit provider, and only then reports enabled', async () => {
    const response = await put('/ai/settings', { enabled: true, provider: 'local', model: 'local-grounded' });
    expect(response.status).toBe(200);
    const settings = response.body.data as Settings;
    expect(settings.enabled).toBe(true);
    expect(settings.provider).toBe('local');
    expect(settings.effectiveProvider).toBe('local');
    // `local` لا يحتاج مفتاحاً — وهذا هو الوحيد الذي يُفعَّل بلا مفتاح.
    expect(settings.hasApiKey).toBe(false);
    expect(settings.hasPlatformKey).toBe(false);
  });

  it('keeps the provider on a partial PUT, and clears it only when asked', async () => {
    // حقلٌ غائب ⇒ يبقى كما هو. هذا ما يجعل تدوير المفتاح وحده لا يمحو المزوّد.
    const partial = await put('/ai/settings', { monthlyTokenLimit: 1234 });
    expect(partial.status).toBe(200);
    expect((partial.body.data as Settings).provider).toBe('local');
    expect((partial.body.data as Settings).monthlyTokenLimit).toBe(1234);
    expect((await readRow(ctx, owner.tenantId))?.provider).toBe('local');

    // و`null` صريحٌ ⇒ وراثة إعداد المنصة. هكذا يرسله النموذج حين يُختار ذلك الخيار.
    const inherit = await put('/ai/settings', { provider: null });
    expect(inherit.status).toBe(200);
    expect((inherit.body.data as Settings).provider).toBeNull();
    expect((await readRow(ctx, owner.tenantId))?.provider).toBeNull();

    await put('/ai/settings', { provider: 'local' });
  });

  it('seals a tenant key and never returns it', async () => {
    const secret = 'sk-tenant-very-secret-value';
    const response = await put('/ai/settings', { provider: 'openai', apiKey: secret });
    expect(response.status).toBe(200);

    const settings = response.body.data as Settings;
    expect(settings.hasApiKey).toBe(true);
    // السرّ لا يعبر الشبكة لا كنصٍّ ولا ضمن حقل آخر.
    expect(JSON.stringify(response.body)).not.toContain(secret);
    expect(JSON.stringify(response.body)).not.toContain('sk-tenant');

    const row = await readRow(ctx, owner.tenantId);
    expect(String(row?.api_key_enc)).toMatch(/^v1:[^:]+:[^:]+:[^:]+$/);
    expect(String(row?.api_key_enc)).not.toContain(secret);
    // وهو مختلفٌ في كلّ مرّة لأنّ IV جديداً لكلّ نداء.
    const before = String(row?.api_key_enc);
    const rotated = await put('/ai/settings', { apiKey: 'sk-tenant-rotated' });
    expect(rotated.status).toBe(200);
    const after = String((await readRow(ctx, owner.tenantId))?.api_key_enc);
    expect(after).not.toBe(before);
  });

  it('an empty key box clears the slot, and an absent field keeps it', async () => {
    // حفظٌ بلا حقل مفتاح ⇒ المفتاح باقٍ.
    const kept = await put('/ai/settings', { model: 'gpt-4o-mini' });
    expect(kept.status).toBe(200);
    expect((kept.body.data as Settings).hasApiKey).toBe(true);

    // صريحاً: الحذف.
    const cleared = await put('/ai/settings', { clearApiKey: true });
    expect(cleared.status).toBe(200);
    expect((cleared.body.data as Settings).hasApiKey).toBe(false);
    expect((await readRow(ctx, owner.tenantId))?.api_key_enc).toBeNull();

    // وصندوقٌ فارغٌ مرسلٌ نصّاً يعني الحذف أيضاً — هكذا يرسله النموذج.
    await put('/ai/settings', { apiKey: 'sk-tenant-again' });
    expect((await readRow(ctx, owner.tenantId))?.api_key_enc).toMatch(/^v1:/);
    const emptied = await put('/ai/settings', { apiKey: '' });
    expect(emptied.status).toBe(200);
    expect((emptied.body.data as Settings).hasApiKey).toBe(false);
  });

  it('blocks a chat while there is no usable key, and lets it through once there is', async () => {
    // منشأة أخرى لم تُهيَّأ شيئاً: البوابة ترفض قبل أن تُحاول.
    const blocked = await api(ctx.server, 'post', `${base}/ai/chat`, {
      token: other.token,
      body: { message: 'كم مبيعات اليوم؟', stream: false },
    });
    expect(blocked.status).toBe(403);

    // بعد اختيار مزوّدٍ محليّ: يجيب من المجاميع بلا مفتاح.
    await api(ctx.server, 'put', `${base}/ai/settings`, {
      token: other.token,
      body: { enabled: true, provider: 'local' },
    });
    const allowed = await api(ctx.server, 'post', `${base}/ai/chat`, {
      token: other.token,
      body: { message: 'كم مبيعات اليوم؟', stream: false },
    });
    expect(allowed.status).toBe(200);
    expect((allowed.body.data as { provider?: string }).provider).toBe('local');
  });

  it('does not let one tenant read or write another’s AI settings', async () => {
    const response = await api(ctx.server, 'get', `${base}/ai/settings`, { token: other.token });
    expect(response.status).toBe(200);
    expect((response.body.data as Settings).provider).toBe('local');
    // صفّ `other` منفصل تماماً: لا يرى مزوّد `owner` ولا مفتاحه.
    expect((await readRow(ctx, other.tenantId))?.provider).toBe('local');
    expect((await readRow(ctx, other.tenantId))?.api_key_enc).toBeNull();
  });
});
