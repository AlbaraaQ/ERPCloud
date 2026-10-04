import { DomainError } from '@erp/contracts';
import { Inject, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { sql } from 'drizzle-orm';
import { withPlatformAdminTx, withTenantTx, type DatabaseHandle } from '@erp/database';

import { DATABASE_HANDLE } from '../../../database/database.tokens.js';
import { getTenantContext } from '../context/tenant-context.js';
import { getAuthContext } from '../../../request-context/request-context.js';

export type BillingPlan = { id: string; code: string; name: string; interval: 'month' | 'year'; amount: string; currency: string; stripePriceId: string | null };

@Injectable()
export class BillingService {
  constructor(@Inject(DATABASE_HANDLE) private readonly database: DatabaseHandle) {}

  /**
   * Mirrors a plan's **module** entitlements into the tenant's `tenant_settings`.
   *
   * Why this exists at all: `billing_plan_entitlements` (0068) is the catalogue of
   * what a plan buys, and `tenant_settings` is what the modules actually read at
   * request time (`pos.service.ts` checks `feature.pos`, `hrm` checks
   * `feature.hrm`, …). Nothing connected the two. A tenant could hold a fully paid
   * `pro-monthly` subscription and still get 404 from every gated screen, because
   * activating a subscription inserted a row into `tenant_subscriptions` and stopped
   * there. That is exactly what the demo tenant hit: `feature.pos: false`,
   * `feature.projects: false`, `feature.hrm: false` — POS unusable, screens
   * appearing "missing".
   *
   * Scope is deliberately narrow: only `kind = 'module'` rows are written.
   * `limit` rows are enforced by the entitlement/quota checks, and `flag` rows are
   * not module switches — writing either into `tenant_settings` would invent keys
   * the typed registry in `packages/config` does not know about.
   *
   * `tenant_settings` is under `FORCE ROW LEVEL SECURITY`, so the tenant GUC is
   * bound for the whole transaction before the first write.
   */
  private async applyEntitlements(tenantId: string, planId: string): Promise<number> {
    const plan = await this.database.db.execute(
      sql`SELECT id FROM billing_plans WHERE id = ${planId}::uuid`,
    );
    if (!plan.rows[0]) return 0;

    const entitlements = await this.database.db.execute(
      sql`SELECT key, value FROM billing_plan_entitlements WHERE plan_id = ${planId}::uuid AND kind = 'module'`,
    );
    if (entitlements.rows.length === 0) return 0;

    let written = 0;
    await this.database.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
      for (const row of entitlements.rows) {
        await tx.execute(
          sql`INSERT INTO tenant_settings (tenant_id, key, value, updated_at)
              VALUES (${tenantId}::uuid, ${String(row.key)}, ${JSON.stringify(row.value)}::jsonb, now())
              ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        );
        written += 1;
      }
    });
    return written;
  }

  async listActivePlans(): Promise<BillingPlan[]> {    const result = await this.database.db.execute(sql`SELECT id, code, name, interval, amount::text, currency, stripe_price_id FROM billing_plans WHERE active = true ORDER BY amount ASC, interval ASC, code ASC`);
    return result.rows.map((row) => ({ id: String(row.id), code: String(row.code), name: String(row.name), interval: row.interval === 'year' ? 'year' : 'month', amount: String(row.amount), currency: String(row.currency), stripePriceId: row.stripe_price_id ? String(row.stripe_price_id) : null }));
  }

  async createStripeCheckout(planId: string) {
    const tenant = getTenantContext();
    const auth = getAuthContext();
    const result = await this.database.db.execute(sql`SELECT id, stripe_price_id FROM billing_plans WHERE id = ${planId}::uuid AND active = true`);
    const plan = result.rows[0];
    if (!plan?.stripe_price_id) throw new DomainError('VALIDATION_FAILED', 'This plan is not configured for Stripe', 422);
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) throw new DomainError('CONFIGURATION_MISSING', 'Stripe is not configured', 503);
    const stripe = new Stripe(secret);
    const baseUrl = process.env.PUBLIC_APP_URL ?? `http://localhost:3001`;
    const session = await stripe.checkout.sessions.create({ mode: 'subscription', line_items: [{ price: String(plan.stripe_price_id), quantity: 1 }], success_url: `${baseUrl}/portal?billing=success`, cancel_url: `${baseUrl}/pricing?billing=canceled`, metadata: { tenantId: tenant.tenantId, planId: String(plan.id), userId: auth.userId } });
    await withTenantTx(this.database.db, tenant.tenantId, (tx) =>
      tx.execute(sql`INSERT INTO tenant_subscriptions (id, tenant_id, plan_id, status, provider) VALUES (gen_random_uuid(), ${tenant.tenantId}::uuid, ${plan.id}::uuid, 'incomplete', 'stripe')`),
    );
    return { id: session.id, url: session.url };
  }

  async requestManualActivation(planId: string, notes?: string) { const tenant = getTenantContext(); const auth = getAuthContext(); const result = await withTenantTx(this.database.db, tenant.tenantId, (tx) =>
      tx.execute(sql`INSERT INTO activation_requests (id, tenant_id, requested_by, plan_id, notes) SELECT gen_random_uuid(), ${tenant.tenantId}::uuid, ${auth.userId}::uuid, id, ${notes ?? null} FROM billing_plans WHERE id = ${planId}::uuid AND active = true RETURNING id, tenant_id, plan_id, status, notes, created_at`),
    ); if (!result.rows[0]) throw new DomainError('NOT_FOUND', 'Active billing plan was not found', 404); return result.rows[0]; }

  async mySubscription() {
    const tenant = getTenantContext();
    // The tenant GUC has to be bound for this read: `TenantGuard` publishes the
    // request context but does not set `app.tenant_id` on the connection, and
    // `setTenantContext` is transaction-local by design (`is_local = true`) so it
    // cannot be inherited. Without the binding, `tenant_isolation` on
    // `tenant_subscriptions` (0019) compares against NULL and the tenant sees **zero**
    // rows — which is exactly what the licence screen was showing: an empty panel
    // that looked like a missing licence rather than an unbound query.
    const result = await withTenantTx(this.database.db, tenant.tenantId, (tx) =>
      tx.execute(sql`SELECT s.id, s.status, s.provider, s.current_period_start, s.current_period_end, s.activated_at, p.code AS plan_code, p.name AS plan_name, p.amount::text, p.currency FROM tenant_subscriptions s JOIN billing_plans p ON p.id = s.plan_id WHERE s.tenant_id = ${tenant.tenantId}::uuid ORDER BY s.created_at DESC LIMIT 1`),
    );
    return result.rows[0] ?? null;
  }

  async listActivationRequests() {
    // `FORBIDDEN`, not a bare `Error`: a plain `Error` reaches `AllExceptionsFilter`
    // as an unknown failure and is answered with a 500, which is both wrong and
    // unhelpful — the caller is a tenant user who simply is not the platform
    // operator, and the honest answer is 403 with a code it can render.
    if (!getAuthContext().isPlatformAdmin) throw new DomainError('FORBIDDEN', 'Platform administrator access required', 403); const result = await withPlatformAdminTx(this.database.db, (tx) =>
      tx.execute(sql`SELECT r.id, r.tenant_id, r.plan_id, r.status, r.notes, r.created_at, t.code AS tenant_code, t.name AS tenant_name, p.name AS plan_name, p.amount::text FROM activation_requests r JOIN tenants t ON t.id = r.tenant_id LEFT JOIN billing_plans p ON p.id = r.plan_id WHERE r.status = 'pending' ORDER BY r.created_at ASC`),
    ); return result.rows; }

  async reviewActivation(requestId: string, approve: boolean, notes?: string) { const auth = getAuthContext(); if (!auth.isPlatformAdmin) throw new DomainError('FORBIDDEN', 'Platform administrator access required', 403); const result = await withPlatformAdminTx(this.database.db, (tx) =>
      tx.execute(sql`WITH reviewed AS (UPDATE activation_requests SET status = ${approve ? 'approved' : 'rejected'}, reviewed_by = ${auth.userId}::uuid, reviewed_at = now(), notes = COALESCE(${notes ?? null}, notes), updated_at = now() WHERE id = ${requestId}::uuid AND status = 'pending' RETURNING id, tenant_id, plan_id, status) SELECT * FROM reviewed`),
    ); const request = result.rows[0]; if (!request) throw new DomainError('NOT_FOUND', 'Pending activation request was not found', 404);
    if (approve) {
      await withPlatformAdminTx(this.database.db, (tx) =>
        tx.execute(sql`INSERT INTO tenant_subscriptions (id, tenant_id, plan_id, status, provider, activated_at, current_period_start) VALUES (gen_random_uuid(), ${request.tenant_id}::uuid, ${request.plan_id}::uuid, 'active', 'manual', now(), now())`),
      );
      // RC-1/RC-6: approving a licence must switch the modules on, not only record
      // the subscription. Without this the tenant keeps 404-ing from every
      // feature-gated screen while holding a paid plan.
      await this.applyEntitlements(String(request.tenant_id), String(request.plan_id));
    }
    return request; }

  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    const secret = process.env.STRIPE_SECRET_KEY; const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret || !webhookSecret) throw new DomainError('CONFIGURATION_MISSING', 'Stripe webhook is not configured', 503);
    const event = new Stripe(secret).webhooks.constructEvent(rawBody, signature, webhookSecret);
    if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') return { handled: false };
    const session = event.data.object as Stripe.Checkout.Session;
    const tenantId = session.metadata?.tenantId;
    const planId = session.metadata?.planId;
    if (session.payment_status !== 'paid' || !session.subscription || !tenantId || !planId) return { handled: false };
    // 0068 makes "one live licence per customer" a database rule (`tenant_subscriptions_active_tenant_key`),
    // so a Stripe checkout that completes while a manual licence is still live must retire the
    // older one *first* — otherwise the unique index rejects the activation itself.
    // RC-12, the same defect as the manual path but on the paid one: `tenant_subscriptions`
    // is under RLS (`0019`: `USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)`),
    // and a Stripe webhook arrives with **no** request context — no TenantGuard ran. So a bare
    // `db.execute` here compares `tenant_id` to NULL, the policy matches nothing, and both
    // statements update **zero rows silently**: the `incomplete` row never becomes `active`,
    // the superseded licence is never retired, and `applyEntitlements` below switches the
    // modules on for a tenant whose subscription is still stuck `incomplete` — which then
    // collides with the one-active-licence-per-tenant unique index of 0068 on the next event.
    // Binding the tenant GUC for the whole transaction makes both writes land.
    await withTenantTx(this.database.db, tenantId, (tx) =>
      tx.execute(sql`UPDATE tenant_subscriptions SET status = 'canceled', canceled_at = now(), canceled_reason = 'استُبدل باشتراك Stripe', updated_at = now() WHERE tenant_id = ${tenantId}::uuid AND status IN ('trialing', 'active', 'past_due', 'paused') AND NOT (provider = 'stripe' AND status = 'incomplete')`),
    );
    await withTenantTx(this.database.db, tenantId, (tx) =>
      tx.execute(sql`UPDATE tenant_subscriptions SET status = 'active', provider_customer_id = ${typeof session.customer === 'string' ? session.customer : null}, provider_subscription_id = ${typeof session.subscription === 'string' ? session.subscription : null}, activated_at = now(), current_period_start = now(), updated_at = now() WHERE tenant_id = ${tenantId}::uuid AND plan_id = ${planId}::uuid AND provider = 'stripe' AND status = 'incomplete'`),
    );
    // RC-1/RC-6, same reason as the manual path: a paid tenant whose modules are
    // still off is a tenant that paid for a product it cannot open.
    await this.applyEntitlements(tenantId, planId);
    return { handled: true };
  }
}
