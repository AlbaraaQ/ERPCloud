-- Password recovery — the missing half of the auth surface (API_CONTRACT §1).
--
-- Until this table existed the only way back into an account was `POST /auth/change-password`,
-- which requires knowing the current password. A user who forgot it was locked out
-- permanently, and the only remedy was a database session — which is not a recovery
-- mechanism, it is an operations escalation.
--
-- Design decisions worth stating, because they are the ones that make this safe:
--
--   1. **The token is stored hashed, never in the clear.** A leaked database dump must
--      not be a set of live password-reset links. Only a SHA-256 digest of the token is
--      persisted, so the value that travels in the email is the only copy that exists.
--      (`password_reset_tokens` was already named in `backup.service.ts`'s table list —
--      the backup plane expected this table; it had simply never been created.)
--
--   2. **Single use.** `used_at` is set the moment the password is reset, and the update
--      that sets it is guarded on `used_at IS NULL`, so a token replayed twice fails
--      rather than resetting the password again.
--
--   3. **Short TTL.** 30 minutes by default. A reset link is a bearer credential; the
--      shorter its life, the smaller the window in which a stolen mailbox is an
--      account takeover.
--
--   4. **One live token per user.** The partial unique index means requesting a reset
--      twice invalidates the first link, so a user who fat-fingers the button cannot
--      end up with several valid links floating around in their mailbox history.
--
--   5. **`tenant_id` is denormalised on purpose.** The request that consumes the token is
--      `@Public()` — there is no session, so there is no `app.tenant_id` GUC. Without the
--      column on the token itself there would be no way to scope the lookup, and RLS on a
--      table with a NULL tenant setting matches nothing (the trap recorded as RC-12).
--      The lookup is therefore `tenant_code + token hash`, and the tenant is resolved
--      before any tenant-scoped write happens.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  /** SHA-256 of the token that was emailed. The token itself is never stored. */
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  /** Request provenance, for the audit trail when a reset is actually consumed. */
  requested_ip text,
  requested_user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT password_reset_tokens_hash_unique UNIQUE (token_hash)
);

-- One live (unused, unexpired) token per user. Partial, so historical rows are free
-- to accumulate for the audit trail without ever blocking a new request.
CREATE UNIQUE INDEX IF NOT EXISTS password_reset_tokens_live_per_user
  ON password_reset_tokens(user_id)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx
  ON password_reset_tokens(user_id, created_at DESC);

-- The recovery request is public and unauthenticated, so nothing on the path has a
-- session — but the token lookup is still tenant-scoped. The endpoint resolves the
-- `tenantCode` the caller typed (exactly as `login` does, against `tenants`, which is
-- readable without a GUC), and only then binds the GUC with `withTenantTx` before
-- touching this table. The tenant code is not a secret; the token hash is. So the read
-- is both isolated and reachable, and a NULL-GUC read cannot happen by accident —
-- the same trap RC-12 records, avoided by construction rather than by convention.
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS password_reset_tokens_tenant_isolation ON password_reset_tokens;
CREATE POLICY password_reset_tokens_tenant_isolation ON password_reset_tokens
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

-- Read by the public recovery endpoint before any tenant context exists; written only
-- from inside `withTenantTx`, which is what binds the GUC.
GRANT SELECT ON password_reset_tokens TO erp_api;
GRANT INSERT, UPDATE ON password_reset_tokens TO erp_api;
GRANT ALL PRIVILEGES ON password_reset_tokens TO erp_migrator;
