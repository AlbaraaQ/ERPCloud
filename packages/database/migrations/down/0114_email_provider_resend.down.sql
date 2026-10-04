-- Rollback for 0114_email_provider_resend.
--
-- Narrowing the constraint back requires that no row still names `resend`, so those
-- rows are folded back to `console` first — the transport that always works. This is
-- the correct direction on rollback: a half-removed provider must not leave rows the
-- schema refuses to describe, and `console` is the only value that can never be wrong
-- (it means "logged, not delivered", which is true of a provider that no longer
-- exists).
UPDATE email_settings SET provider = 'console' WHERE provider = 'resend';
UPDATE email_messages SET provider = 'console' WHERE provider = 'resend';

ALTER TABLE email_settings DROP CONSTRAINT IF EXISTS email_settings_provider_check;
ALTER TABLE email_settings
  ADD CONSTRAINT email_settings_provider_check
  CHECK (provider IN ('console', 'smtp'));

ALTER TABLE email_messages DROP CONSTRAINT IF EXISTS email_messages_provider_check;
ALTER TABLE email_messages
  ADD CONSTRAINT email_messages_provider_check
  CHECK (provider IN ('console', 'smtp'));
