# Business Intelligence Dashboard — starter

A responsive Next.js frontend prototype for a business intelligence workspace. The working UI label **BusinessIQ** is temporary; the final product/company name has not been decided.

## Included
- Responsive dashboard layout and navigation
- Illustrative revenue, expense, profit, invoice and transaction sample data
- Revenue/expense chart
- Client-side search over the sample transactions
- CSV export of the displayed sample transactions
- Initial styling for desktop, tablet and mobile
- Example environment file for a future Supabase connection

## Important scope and data notice
This is a **frontend prototype only**. It does not yet include user authentication, a connected database, company workspaces, real transaction ingestion, AI analysis, durable reports, or production-grade permissions. The figures shown are fabricated demo examples and must not be treated as real financial results. Do not enter confidential business records into this prototype.

## Run locally
Requirements: Node.js 20 or newer.

1. Install dependencies: `npm install`
2. Start development: `npm run dev`
3. Open `http://localhost:3000`

## Next implementation milestones
1. Add Supabase Auth and a verified account onboarding flow.
2. Design tenant-aware database tables and enforce Row Level Security (RLS) for every company-owned record.
3. Add server-side validation, role-based access and audit logs before accepting real data.
4. Implement manual transaction entry and validated CSV imports with clear currency and date handling.
5. Add calculations and reports that can be traced back to source records.
6. Add AI assistance only after it can access authorised records, cite underlying data and label estimates/forecasts separately from actuals.
7. Add backup, export, deletion, privacy and security review before a public production launch.

## Security principles
- Never commit secrets or service-role keys.
- Keep all database access protected by server-side authorization and Supabase RLS.
- A public/anonymous key is not a substitute for correct RLS policies.
- Do not advertise share purchases or accept investments until company structure, disclosures and applicable securities rules have been reviewed by qualified counsel.

## Deployment
This project is designed for a Next.js-capable host such as Vercel. GitHub Pages alone cannot host the server-side features planned for the full product. The app is not production-ready until the backend, security controls, tests and deployment configuration are implemented and reviewed.
