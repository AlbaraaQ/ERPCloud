-- Wave 3, RC-10 — `resend` becomes a third e-mail provider.
--
-- The contract and the mailer were extended to accept `resend`, but two CHECK
-- constraints still said `IN ('console', 'smtp')`:
--
--   * `email_settings_provider_check` — picking `resend` from the platform console
--     answered **500**, not a clean 422, because the failure came from the database
--     after the request had already passed the Zod schema.
--   * `email_messages_provider_check` — even with the setting saved, sending through
--     the new provider would have failed when the message row recorded its provider.
--
-- Both are widened here rather than dropped: the constraint is what stops a typo or a
-- half-migrated provider reaching the column, and that protection is worth keeping.
-- Adding a provider means adding it to the contract, the mailer, and here — in that
-- order, or the API answers 500 where the operator expected a working send.
--
-- Idempotent by construction (DROP … IF EXISTS then ADD), so re-applying is safe.
ALTER TABLE email_settings DROP CONSTRAINT IF EXISTS email_settings_provider_check;
ALTER TABLE email_settings
  ADD CONSTRAINT email_settings_provider_check
  CHECK (provider IN ('console', 'smtp', 'resend'));

ALTER TABLE email_messages DROP CONSTRAINT IF EXISTS email_messages_provider_check;
ALTER TABLE email_messages
  ADD CONSTRAINT email_messages_provider_check
  CHECK (provider IN ('console', 'smtp', 'resend'));
