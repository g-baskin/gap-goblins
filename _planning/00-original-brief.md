# Build Prompt: Local Lead Finder + AI Outreach (MVP)

Give this entire prompt to your coding agent. It is self-contained.

---

## Mission

Build the MVP of a **local lead finder with AI outreach** inside the existing `online-crm-ai` repository. This is product #4 of a four-product ecosystem. It will launch first because it is the smallest build and it feeds customers to the other three products later.

**What the product does:** A user types a niche and a location (e.g. "dentists in Richmond VA"). The app scrapes Google Maps for those businesses, scores each one on how weak its online presence is (unclaimed Google Business Profile, few/bad reviews, no website), shows the weakest first, generates a branded "gap report" PDF for each prospect, and runs an AI-personalized email outreach sequence that references each prospect's specific gaps. This exact playbook sold thousands of copies as "Mapify360" on JVZoo — the gap report is the sales weapon.

## Repositories (clone these first)

1. **Base build repo:** `https://github.com/g-baskin/online-crm-ai` (private, branch `main`)
   Stack: Next.js 16 (App Router) + React 19 + TypeScript, Bun runtime, Drizzle ORM + PostgreSQL, NextAuth v5, Tailwind CSS v4 + shadcn/ui.
   **Already inside it — reuse, do not rebuild:**
   - CRM: contacts, deals, pipeline kanban, stage history
   - Outreach: campaign sequences, AI reply analysis, Resend webhooks, pg-boss send queue
   - Inbox: threaded email replies, suggested responses
   - Admin: NextAuth credentials + TOTP, users, appearance
   Match the existing code style, Drizzle schema patterns, and shadcn/ui components. Do not introduce a second ORM, a second auth system, or a second UI kit.

2. **Auth/billing/multi-tenancy reference:** `https://github.com/g-baskin/Legend-Copy-AI` (private, "Queen SaaS", MIT license)
   Next.js 15 + TypeScript, Prisma, Stripe subscriptions with webhooks, organizations with Owner/Admin/Member roles. **Copy patterns from it, not the Prisma layer** — the build repo uses Drizzle. Port the Stripe webhook handling and tenant-role model into Drizzle/Postgres idioms.

3. **MIT-licensed reference implementations (copy freely):**
   - `https://github.com/omkarcloud/google-maps-scraper` (MIT) — Google Maps business scraping. Use as the sourcing engine.
   - `https://github.com/hitb1099/outreach-os` (MIT) — lead scoring + outreach blueprint. Use for scoring logic structure.
   - `https://github.com/quionie/outreach-ai` (MIT) — AI-personalized email sequences. Use for the personalization approach.
   - `https://github.com/AbdelftahZowail/Quickly` (MIT) — sending, inbox rotation, follow-up timing. Use for deliverability mechanics.

## Hard license rule

**MIT only.** You may copy code from the four MIT repos above and from Queen SaaS. You may READ `https://github.com/pypesdev/coldflow` for ideas but **never copy its code** — it is GPL-3.0 and would contaminate a commercial product. Do not touch `LegendCopy` or `voice-agent-template` (AGPL) — they are not part of this build.

## MVP feature list (in build order)

1. **Lead Finder workspace** — new section in the app's sidebar. Form: niche (text) + location (text) + max results (default 50). "Find leads" button creates a scan job.
2. **Maps scraping** — background job (use the repo's existing pg-boss queue) that runs the omkarcloud scraper logic and stores per business: name, address, phone, website URL, Google rating, review count, Google Business Profile URL, photo count. Show live progress on the scan.
3. **Opportunity scoring** — score 0–100 per business, weakest first:
   - Google Business Profile unclaimed or barely filled: +40
   - No website: +25
   - Fewer than 20 reviews: +15
   - Rating below 4.0: +10
   - Fewer than 10 photos: +10
   Store the score plus the individual gap flags. This is the XLeads360 "sort by weakest first" mechanic.
4. **Prospects in the CRM** — each scraped business becomes a contact + deal in the existing pipeline, tagged with its scan, score, and gap flags. No duplicate contacts on re-scan (match by GBP URL or phone).
5. **Branded gap report (PDF)** — one click per prospect generates a PDF: their business name, their score, each gap explained in plain language ("Your Google profile is unclaimed — competitors show up first"), and a CTA to fix it. White-label the header with the tenant's company name/logo from settings. This is the product's core sales asset — make it look sharp.
6. **AI outreach sequences** — extend the repo's existing outreach system: per-prospect emails personalized with their actual gaps (business name, missing website, review count, unclaimed profile). Sequence: day 0 initial, day 3 follow-up, day 7 breakup. Attach or link the gap report in email 1. Sending via Resend (already wired), inbox rotation + throttling per the Quickly patterns, reply detection via the existing AI reply analysis.
7. **Dashboard** — scan history, lead list with scores and gap badges, report preview, per-prospect outreach status (sent/opened/replied), and basic stats (scanned, contacted, replied).

## Voltron API (build this now, not later)

This product is one of four that will combine later via APIs. Expose a versioned REST API from day one, authenticated by per-tenant API keys (add a keys page in settings):

- `GET /api/v1/prospects?scan_id=` — list prospects with scores and gap flags
- `GET /api/v1/prospects/:id` — single prospect detail
- `GET /api/v1/prospects/:id/report` — the gap report PDF
- `GET /api/v1/scans` / `POST /api/v1/scans` — list and trigger scans
- `GET /api/v1/campaigns/:id/status` — outreach status per prospect
- `POST /api/v1/outreach/enroll` — enroll a prospect (by ID) into a sequence

Every endpoint: tenant-scoped, JSON, paginated lists, standard error shapes. Write an `API.md` in the repo root documenting each endpoint with a curl example. The other three products will consume exactly this contract — do not break it later without versioning.

## Billing

One paid tier via Stripe (port the Queen SaaS webhook pattern): flat monthly price, limits enforced per tenant (e.g. scans/month, prospects/month, emails/month). Put limit constants in one config file so pricing can change without code edits.

## Out of scope for the MVP (do not build)

Voice receptionist, support widget, ad generator, phone-call follow-up, SMS sequences, reseller/white-label resale, team seats beyond Owner/Admin/Member, analytics beyond the dashboard stats above. If tempted to add something, ask first.

## Acceptance criteria

- [ ] I can enter "plumbers in Fredericksburg VA", get 50 scored prospects weakest-first, with no duplicates on re-scan
- [ ] Each prospect shows correct gap flags (spot-check 5 against real Google listings)
- [ ] Gap report PDF generates with the tenant's branding and reads persuasively
- [ ] A 3-email sequence sends via Resend with per-prospect personalization and correct follow-up timing
- [ ] Replies are detected and surfaced in the inbox
- [ ] All six API endpoints work with a tenant API key and are documented in API.md
- [ ] Stripe test-mode subscription activates the paid tier and enforces limits
- [ ] `bun run build` passes with zero TypeScript errors; existing CRM/outreach/inbox features still work

## Working rules

- Small commits, each one building and passing typecheck.
- Reuse before you build: check the repo for an existing system (queue, mailer, PDF, settings) before adding a library.
- Ask before adding any new npm dependency or any new external service.
- Never commit secrets. Use the existing `.env.example` pattern.
