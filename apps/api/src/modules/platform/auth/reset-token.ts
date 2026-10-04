import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Password-recovery token material — P-R1.
 *
 * Extracted from `auth.service.ts` for one reason: these four lines are the entire
 * security boundary of the recovery flow, and a security boundary deserves its own tests
 * rather than being reachable only through a database-backed integration test.
 *
 * The shape mirrors `refresh_tokens`: a high-entropy random secret is generated, only its
 * SHA-256 digest is persisted, and comparison happens on digests. A database dump
 * therefore yields no usable reset links, and the e-mail the user receives holds the only
 * copy of the secret that exists anywhere.
 */

/** 32 random bytes, base64url — 256 bits, the same width as the refresh-token secret. */
export function generateResetToken(): string {
  return randomBytes(32).toString('base64url');
}

/** The digest that is stored. Deterministic, so a lookup is a plain equality match. */
export function hashResetToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Constant-time comparison of two digests.
 *
 * `timingSafeEqual` throws when the buffers differ in length, so the length check comes
 * first — and since both sides are SHA-256 digests, a length mismatch means one of them
 * is not a digest at all, which is a rejection rather than an error to propagate.
 */
export function resetTokenDigestsMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}
