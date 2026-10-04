import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { env } from '@erp/config';
import {
  DomainError,
  errorCodes,
  newId,
  type ChangePasswordRequest,
  type ForgotPasswordRequest,
  type LoginRequest,
  type LoginResponse,
  type MembershipDto,
  type ResetPasswordRequest,
  type RefreshRequest,
} from '@erp/contracts';
import {
  memberships,
  passwordResetTokens,
  refreshTokens,
  tenants,
  users,
  withTenantTx,
  withTx,
  type DatabaseHandle,
} from '@erp/database';

import type { AuthContextValue } from '../../../request-context/request-context.js';
import { DATABASE_HANDLE } from '../../../database/database.module.js';
import { toMembershipDto, toUserDto, type MembershipRow, type UserRow } from '../mappers.js';
import { EmailService } from '../../email/email.service.js';

import { MfaService } from './mfa.service.js';
import { generateResetToken, hashResetToken } from './reset-token.js';
import { PasswordService } from './password.service.js';
import { resolvePlatformAccess } from './platform-access.js';
import { TokenService } from './token.service.js';

/**
 * Authentication flows — API_CONTRACT §1, SECURITY_ARCHITECTURE §2.
 *
 * Design notes that are deliberate, not accidental:
 *
 * - Login failures return the *same* `UNAUTHENTICATED` response whether the e-mail, the
 *   tenant code or the password was wrong, so the endpoint cannot enumerate accounts.
 * - The membership row is always read **under the RLS GUC of the tenant being logged
 *   into**, so a valid user with no membership in that tenant sees nothing at all.
 * - `memberships` in the response contains the membership of the tenant that was
 *   authenticated. Listing every membership of the user would require a cross-tenant
 *   read that RLS exists to prevent; the login DTO already requires `tenantCode`.
 */

export type RequestMeta = { ip?: string; userAgent?: string };

const USER_COLUMNS = {
  id: users.id,
  email: users.email,
  fullName: users.fullName,
  phone: users.phone,
  status: users.status,
  isPlatformAdmin: users.isPlatformAdmin,
  mustChangePassword: users.mustChangePassword,
  mfaEnabled: users.mfaEnabled,
  lastLoginAt: users.lastLoginAt,
};

const MEMBERSHIP_COLUMNS = {
  id: memberships.id,
  tenantId: memberships.tenantId,
  tenantCode: tenants.code,
  tenantName: tenants.name,
  displayName: memberships.displayName,
  status: memberships.status,
  isOwner: memberships.isOwner,
  branchScope: memberships.branchScope,
  kind: memberships.kind,
  // R1 — حدّ الخصم يُعاد مع قائمة العضويات عند الدخول: الشاشة تحتاج معرفته قبل أن تُرسل
  // أول فاتورة، وطلبٌ ثانٍ لجلبه يعني احتمال شاشةٍ بلا حدّ عند أول نداء.
  maxDiscountPct: memberships.maxDiscountPct,
  maxDiscountAmount: memberships.maxDiscountAmount,
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE_HANDLE) private readonly database: DatabaseHandle,
    private readonly tokens: TokenService,
    private readonly passwords: PasswordService,
    private readonly mfa: MfaService,
    // Injected for the recovery flow only. Deliberately *not* used anywhere else in this
    // service: login and MFA must stay independent of the mail plane, so a mail outage
    // can never take authentication down with it.
    private readonly email: EmailService,
  ) {}

  async login(input: LoginRequest, meta: RequestMeta = {}): Promise<LoginResponse> {
    const tenant = await withTx(this.database.db, async (tx) => {
      const rows = await tx
        .select({ id: tenants.id, code: tenants.code, name: tenants.name, status: tenants.status })
        .from(tenants)
        .where(sql`lower(${tenants.code}) = lower(${input.tenantCode})`)
        .limit(1);
      return rows[0];
    });

    if (!tenant) {
      throw new DomainError(errorCodes.UNAUTHENTICATED, 'Invalid e-mail, tenant or password', 401);
    }

    const user = await withTx(this.database.db, async (tx) => {
      const rows = await tx
        .select({ ...USER_COLUMNS, passwordHash: users.passwordHash, lockedUntil: users.lockedUntil })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);
      return rows[0];
    });

    if (!user) {
      throw new DomainError(errorCodes.UNAUTHENTICATED, 'Invalid e-mail, tenant or password', 401);
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const retryAfterSeconds = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
      throw new DomainError(
        errorCodes.RATE_LIMITED,
        `Account temporarily locked after repeated failed logins; retry in ${retryAfterSeconds}s`,
        429,
      );
    }

    const membership = await this.findActiveMembership(tenant.id, user.id);
    if (!membership) {
      throw new DomainError(errorCodes.UNAUTHENTICATED, 'Invalid e-mail, tenant or password', 401);
    }

    if (tenant.status !== 'active') {
      throw new DomainError(errorCodes.TENANT_SUSPENDED, `Tenant '${tenant.code}' is ${tenant.status}`, 423);
    }

    const passwordOk = await this.passwords.verify(user.passwordHash, input.password);
    if (!passwordOk) {
      await this.registerFailedLogin(user.id);
      throw new DomainError(errorCodes.UNAUTHENTICATED, 'Invalid e-mail, tenant or password', 401);
    }

    // TOTP second factor (SECURITY_ARCHITECTURE §2). `MFA_REQUIRED` tells the client the
    // credentials were fine and only the authenticator code is missing — the status is
    // still 401, so account enumeration does not change: an attacker cannot distinguish
    // "wrong password" from "code needed" without already knowing a valid password.
    if (user.mfaEnabled) {
      if (!input.mfaCode) {
        throw new DomainError(errorCodes.MFA_REQUIRED, 'Enter the verification code from your authenticator app', 401);
      }
      const codeOk = await this.mfa.verifyLogin(user.id, input.mfaCode);
      if (!codeOk) {
        await this.registerFailedLogin(user.id);
        throw new DomainError(errorCodes.UNAUTHENTICATED, 'Invalid e-mail, tenant, password or verification code', 401);
      }
    } else if (input.mfaCode) {
      throw new DomainError(errorCodes.VALIDATION_FAILED, 'Two-factor authentication is not enabled for this user', 400, {
        field: 'mfaCode',
      });
    }

    await this.registerSuccessfulLogin(user.id);

    return this.issueSession(user, membership, meta);
  }

  async refresh(input: RefreshRequest, meta: RequestMeta = {}): Promise<LoginResponse> {
    const tokenHash = this.tokens.hashRefreshToken(input.refreshToken);

    const stored = await withTx(this.database.db, async (tx) => {
      const rows = await tx
        .select({
          id: refreshTokens.id,
          userId: refreshTokens.userId,
          family: refreshTokens.family,
          tenantId: refreshTokens.tenantId,
          expiresAt: refreshTokens.expiresAt,
          revokedAt: refreshTokens.revokedAt,
        })
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, tokenHash))
        .limit(1);
      return rows[0];
    });

    if (!stored) {
      throw new DomainError(errorCodes.UNAUTHENTICATED, 'Refresh token is not recognised', 401);
    }

    // Reuse detection: presenting an already-rotated token revokes the whole family.
    if (stored.revokedAt) {
      await this.revokeFamily(stored.family);
      throw new DomainError(errorCodes.UNAUTHENTICATED, 'Refresh token reuse detected', 401);
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new DomainError(errorCodes.UNAUTHENTICATED, 'Refresh token has expired', 401);
    }

    const user = await withTx(this.database.db, async (tx) => {
      const rows = await tx.select(USER_COLUMNS).from(users).where(eq(users.id, stored.userId)).limit(1);
      return rows[0];
    });
    if (!user || user.status !== 'active') {
      throw new DomainError(errorCodes.UNAUTHENTICATED, 'User is not active', 401);
    }

    if (!stored.tenantId) {
      throw new DomainError(errorCodes.UNAUTHENTICATED, 'Refresh token is not bound to a tenant', 401);
    }

    const tenant = await withTx(this.database.db, async (tx) => {
      const rows = await tx
        .select({ id: tenants.id, code: tenants.code, name: tenants.name, status: tenants.status })
        .from(tenants)
        .where(eq(tenants.id, stored.tenantId as string))
        .limit(1);
      return rows[0];
    });
    if (!tenant || tenant.status !== 'active') {
      throw new DomainError(errorCodes.UNAUTHENTICATED, 'Tenant is not active', 401);
    }

    const membership = await this.findActiveMembership(tenant.id, user.id);
    if (!membership) {
      throw new DomainError(errorCodes.UNAUTHENTICATED, 'Membership is no longer active', 401);
    }

    // Rotation: the presented token is marked revoked and points at its replacement, so a
    // later replay of the same value is detectable.
    const rotatedRefreshToken = await withTx(this.database.db, async (tx) => {
      const newTokenId = newId();
      const plaintext = this.tokens.generateRefreshToken();
      await tx
        .update(refreshTokens)
        .set({ revokedAt: new Date(), replacedBy: newTokenId })
        .where(eq(refreshTokens.id, stored.id));
      await tx.insert(refreshTokens).values({
        id: newTokenId,
        userId: user.id,
        tokenHash: this.tokens.hashRefreshToken(plaintext),
        family: stored.family,
        tenantId: tenant.id,
        expiresAt: new Date(Date.now() + this.tokens.refreshTtlSeconds * 1000),
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      });
      return plaintext;
    });

    const platform = await resolvePlatformAccess(this.database, user.id, user.isPlatformAdmin);
    const accessToken = await this.tokens.signAccessToken({
      sub: user.id,
      tid: tenant.id,
      mid: membership.id,
      scope: ['erp'],
      pam: platform.isPlatformAdmin,
      proles: platform.platformRoles,
    });

    return {
      accessToken: accessToken.token,
      refreshToken: rotatedRefreshToken,
      tokenType: 'Bearer',
      expiresIn: this.tokens.accessTtlSeconds,
      user: toUserDto({ ...user, isPlatformAdmin: platform.isPlatformAdmin, platformRoles: platform.platformRoles }),
      memberships: [await this.toMembershipDto(membership)],
    };
  }

  /** Revokes every still-valid refresh token of the user (API_CONTRACT §1 logout). */
  async logout(auth: AuthContextValue): Promise<void> {
    await withTx(this.database.db, async (tx) => {
      await tx
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(and(eq(refreshTokens.userId, auth.userId), isNull(refreshTokens.revokedAt)));
    });
  }

  // --- password recovery --------------------------------------------------------
  //
  // The two halves of recovery are asymmetric on purpose.
  //
  // `forgotPassword` **always answers 204** and never says whether the address exists.
  // A recovery endpoint that distinguishes "sent" from "no such user" is an account
  // enumeration oracle, and it is the one thing that makes recovery features dangerous
  // rather than useful. Everything else — the rate limit, the token TTL, the single-use
  // guard — exists to contain the blast radius of the fact that an unauthenticated
  // caller can make the system send mail on someone else's behalf.
  //
  // `resetPassword` is the half that must be loud: an unknown, expired or already-used
  // token is a hard `400`, because at that point the caller has proven they hold a
  // secret and a silent no-op would leave them thinking it worked.

  async forgotPassword(input: ForgotPasswordRequest, meta: RequestMeta = {}): Promise<void> {
    const tenant = await withTx(this.database.db, async (tx) => {
      const rows = await tx
        .select({ id: tenants.id, code: tenants.code, name: tenants.name, status: tenants.status })
        .from(tenants)
        .where(sql`lower(${tenants.code}) = lower(${input.tenantCode})`)
        .limit(1);
      return rows[0];
    });

    // Same shape as `login`: an unknown tenant is not an error here, it is simply a
    // request that has nobody to mail. Falling through keeps the response uniform.
    if (!tenant || tenant.status !== 'active') return;

    const user = await withTx(this.database.db, async (tx) => {
      const rows = await tx
        .select({ id: users.id, email: users.email, fullName: users.fullName, status: users.status })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);
      return rows[0];
    });
    if (!user || user.status !== 'active') return;

    // The membership check is the same one `login` performs: holding a user row is not
    // enough, the person must actually belong to the tenant they named. Without it a
    // valid user of tenant A could be mailed a reset link that is scoped to tenant B.
    const membership = await this.findActiveMembership(tenant.id, user.id);
    if (!membership) return;

    // 32 random bytes, base64url — the same shape as the refresh-token secret. Only its
    // digest is persisted, so what the user receives is the only copy in existence.
    const token = generateResetToken();
    const tokenHash = hashResetToken(token);
    const expiresAt = new Date(Date.now() + env.AUTH_PASSWORD_RESET_TTL_MINUTES * 60_000);

    await withTenantTx(this.database.db, tenant.id, async (tx) => {
      // Retire any outstanding link first. The partial unique index of 0113 allows only
      // one live token per user, and more importantly a user who clicks "forgot" twice
      // should not be left with several valid links sitting in their mailbox history.
      await tx
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(
          and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)),
        );

      await tx.insert(passwordResetTokens).values({
        id: newId(),
        tenantId: tenant.id,
        userId: user.id,
        tokenHash,
        expiresAt,
        ...(meta.ip ? { requestedIp: meta.ip } : {}),
        ...(meta.userAgent ? { requestedUserAgent: meta.userAgent } : {}),
      });
    });

    await this.sendResetEmail({
      tenantId: tenant.id,
      user: { email: user.email, fullName: user.fullName },
      token,
      expiresAt,
    });
  }

  async resetPassword(input: ResetPasswordRequest): Promise<void> {
    const tenant = await withTx(this.database.db, async (tx) => {
      const rows = await tx
        .select({ id: tenants.id, code: tenants.code, status: tenants.status })
        .from(tenants)
        .where(sql`lower(${tenants.code}) = lower(${input.tenantCode})`)
        .limit(1);
      return rows[0];
    });
    if (!tenant) {
      throw new DomainError(errorCodes.VALIDATION_FAILED, 'Reset link is invalid or has expired', 400);
    }

    const tokenHash = hashResetToken(input.token);

    // Read first, consume later. The claim itself stays a guarded UPDATE (below) so the
    // atomicity guarantee is unchanged — but nothing is marked used until every other
    // reason to reject the request has already been ruled out. Consuming the token
    // *before* checking the password policy would burn the link on a weak password and
    // send the user back through a fresh e-mail round-trip to try again.
    const live = await withTenantTx(this.database.db, tenant.id, async (tx) => {
      const rows = await tx
        .select({
          id: passwordResetTokens.id,
          userId: passwordResetTokens.userId,
          email: users.email,
          fullName: users.fullName,
        })
        .from(passwordResetTokens)
        .innerJoin(users, eq(users.id, passwordResetTokens.userId))
        .where(
          and(
            eq(passwordResetTokens.tokenHash, tokenHash),
            isNull(passwordResetTokens.usedAt),
            sql`${passwordResetTokens.expiresAt} > now()`,
          ),
        )
        .limit(1);
      return rows[0];
    });
    if (!live) {
      throw new DomainError(errorCodes.VALIDATION_FAILED, 'Reset link is invalid or has expired', 400);
    }

    // Checked against the same policy as `changePassword`, and before the claim, so a
    // password that fails it costs the user a retry rather than a new reset e-mail.
    this.passwords.assertPolicy(input.new, { email: live.email, fullName: live.fullName });

    const claimed = await withTenantTx(this.database.db, tenant.id, async (tx) => {
      // Still guarded on `used_at IS NULL AND expires_at > now()` rather than
      // read-then-write, so two simultaneous submissions of the same link cannot both
      // succeed — whichever UPDATE matches zero rows loses, and that is the answer.
      const result = await tx
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(
          and(
            eq(passwordResetTokens.tokenHash, tokenHash),
            isNull(passwordResetTokens.usedAt),
            sql`${passwordResetTokens.expiresAt} > now()`,
          ),
        )
        .returning({ id: passwordResetTokens.id, userId: passwordResetTokens.userId });
      return result[0];
    });
    if (!claimed) {
      throw new DomainError(errorCodes.VALIDATION_FAILED, 'Reset link is invalid or has expired', 400);
    }

    const passwordHash = await this.passwords.hash(input.new);

    await withTenantTx(this.database.db, tenant.id, async (tx) => {
      await tx
        .update(users)
        .set({
          passwordHash,
          mustChangePassword: false,
          passwordChangedAt: new Date(),
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date(),
          updatedBy: claimed.userId,
          version: sql`${users.version} + 1`,
        })
        .where(eq(users.id, claimed.userId));
      // A recovery is, by definition, a session the legitimate owner no longer controls.
      // Every existing refresh token dies with the old password (SECURITY_ARCHITECTURE §2),
      // so a takeover cannot ride in on a token issued before the reset.
      await tx
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(and(eq(refreshTokens.userId, claimed.userId), isNull(refreshTokens.revokedAt)));
    });
  }

  /**
   * Mails the link. Kept out of `forgotPassword` so the two failure modes stay separate:
   * a mail failure must never make the endpoint answer differently, or the response
   * shape would leak whether the account exists after all.
   */
  private async sendResetEmail(input: {
    tenantId: string;
    user: { email: string; fullName: string };
    token: string;
    expiresAt: Date;
  }): Promise<void> {
    const appUrl = (env.AUTH_PASSWORD_RESET_URL_BASE ?? '').replace(/\/+$/, '');
    if (!appUrl) return; // Not configured: the link cannot be built, so nothing is mailed.

    // Only the token travels in the link. The tenant code is **not** included: the reset
    // screen asks for it, because the same person can hold memberships in more than one
    // tenant and a link that silently picked one would be a link that logs them into the
    // wrong one. It is also one less secret in a URL that ends up in a browser history.
    const link = `${appUrl}?reset=${encodeURIComponent(input.token)}`;
    const expires = input.expiresAt.toISOString().slice(0, 16).replace('T', ' ');

    try {
      await this.email.send({
        event: 'password.reset',
        tenantId: input.tenantId,
        to: input.user.email,
        toName: input.user.fullName,
        locale: 'ar',
        // Only the three variables the `password.reset` event declares. The catalogue check
        // in `email-templates.service` rejects any `{{var}}` outside the event's list, so
        // passing the tenant name here would fail the send rather than render it.
        variables: {
          name: input.user.fullName,
          link,
          expires,
        },
      });
    } catch {
      // Swallowed on purpose. The caller has already been told 204, and a mail outage is
      // not something an unauthenticated request should be able to observe.
    }
  }

  async changePassword(auth: AuthContextValue, input: ChangePasswordRequest): Promise<void> {
    const user = await withTx(this.database.db, async (tx) => {
      const rows = await tx
        .select({ ...USER_COLUMNS, passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, auth.userId))
        .limit(1);
      return rows[0];
    });
    if (!user) {
      throw new DomainError(errorCodes.UNAUTHENTICATED, 'User not found', 401);
    }

    const currentOk = await this.passwords.verify(user.passwordHash, input.current);
    if (!currentOk) {
      throw new DomainError(errorCodes.VALIDATION_FAILED, 'Current password is incorrect', 400, {
        field: 'current',
      });
    }

    this.passwords.assertPolicy(input.new, { email: user.email, fullName: user.fullName });
    const passwordHash = await this.passwords.hash(input.new);

    await withTx(this.database.db, async (tx) => {
      await tx
        .update(users)
        .set({
          passwordHash,
          mustChangePassword: false,
          passwordChangedAt: new Date(),
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date(),
          updatedBy: user.id,
          version: sql`${users.version} + 1`,
        })
        .where(eq(users.id, user.id));
      // Password change invalidates every existing session (SECURITY_ARCHITECTURE §2).
      await tx
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(and(eq(refreshTokens.userId, user.id), isNull(refreshTokens.revokedAt)));
    });
  }

  // --- internals ---------------------------------------------------------------

  private async findActiveMembership(tenantId: string, userId: string): Promise<MembershipRow | undefined> {
    return withTenantTx(this.database.db, tenantId, async (tx) => {
      const rows = await tx
        .select(MEMBERSHIP_COLUMNS)
        .from(memberships)
        .innerJoin(tenants, eq(tenants.id, memberships.tenantId))
        .where(
          and(
            eq(memberships.tenantId, tenantId),
            eq(memberships.userId, userId),
            eq(memberships.status, 'active'),
            isNull(memberships.deletedAt),
          ),
        )
        .limit(1);
      return rows[0];
    });
  }

  private async registerFailedLogin(userId: string): Promise<void> {
    await withTx(this.database.db, async (tx) => {
      await tx
        .update(users)
        .set({
          failedLoginAttempts: sql`${users.failedLoginAttempts} + 1`,
          lockedUntil: sql`CASE
              WHEN ${users.failedLoginAttempts} + 1 >= ${env.AUTH_LOGIN_MAX_FAILURES}
              THEN now() + (${env.AUTH_LOCKOUT_MINUTES} || ' minutes')::interval
              ELSE ${users.lockedUntil}
            END`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    });
  }

  private async registerSuccessfulLogin(userId: string): Promise<void> {
    await withTx(this.database.db, async (tx) => {
      await tx
        .update(users)
        .set({ lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null })
        .where(eq(users.id, userId));
    });
  }

  private async revokeFamily(family: string): Promise<void> {
    await withTx(this.database.db, async (tx) => {
      await tx
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(and(eq(refreshTokens.family, family), isNull(refreshTokens.revokedAt)));
    });
  }

  private async issueSession(
    user: UserRow,
    membership: MembershipRow,
    meta: RequestMeta,
  ): Promise<LoginResponse> {
    const platform = await resolvePlatformAccess(this.database, user.id, user.isPlatformAdmin);
    const accessToken = await this.tokens.signAccessToken({
      sub: user.id,
      tid: membership.tenantId,
      mid: membership.id,
      scope: ['erp'],
      pam: platform.isPlatformAdmin,
      proles: platform.platformRoles,
    });

    const refreshToken = this.tokens.generateRefreshToken();
    await withTx(this.database.db, async (tx) => {
      await tx.insert(refreshTokens).values({
        id: newId(),
        userId: user.id,
        tokenHash: this.tokens.hashRefreshToken(refreshToken),
        family: newId(),
        tenantId: membership.tenantId,
        expiresAt: new Date(Date.now() + this.tokens.refreshTtlSeconds * 1000),
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      });
    });

    return {
      accessToken: accessToken.token,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.tokens.accessTtlSeconds,
      user: toUserDto({ ...user, isPlatformAdmin: platform.isPlatformAdmin, platformRoles: platform.platformRoles }),
      memberships: [await this.toMembershipDto(membership)],
    };
  }

  private async toMembershipDto(membership: MembershipRow): Promise<MembershipDto> {
    return withTenantTx(this.database.db, membership.tenantId, async (tx) => toMembershipDto(tx, membership));
  }
}
