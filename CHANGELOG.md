# Changelog

Notable changes to Gap Goblins. Entries describe repository changes, not proof of
a production deployment. Releases use Semantic Versioning; the manual process is
in [HANDOFF.md](HANDOFF.md#manual-release-checklist).

## [Unreleased]

### Added

- Lead Finder turns sample or imported CSV business data into scored CRM prospects
  and branded gap reports, with HTML previews and queued PDF downloads.
- Report branding lets each tenant customize its company details and call to action.
- Territories let tenants constrain scans to ZIP codes or drawn areas; businesses
  with unknown locations remain marked "Not checked" rather than silently excluded.
- The Conversations inbox supports tenant-connected Twilio SMS, recorded consent,
  recipient-local quiet hours and opt-out handling.

### Fixed

- Gap-report previews display without conflicting with frame protection.
- PDF status polling continues while a report is being generated.
- Businesses with different Google knowledge IDs are no longer merged solely
  because they share a phone number or Maps link.

### Documentation

- Documented local bucket/admin/tenant/browser setup and a manual release procedure
  covering versioned migrations, verification, release notes and recovery.

### Known limitations

- Omkar live scanning is UNVERIFIED; CSV import and sample data are the supported
  paths for validation. Uncommitted live-search work is not a released integration.
- Production worker Chromium provisioning remains open. Local PDF support does not
  establish that the Docker worker can generate PDFs.
- Real Twilio delivery still requires account/registration setup, a public callback
  URL and live validation. No delivery claim is made here.
- Milestone 1 does not send prospect email. Resend is restricted to system email.

<!-- Add a dated version section and matching tag only through an approved release. -->
