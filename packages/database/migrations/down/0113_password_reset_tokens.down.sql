-- Rollback for 0113_password_reset_tokens.
--
-- Dropping the table drops every outstanding reset link with it, which is the correct
-- behaviour on rollback: a half-deployed recovery feature should not leave live
-- bearer credentials behind it.
DROP INDEX IF EXISTS password_reset_tokens_user_idx;
DROP INDEX IF EXISTS password_reset_tokens_live_per_user;
DROP POLICY IF EXISTS password_reset_tokens_tenant_isolation ON password_reset_tokens;
DROP TABLE IF EXISTS password_reset_tokens;
