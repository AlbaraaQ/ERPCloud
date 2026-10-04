-- 0115 — tenant AI provider key (RC-11)
--
-- The platform key lives in `ai_platform_settings.api_key_enc` (0104). A tenant had no
-- way to bring its own model key: `ai_settings` carried only the switch, the provider
-- name and the limits, so `GET /ai/settings` answered `{"enabled":true,"provider":null}`
-- for a tenant that never opened the screen — the assistant looked "on" with nothing
-- behind it.
--
-- The column is nullable and absent for existing rows on purpose: an empty key must
-- stay "no key", not "a key that fails to decrypt". Sealing reuses the existing
-- `secret-box.ts` envelope (`v1:<iv>:<tag>:<ciphertext>`), so `DATA_ENC_KEY` rotation
-- covers it exactly as it covers the MFA secret and the e-invoicing credentials.
--
-- The value never leaves the server: the API reports `hasApiKey` (a boolean) the way
-- `hasPlatformKey` already does, and never the key itself.

ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS api_key_enc text;

COMMENT ON COLUMN ai_settings.api_key_enc IS
  'Tenant-owned AI provider key, sealed with secret-box.ts (v1: AES-256-GCM). NULL means no key. Never selected by the API — only hasApiKey is.';
