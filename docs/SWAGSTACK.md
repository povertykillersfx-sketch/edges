# SwagStack Studio

Multi-tenant website customizer SaaS mounted inside the existing EdgeX / EA Hosting Hub repo.

- Studio app: `/studio`
- Published customer sites: `/s/:slug`
- Existing desk (`/`, `/admin`) is unchanged

## What works in this MVP

| Phase | Capability | Status |
| --- | --- | --- |
| 1 | Supabase Auth sign-up / sign-in / password reset UI | Works when Supabase Auth + `ss_*` schema are applied |
| 1 | Customer dashboard + template library (6 templates) | Works (builtins offline; DB templates when schema applied) |
| 1 | Super-admin dashboard (customers, sites, plans, audit) | Works for `ss_profiles.role = super_admin` |
| 1 | Tenant isolation via RLS on `ss_*` tables | Works after schema apply |
| 2 | Live editor (text, colors, services/prices, CTA, SEO) | Works |
| 2 | Desktop / mobile preview | Works |
| 2 | Autosave draft + media uploads to `swagstack-media` | Works after storage policies + auth |
| 3 | Draft vs published config, publish / unpublish | Works after schema apply |
| 3 | In-app publish path `/s/:slug` | Works for `status = published` |
| 3 | Custom domain records + DNS instruction architecture | Works as pending workflow; DNS/Vercel attach needs ops config |
| 4 | Configurable plans in DB + billing UI | Works |
| 4 | Payment provider interfaces (PayFast / Stripe) | Interface only — refuses fake success until secrets + checkout/webhook wiring are finished |
| 5 | Drag-and-drop / advanced section ordering | Not in MVP (by design) |

## Local run

```bash
npm install
cp .env.example .env   # fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev
```

Open:

- Desk: `http://localhost:5173/`
- Studio: `http://localhost:5173/studio`
- Example published path: `http://localhost:5173/s/<slug>`

## GitHub Pages preview

Project URL pattern: `https://povertykillersfx-sketch.github.io/edges/studio`

```bash
npm run build:pages
```

This builds with `base=/edges/`, writes `404.html` + `studio/index.html` SPA fallbacks, and `.nojekyll`.

### Enable Pages (required once — agent tokens cannot flip this)

1. Repo **Settings → Pages**
2. Either:
   - **Source: GitHub Actions** (uses `.github/workflows/github-pages.yml`), or
   - **Source: Deploy from a branch** → branch `gh-pages` / folder `/ (root)`
3. Wait for the deploy, then open `/studio` (or `/studio/login`) on the `*.github.io` URL.

## Database setup

1. Keep the existing desk schema (`supabase/schema.sql`) as-is.
2. Run `supabase/swagstack_schema.sql` in the Supabase SQL editor.
3. Enable Email auth in Supabase Authentication.
4. Confirm storage bucket `swagstack-media` exists (created by the SwagStack SQL).
5. Promote a super-admin after first signup:

```sql
update public.ss_profiles
set role = 'super_admin'
where email = 'you@example.com';
```

## Environment variables

### Required for Studio auth + data

| Name | Where | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Vite + Vercel | Existing project URL |
| `VITE_SUPABASE_ANON_KEY` | Vite + Vercel | Public anon key only |

### Payments (optional; not live until fully configured)

| Name | Where | Notes |
| --- | --- | --- |
| `VITE_PAYFAST_MERCHANT_ID` / `VITE_PAYFAST_MERCHANT_KEY` | Vite | Public identifiers only |
| `PAYFAST_MERCHANT_ID` / `PAYFAST_MERCHANT_KEY` / `PAYFAST_PASSPHRASE` | Vercel server | Required for real PayFast |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Vite | Publishable only |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Vercel server | Required for real Stripe |

`/api/swagstack-payments` returns `requires_configuration` until server secrets and checkout/webhook verification are completed. It will not invent a successful charge.

### Existing desk secrets (unchanged)

`open_ai`, `mt5_api` / `API_TOKEN` remain server-only as before.

## Domain architecture

1. **Platform path (MVP):** every published site is available at `/s/:slug` on the same Vercel deployment.
2. **Platform subdomain (ops):** point `*.your-platform-domain` to the Vercel project, then map host → slug (future edge middleware / host rewrite). Rows are stored in `ss_domains` with `kind = subdomain`.
3. **Custom domain:** customer adds hostname in Studio → pending row with TXT + CNAME instructions → attach domain in Vercel / DNS provider → mark `active` after verification. Verification automation is intentionally not claimed as complete.

## Deploy (Vercel)

1. Deploy as today (`npm run build`, output `dist`).
2. Apply `supabase/swagstack_schema.sql`.
3. Set env vars in the Vercel project.
4. Confirm `/api/swagstack-payments` is deployed (listed in `vercel.json`).
5. Smoke-test `/studio`, sign-up, create site, publish, open `/s/:slug`.

## Tests

```bash
npm test
```

Unit coverage currently includes validation, route parsing, and payment status helpers.

## Security notes

- Customers only read/write their own `ss_websites`, configs, media, domains, subscriptions, and payments (RLS).
- Super-admins use `ss_is_super_admin()`.
- Uploads limited to image MIME types and 5MB; paths are namespaced by `auth.uid()`.
- Config values are sanitized; script tags / `javascript:` URLs are stripped before save.
- Never put PayFast passphrase or Stripe secret keys in `VITE_*` variables.

## Promoting templates

Template definitions also ship as builtins in `src/swagstack/lib/templates.js` so the library remains usable before/without DB rows. Prefer DB `ss_templates` + `ss_template_versions` for production edits from the admin tools / SQL.
