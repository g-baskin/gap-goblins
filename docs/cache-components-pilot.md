# Next 16 Cache Components / PPR Pilot Note

## Current config

- `next.config.ts` does **not** enable `cacheComponents` or `experimental.ppr`.
- In Next 16.2.6, `cacheComponents` is a top-level `NextConfig` flag. The old `experimental.cacheComponents` and `experimental.ppr` entries are deprecated, and PPR is implicitly enabled when `cacheComponents` is enabled.
- `app/admin/layout.tsx` currently exports `dynamic = "force-dynamic"` for every admin route because static generation previously hit React 19/client context issues.
- `proxy.ts` runs on admin, API, and public routes, reads request headers/cookies through NextAuth, and injects a per-request CSP nonce via request/response headers.

## Safe pilot candidates

These are the safest places to pilot once `cacheComponents` can be enabled in an isolated environment, because their page shell is static or client-only and all request/user-specific data is loaded later on the client or inside existing Suspense boundaries.

- `/admin/login`
  - Uses `useSearchParams()` only inside `LoginForm`, already wrapped in `<Suspense>`.
  - Auth redirect still happens in `proxy.ts`, not in the page.
  - Risk: callback URL rendering must remain client-side only, never inside a cached server component.
- `/admin/reset-password`
  - Client-only form with no route params and no server request data in the page.
  - POSTs token/email state to `/api/admin/security/reset-password`.
  - Risk: auth-page redirects still depend on `proxy.ts` seeing the current session cookie.
- `/admin/crm/pipeline`
  - Static server shell plus `PipelineClientLoader`; data is fetched by the client-side CRM components.
  - Risk: the page lives under the forced-dynamic admin root today, so it is safe only as a future pilot after admin layout strategy is adjusted.
- `/admin/settings/business`
  - Client-only page that fetches site settings after hydration.
  - Risk: storage upload/delete endpoints remain fully dynamic and authenticated.
- Redirect-only pages: `/admin/outreach` and `/admin/settings`
  - No request data in the page modules; they only call `redirect()` to stable admin paths.
  - Risk: not useful as a PPR proof because they do not render a meaningful shell.

## Routes that must stay dynamic or Suspense-wrapped

- All `/admin/**` routes currently stay dynamic because `app/admin/layout.tsx` exports `dynamic = "force-dynamic"`.
  - Removing that flag should be a separate migration because the dashboard layout contains client providers and the project note says it avoids React 19 static-generation issues.
- `/admin/invite/[token]` and `/admin/reset-password/[token]`
  - Both read dynamic `params` in client pages by unwrapping the promised params in `useEffect()`.
  - Under a cache-components pilot, keep param-dependent UI below a client boundary or Suspense boundary. Do not pass token-derived state into a cached server function.
- `/admin/(dashboard)/outreach/campaigns/[id]`
  - Uses `useParams()` client-side and then fetches campaign/contact/schedule/performance data.
  - The large route also disables SSR for editor/chart islands with `next/dynamic`, so keep those as client islands rather than cached server work.
- Dashboard data routes such as `/admin`, `/admin/crm`, `/admin/crm/deals`, `/admin/crm/leads`, `/admin/inbox`, `/admin/newsletter`, `/admin/newsletter/analytics`, and `/admin/outreach/campaigns`
  - They render live operational data or fetch it from authenticated APIs after hydration.
  - Existing server dashboard sections under `/admin` and `/admin/crm` are already Suspense-wrapped. If `cacheComponents` is enabled later, keep DB reads outside `"use cache"` unless the data is intentionally shared and has an explicit cache life/tag strategy.
- Settings pages that call `useSession()` (`/admin/settings/profile`, `/admin/settings/security`, `/admin/settings/general`, `/admin/settings/users`, `/admin/settings/appearance`, `/admin/settings/notifications`)
  - These depend on the current user's session and must remain client/session-bound.
  - Never put session-derived values in a public cached component.
- All authenticated API routes under `/api/admin/**`, `/api/crm/**`, `/api/newsletter/**`, `/api/notifications/**`, and most `/api/outreach/**`
  - They call `auth()`, inspect `request.nextUrl.searchParams` or `new URL(request.url).searchParams`, read dynamic route `params`, parse request bodies, or mutate database state.
  - Keep them dynamic. They are not good cache-components/PPR targets.
- Webhook/cron/token routes (`/api/webhooks/cal`, `/api/outreach/webhooks/resend`, `/api/cron/*`, `/api/outreach/process`, `/api/outreach/unsubscribe/[contactId]`)
  - These depend on signatures, bearer tokens, query tokens, request bodies, or side effects.
  - They must stay dynamic and excluded from any cache assumptions.

## Exact risks before enabling `cacheComponents`

- `cacheComponents: true` is global. There is no tiny route-only config pilot in this app without changing runtime behavior for unrelated routes.
- PPR is implied by `cacheComponents`; enabling it may change streaming/prerender behaviour across the App Router even if individual admin pages still force dynamic.
- Request-specific data (`cookies()`, `headers()`, `searchParams`, `params`, `auth()`, and `NextRequest` fields) cannot be used inside `"use cache"` scopes. If a cached function needs request values, read them outside the cached function and pass only stable, non-secret arguments.
- The proxy creates a per-request CSP nonce and forwards it through request/response headers. Any static/PPR shell that accidentally caches nonce-bearing markup or headers could break CSP or reuse a nonce. This needs explicit runtime verification before enabling global caching.
- Admin auth is enforced in `proxy.ts`, not in the page tree. Cached admin shells must not be publicly reusable across users or unauthenticated requests.
- Session-aware client pages using `useSession()` may briefly render without session data after hydration. That is fine today, but a cached server shell must not bake in user-specific names, roles, avatar URLs, or TOTP state.
- DB-backed operational data changes frequently. Caching dashboard metrics, campaign data, inbox replies, contacts, deals, and newsletter stats without tags/revalidation risks stale admin decisions.
- Existing `dynamic = "force-dynamic"` on `app/admin/layout.tsx` is a deliberate guard. Removing it and enabling cache components should be tested together, not bundled into this investigation.

## Recommendation

Do not enable `cacheComponents` in `next.config.ts` yet. The smallest safe next step is a separate local-only branch/experiment that enables top-level `cacheComponents: true`, keeps the admin root forced dynamic, and verifies `/admin/login`, `/admin/reset-password`, `/admin/crm/pipeline`, and the CSP nonce behaviour before removing any dynamic guard.

No runtime code/config pilot was applied in this pass because the available switch is global and would affect more than the safe pilot routes.
