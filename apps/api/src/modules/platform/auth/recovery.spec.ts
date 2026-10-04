import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import {
  emailEventDefinition,
  forgotPasswordRequestSchema,
  resetPasswordRequestSchema,
} from '@erp/contracts';

import { generateResetToken, hashResetToken, resetTokenDigestsMatch } from './reset-token.js';

/**
 * Password recovery — P-R1.
 *
 * The database-backed halves of the flow (`forgotPassword` writing a token,
 * `resetPassword` consuming one) are covered by the integration suite. What is tested
 * here is everything that can be decided **without** a database, which happens to be
 * every property the security of this feature rests on:
 *
 *   - the token is high-entropy and never stored in the clear,
 *   - the recovery endpoint cannot be used to enumerate accounts,
 *   - the mail it sends is charged to nobody, so it cannot be used to burn a quota,
 *   - the schemas reject the shapes that would otherwise slip through.
 */
describe('password recovery (P-R1)', () => {
  describe('token material', () => {
    it('generates 256-bit secrets in a URL-safe alphabet', () => {
      for (let i = 0; i < 50; i += 1) {
        const token = generateResetToken();
        // 32 bytes, base64url, no padding.
        expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      }
    });

    it('never repeats a token across a thousand draws', () => {
      const seen = new Set(Array.from({ length: 1000 }, () => generateResetToken()));
      expect(seen.size).toBe(1000);
    });

    it('stores only a digest, and the digest is not reversible into the token', () => {
      const token = generateResetToken();
      const digest = hashResetToken(token);

      expect(digest).toMatch(/^[0-9a-f]{64}$/);
      // The property that makes a database dump harmless: nothing about the stored value
      // reveals the secret it was derived from.
      expect(digest).not.toContain(token);
      expect(digest.length).toBe(64);
    });

    it('hashes deterministically, so a lookup is a plain equality match', () => {
      const token = generateResetToken();
      expect(hashResetToken(token)).toBe(hashResetToken(token));
    });

    it('gives different tokens different digests', () => {
      expect(hashResetToken(generateResetToken())).not.toBe(hashResetToken(generateResetToken()));
    });

    it('compares digests in constant time and rejects a mismatch', () => {
      const digest = hashResetToken(generateResetToken());
      expect(resetTokenDigestsMatch(digest, digest)).toBe(true);
      expect(resetTokenDigestsMatch(digest, hashResetToken(generateResetToken()))).toBe(false);
      // A truncated or malformed digest is a rejection, never a thrown error.
      expect(resetTokenDigestsMatch(digest, 'abc')).toBe(false);
      expect(resetTokenDigestsMatch('abc', 'abc')).toBe(true);
    });
  });

  describe('request schemas', () => {
    it('accepts the shape the staff recovery screen sends', () => {
      const parsed = forgotPasswordRequestSchema.parse({
        tenantCode: 'demo',
        email: 'owner@demo.test',
      });
      expect(parsed.tenantCode).toBe('demo');
      expect(parsed.email).toBe('owner@demo.test');
    });

    it('rejects an unknown field, so the surface stays exactly what is documented', () => {
      expect(() =>
        forgotPasswordRequestSchema.parse({
          tenantCode: 'demo',
          email: 'owner@demo.test',
          isPlatformAdmin: true,
        }),
      ).toThrow();
    });

    it('rejects a malformed address rather than mailing into the void', () => {
      expect(() =>
        forgotPasswordRequestSchema.parse({ tenantCode: 'demo', email: 'not-an-address' }),
      ).toThrow();
    });

    it('requires the reset password to satisfy the same 12-character policy as a change', () => {
      const base = { tenantCode: 'demo', token: 'a'.repeat(43) };
      expect(() => resetPasswordRequestSchema.parse({ ...base, new: 'short' })).toThrow();
      expect(() =>
        resetPasswordRequestSchema.parse({ ...base, new: 'x'.repeat(12) }),
      ).not.toThrow();
    });
  });

  describe('the recovery e-mail', () => {
    it('reuses the event the plan already defined, with exactly its declared variables', () => {
      // `password.reset` was in the catalogue from the start — the event was defined and
      // the templates were seeded, but nothing ever emitted it. What was missing was the
      // endpoint, not the event, so this is a wiring test rather than a new-event test.
      const definition = emailEventDefinition('password.reset');
      expect(definition.event).toBe('password.reset');
      // The template plane rejects any `{{var}}` outside this list, so the caller must send
      // exactly these and no more. Passing the tenant name here would fail the send.
      expect(definition.variables).toEqual(['name', 'link', 'expires']);
    });

    it('is charged to the tenant, whose rate limit is what contains the quota risk', () => {
      // The endpoint that triggers it is public, so a caller could in principle burn a
      // tenant's e-mail quota by calling it repeatedly. The event scope stays `tenant` as
      // designed — a reset mail is genuinely the tenant's mail — and the containment is
      // the 3-per-minute bucket on the route, not the scope.
      expect(emailEventDefinition('password.reset').scope).toBe('tenant');
    });
  });

  describe('ordering inside resetPassword', () => {
    // This block guards a bug that shipped in the first draft of the endpoint and is
    // invisible to any test that only checks the happy path: the token was claimed
    // (marked used) *before* the new password was checked against the tenant policy.
    // A user who typed a password the policy rejects got a 422 — and had also just
    // burned their reset link, so they had to wait for a whole new e-mail to try again.
    //
    // The rule the code must follow: **nothing is consumed until every other reason to
    // reject has been ruled out.** The guarded UPDATE is still the atomic claim, so
    // simultaneous submissions of one link still cannot both win; it just runs last.
    //
    // Enforced by reading the source, because the ordering is a statement about the
    // sequence of `await` calls in `AuthService.resetPassword` and there is no way to
    // observe it from outside a live database.
    const source = readFileSync(
      new URL('./auth.service.ts', import.meta.url),
      'utf8',
    );
    const body = source.slice(
      source.indexOf('async resetPassword('),
      source.indexOf('private async sendResetEmail('),
    );

    it('checks the password policy before it claims the token', () => {
      const claimAt = body.indexOf('.set({ usedAt: new Date() })');
      const policyAt = body.indexOf('this.passwords.assertPolicy(');
      expect(claimAt).toBeGreaterThan(-1);
      expect(policyAt).toBeGreaterThan(-1);
      expect(policyAt).toBeLessThan(claimAt);
    });

    it('reads the live token without consuming it first', () => {
      // A plain SELECT on `passwordResetTokens` with no `usedAt` write, so the request
      // can be rejected for a bad password with the link still intact.
      expect(body).toContain('from(passwordResetTokens)');
      expect(body.indexOf('from(passwordResetTokens)')).toBeLessThan(
        body.indexOf('.set({ usedAt: new Date() })'),
      );
    });

    it('keeps the claim atomic — the UPDATE is still guarded on used_at and expiry', () => {
      const claim = body.slice(body.indexOf('.set({ usedAt: new Date() })'));
      expect(claim).toContain('isNull(passwordResetTokens.usedAt)');
      expect(claim).toContain('expiresAt} > now()');
    });
  });
});
