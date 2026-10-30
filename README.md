# BusinessIQ — Global Company & Product Charter

BusinessIQ is an independent global business intelligence company and software platform. It is not a Microsoft add-on, a single-company dashboard, or a collection of AI-generated descriptions. Its purpose is to help organisations connect their authorised business data, understand performance, detect risks and make better decisions through one governed intelligence workspace.

**Company principle:** BusinessIQ stands on its own. Other platforms are optional data and workflow connections. No competitor is foundational to BusinessIQ's identity or operation.

## Product promise

Turn an organisation's real operational and financial records into understandable, traceable business intelligence. Every metric must identify its source, reporting period, currency and calculation. Actuals, estimates, forecasts and recommendations must never be presented as the same thing.

## Global product architecture

| Product layer | Responsibility | Current position |
| --- | --- | --- |
| BusinessIQ Core | Identity, organisations, workspaces, roles, settings and tenant boundaries | Foundation implemented; security review and expanded controls remain |
| BusinessIQ Connect | Imports, APIs and authorised third-party data connections | CSV import and Microsoft identity/connection foundations exist; most live connectors remain |
| BusinessIQ Data | Validation, normalisation, currency handling, lineage and governed storage | Transaction foundations exist; broader data model and lineage remain |
| BusinessIQ Analytics | KPIs, trends, financial and operational reporting | Native workspace dashboard and CSV exports exist; deeper analytics remain |
| BusinessIQ Intelligence | Evidence-based observations, anomalies and business explanations | Rule-based 90-day observations exist; richer diagnostic coverage remains |
| BusinessIQ AI | Conversational analysis grounded in permitted workspace data | Assistant foundation exists; citations, evaluation, safety and deeper data coverage remain |
| BusinessIQ Finance | Income, expenses, cash flow, budgets, reconciliation and financial reporting | Transactions and Paystack subscription foundation exist; full finance suite remains |
| BusinessIQ Decisions | Scenarios, priorities, recommendations and decision tracking | Not yet a complete product |
| BusinessIQ Enterprise | SSO, advanced governance, audit, compliance, retention and service controls | Early role/audit foundations; enterprise controls remain |
| BusinessIQ Network | Approved cross-company collaboration, benchmarking and partner ecosystem | Not yet implemented; opt-in and strict tenant separation required |

## Current implemented foundations

- Authenticated BusinessIQ workspace experience.
- Organisation/workspace creation and switching foundations.
- Workspace-scoped transaction records and dashboard calculations.
- Manual transaction entry and validated CSV import workflow.
- Transaction CSV export and reporting period controls.
- Workspace profile management.
- Team invitations and role-based workspace access foundations.
- Developer API credentials and read-only transaction API foundations.
- Rule-based intelligence observations that disclose limitations.
- BusinessIQ assistant foundation.
- Paystack checkout, verification and webhook foundations.
- Microsoft identity and connector foundations.

Implementation status is not a claim that every feature is fully production-ready. External connectors are only live when an authenticated connection, permission grant, sync process and working data path have been implemented and tested.

## Global operating principles

1. **Tenant isolation:** each organisation's data is private to that organisation; no cross-company access without explicit, revocable authorisation.
2. **Least privilege:** role-based access, scoped API credentials, revocation and audit trails.
3. **Data truth:** never fabricate customers, revenue, integrations, forecasts, benchmarks or AI findings.
4. **Traceability:** show the source records and calculation behind material insights.
5. **Currency integrity:** never add different currencies together without a disclosed conversion source, rate and timestamp.
6. **Customer control:** consent, export, retention and deletion controls must be clear.
7. **Resilience:** backups, recovery tests, monitoring and incident response are required before enterprise claims.
8. **Global readiness:** design for multiple countries, time zones, currencies, languages, tax regimes and regional privacy requirements.
9. **Accessible product design:** working application screens and task-focused workflows take priority over brochure-like text.
10. **Honest release status:** distinguish available, beta, planned and unavailable capabilities in the interface.

## Next build programme

### Phase 1 — Trustworthy operating core
- Complete security review of every API and tenant boundary.
- Add automated tests for cross-tenant access, role permissions, payment verification and data validation.
- Add durable audit history, data export and account/workspace deletion workflows.
- Add backup and restore procedures, monitoring and error reporting.
- Verify subscription entitlements server-side and complete Paystack lifecycle handling.

### Phase 2 — Real data connectivity
- Improve CSV mapping, duplicate detection, import preview, rollback and scheduled re-import.
- Add secure Excel workbook ingestion.
- Build a connector framework with OAuth consent, scoped tokens, sync status, retries and disconnect/revoke controls.
- Prioritise customer-demanded sources such as accounting, payments, ecommerce, CRM and databases.
- Add public API documentation, webhooks, key rotation and usage limits.

### Phase 3 — Decision-grade intelligence
- Add source-linked metric definitions and reproducible calculations.
- Add cash-flow, margin, customer, product, inventory and operational analysis where the source data supports it.
- Add anomaly detection with explainable evidence and false-positive controls.
- Add forecasting only after sufficient historical data and backtesting exist.
- Add scenarios and decision tracking; label assumptions and uncertainty.

### Phase 4 — Global and enterprise readiness
- Multi-currency conversion with documented rate provider, timestamp and methodology.
- Regional date, time, number and language support.
- SSO/MFA options, granular permissions, audit exports and organisation policies.
- Privacy, retention, data-processing agreements and regional compliance reviews.
- Service monitoring, incident response, recovery objectives and support processes.

### Phase 5 — Commercial and ecosystem growth
- Validate pricing and usage limits with real pilot customers.
- Add invoices, receipts, failed-payment recovery, cancellation and plan-change handling.
- Launch an integration directory only for verified, working integrations.
- Introduce opt-in partner collaboration and aggregated benchmarks only with privacy safeguards and minimum cohort thresholds.
- Measure activation, retention, time-to-insight and customer business outcomes.

## What is required to complete the programme

- Product decisions: initial ideal customer profile, highest-value business problems, supported industries and pilot success criteria.
- Technical operations: production database access, secure environment configuration, test/staging environment, observability and backup ownership.
- Integrations: developer/OAuth credentials and approved scopes for each provider; no credentials should be committed to source control.
- Payments: live Paystack credentials and webhook configuration, plus tested plan/entitlement rules.
- Business operations: company registration and professional legal/accounting advice as appropriate, customer contracts, privacy notice, terms, support and incident procedures.
- Validation: pilot organisations willing to connect real, authorised data and verify whether BusinessIQ improves decisions.

## Architecture and data stack

The current application is built with Next.js, TypeScript, Supabase Auth helpers and a Neon-backed application data layer, with Paystack billing foundations and Vercel deployment. Keep the existing production data and authentication architecture intact unless a reviewed migration plan explicitly authorises a change. Never place secrets in GitHub or client-side code.

## Local development

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Set required environment variables using the deployment environment or a local `.env.local` file. Never commit secret values. Use `npm run lint` and `npm run build` before release.

## Release standard

A feature is not complete merely because a card or page exists. It is complete when its user flow works end-to-end, server-side permissions are enforced, errors and empty states are handled, data is persisted correctly, tests cover critical paths, and its actual release status is communicated accurately.
