# BusinessIQ — Setup and Release Checklist

Last reviewed: 2026-10-29

This checklist records the known setup state. A successful build is not the same as a fully configured, production-ready financial application.

## Verified now

- [x] Next.js application builds successfully on the staging target.
- [x] Latest verified staging commit: `920392d581e267192ab70cf5baf79c0b55d4b53e`.
- [x] Vercel staging URL: https://intelligence-business-dashboard-75nckv85h-thinksociety.vercel.app
- [x] Vercel has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` configured for Preview, Production, and Development.
- [x] Supabase project `dprulohylwgzmetgrywj` contains the BusinessIQ core, tenant security, profile, sales dimensions, geographic analytics, and company onboarding migrations.
- [x] Transaction loading uses deterministic pagination, and the CSV export/template newline syntax build failure is fixed.
- [x] AI analysis route exists at `POST /api/ai-analysis`; it verifies the signed-in user and workspace membership before preparing a bounded transaction summary.

## Required before AI analysis can run

- [ ] In Vercel → Project → Settings → Environment Variables, add `AI_GATEWAY_API_KEY` for **Preview** first. Use the Vercel AI Gateway key generated from your own Vercel account. Do not paste it into source code, GitHub, or chat.
- [ ] Optional: set `BUSINESSIQ_AI_MODEL` only if you want to override the default model `openai/gpt-4o-mini`.
- [ ] Redeploy the Preview environment after adding the key.
- [ ] Test AI analysis with a non-sensitive test workspace, then test missing-key, invalid-key, expired-session, and unauthorized-workspace responses.
- [ ] Add the AI key to Production only after staging tests pass and production use is explicitly approved.

Without `AI_GATEWAY_API_KEY`, the AI endpoint intentionally returns a clear setup error and does not send business data to an AI provider. Rule-based dashboard signals are separate and must not be labelled as AI.

## Database and security release gates

- [ ] Confirm all BusinessIQ migrations in `supabase/migrations/` are applied to the intended Supabase project before any production release.
- [ ] Test two separate users in separate workspaces; verify neither user can read, update, export, or analyse the other's records.
- [ ] Review RLS policies and grants for every `bi_*` tenant table; keep RLS enabled.
- [ ] Confirm profile/workspace onboarding, avatar storage policies, password reset, sign-out, and session expiry.
- [ ] Enable Supabase leaked-password protection if supported by the selected Auth plan.
- [ ] Verify backups and restore procedures before storing important business records.
- [ ] Add rate limits and request-size limits to AI and CSV endpoints; review provider spend controls.
- [ ] Test duplicate and partial CSV imports. Do not re-upload a file after a partial failure without checking which rows were inserted.
- [ ] Test large datasets, date boundaries, currency filtering, pending/cancelled statuses, and empty workspaces.
- [ ] Complete keyboard/accessibility, mobile layout, performance, and end-to-end testing.

## Database provider note

The application currently uses Supabase project `dprulohylwgzmetgrywj`. Creating a Neon database separately does not connect it to this application. Do not switch database providers or change production connection strings unless a migration plan, schema parity, data migration, and rollback have been tested.

## Vercel release process

1. Keep interface and code changes on the redesign branch and deploy to staging/Preview.
2. Verify build status is **Ready** and inspect build/runtime logs.
3. Smoke-test sign-in, onboarding, overview, transaction creation/editing, CSV import/export, sales/geographic analytics, profile/settings, and AI setup errors.
4. Test tenant isolation and database policies.
5. Only promote after these gates pass. Never promote solely because the build is green.

## Current known limitations

- AI analysis is code-complete at the route level but depends on the missing Vercel AI Gateway key and has not yet been end-to-end verified.
- Neon is not the active application database.
- External bank/accounting connections, automated scheduled reports, and full accounting workflows are not represented as complete.
- Metrics are operational summaries, not audited financial statements or tax advice.
