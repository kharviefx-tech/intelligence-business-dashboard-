# BusinessIQ — Business Intelligence Dashboard

BusinessIQ is a Next.js dashboard for analysing business transactions across company workspaces. The current implementation includes Supabase authentication, company onboarding, transaction entry, CSV import/export, and finance, sales, and geographic summaries.

## Current capabilities

- Supabase Auth sign-in/sign-up flows and protected onboarding/admin routes.
- Company workspaces with currency, industry, company size, website, country, and fiscal-year start month.
- Workspace membership roles enforced through Supabase Row Level Security (RLS).
- Manual income/expense entry with status, category, customer segment, and optional geographic fields.
- CSV template download, CSV validation/import, and data export.
- Revenue, expenses, net operating result (income less recorded expenses), pending transaction totals, category/segment summaries, monthly sales, and location summaries.
- Responsive dashboard styling and charts.

## Important limitations

BusinessIQ is still under active development and **is not yet production-ready for confidential or business-critical financial records**.

- Dashboard transactions are currently fetched with a client-side limit of 1,000 records. Large workspaces can therefore show incomplete totals until server-side pagination/aggregation is implemented.
- Financial metrics are transaction summaries, not audited accounting statements. Taxes, refunds, cost of goods sold, receivables/payables, bank reconciliation, and accounting-period close are not fully modelled.
- Sales, customer, and geographic summaries depend on optional transaction fields being populated accurately.
- CSV import writes in batches. If a later batch fails, earlier batches may already have been inserted; review the workspace before retrying to avoid duplicates.
- AI-generated insights, external accounting/banking integrations, scheduled reports, downloadable PDF reports, and team invitations are not yet complete.
- The active application uses the configured Supabase project. A separate Neon database is not automatically connected just because one has been created; verify the deployed environment and database connection before treating Neon as the application database.
- The dashboard should undergo end-to-end testing, independent RLS/data-isolation tests, accessibility checks, and load testing before production use.

## Stack

- Next.js 15, React 19, TypeScript
- Supabase Auth, Postgres, and Row Level Security
- Recharts and Lucide icons
- Vercel deployment

## Local development

Requirements: Node.js 20 or newer.

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local`.
3. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the intended Supabase project.
4. Start the development server: `npm run dev`
5. Run the TypeScript check: `npm run lint`
6. Create a production build: `npm run build`

Never commit `.env.local`, service-role keys, database passwords, or other secrets.

## Database

SQL migrations are under `supabase/migrations/`. Review and apply migrations only to the intended project. The company onboarding migration adds company profile fields and updates the workspace-creation RPC. Confirm that the deployed project has all required migrations before using optional fields.

The application must use the public/anon key from the browser; privileged database operations must never rely on a service-role key in client code. RLS must remain enabled for every tenant-owned table. Re-test cross-workspace access after every policy or schema change.

## Recommended production gates

1. Add automated tests for date ranges, totals, currency filtering, CSV validation, and failed/partial imports.
2. Replace the 1,000-row client limit with pagination and server-side aggregate queries.
3. Verify tenant isolation and role permissions using separate test users and workspaces.
4. Make CSV import atomic or provide a reliable rollback/deduplication strategy.
5. Add report exports, backups, retention/deletion controls, monitoring, and rate limits.
6. Complete end-to-end, accessibility, performance, and security testing.
7. Keep deployment on preview until these checks pass; do not promote a preview to production based only on a successful build.
