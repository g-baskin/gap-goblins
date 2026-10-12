-- Repair outreach campaign template columns when historical migration metadata
-- skipped 0004/0005 on an existing database.
--
-- This is intentionally additive/idempotent: it adds the columns required by the
-- current app code, aligns defaults, and preserves legacy email_body/email_subject
-- columns if they still exist.

ALTER TABLE outreach_campaigns
  ADD COLUMN IF NOT EXISTS email_1_template text,
  ADD COLUMN IF NOT EXISTS email_2_template text,
  ADD COLUMN IF NOT EXISTS email_3_template text,
  ADD COLUMN IF NOT EXISTS email_1_subject_template text,
  ADD COLUMN IF NOT EXISTS email_2_subject_template text,
  ADD COLUMN IF NOT EXISTS email_3_subject_template text;

UPDATE outreach_campaigns
SET
  email_1_template = COALESCE(email_1_template, '{{email_1_body}}'),
  email_2_template = COALESCE(email_2_template, '{{email_2_body}}'),
  email_3_template = COALESCE(email_3_template, '{{email_3_body}}');

ALTER TABLE outreach_campaigns
  ALTER COLUMN email_1_template SET DEFAULT '{{email_1_body}}',
  ALTER COLUMN email_2_template SET DEFAULT '{{email_2_body}}',
  ALTER COLUMN email_3_template SET DEFAULT '{{email_3_body}}',
  ALTER COLUMN email_1_template SET NOT NULL,
  ALTER COLUMN email_2_template SET NOT NULL,
  ALTER COLUMN email_3_template SET NOT NULL;

ALTER TABLE outreach_sender_accounts
  ADD COLUMN IF NOT EXISTS signature_html text,
  ADD COLUMN IF NOT EXISTS signature_plain_text text;
