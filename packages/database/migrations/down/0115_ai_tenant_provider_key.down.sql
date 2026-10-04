-- 0115 down — tenant AI provider key (RC-11)
--
-- Dropping the column destroys the tenant keys irreversibly. That is the honest
-- behaviour for a rollback of an additive column, but it is recorded here so nobody
-- is surprised by it: restore from a backup if those keys still matter.

ALTER TABLE ai_settings DROP COLUMN IF EXISTS api_key_enc;
