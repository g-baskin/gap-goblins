# Gap Goblins glossary

**Tenant**: an agency account using Gap Goblins. Every scan, business, prospect, report and branding row belongs to exactly one tenant.

**Scan**: one lead-finding run for a niche and a location (or an uploaded CSV), stored in `lead_scans`. It goes through queued, running, completed, failed or cancelled.
_Avoid:_ search, job (except when talking about the pg-boss job that runs a scan).

**Lead source**: where a scan's businesses come from, implemented as a `LeadSource` adapter: `fixture`, `csv-import` or `omkar-desktop`.
_Avoid:_ scraper, provider.

**Business**: one local business listing as it was normalized from a lead source, stored once per tenant in `lead_businesses` and deduplicated by kgmid → place_id → cid → phone_e164 → gbp_url.
_Avoid:_ lead, listing (except when talking about the Google Maps listing itself), company.

**Prospect**: a business that has been linked to a CRM contact and a deal in the Gap Goblins Prospects pipeline. Every scanned business that isn't skipped becomes a prospect.
_Avoid:_ lead, contact (use contact only for the CRM record).

**Lead Finder**: the name of the product section where users run scans. "Lead" appears only in this name and in `LeadSource`, `lead_*` table names. It is not a domain term on its own.

**Gap flag**: one scored weakness on a business (gbp_unclaimed, gbp_thin, no_website, few_reviews, low_rating, few_photos). Its value is true, false or unknown.
_Avoid:_ flag on its own, gap on its own, issue, problem.

**Unknown (Not checked)**: the value of a gap flag when the lead source didn't provide the field. It scores 0 and appears as "Not checked" in reports.

**Score**: the 0–100 opportunity score for a business in one scan, worked out from its gap flags under one rubric version. Higher means a weaker online presence.
_Avoid:_ rating (rating means the business's Google star rating).

**Rubric version**: the identifier (`RUBRIC_VERSION`) of the gap-flag rules and weights that produced a score.

**Scan result**: the score and gap flags for one business in one scan (`lead_scan_results`). A rescan adds a new scan result, never a new business or prospect.

**Gap report**: the branded, deterministic HTML/PDF that explains a prospect's true gap flags and the tenant's call to action.
_Avoid:_ audit, report card.

**Tenant branding**: a tenant's company name, logo, colours and call-to-action copy used on gap reports (`tenant_branding`).
