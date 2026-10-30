import { NextRequest, NextResponse } from "next/server";
import { getNeonPool } from "@/utils/neon";
import { getAuthenticatedUser } from "@/utils/authenticated-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const organizationId = request.nextUrl.searchParams.get("organization_id") || "";
  const daysValue = Number(request.nextUrl.searchParams.get("days") || 90);
  const days = [30, 90, 180, 365].includes(daysValue) ? daysValue : 90;
  if (!organizationId) return NextResponse.json({ error: "Choose a workspace." }, { status: 400 });

  try {
    const db = getNeonPool();
    const membership = await db.query(
      "select o.id,o.name,o.currency,m.role from bi_organizations o join bi_organization_members m on m.organization_id=o.id where o.id=$1 and m.user_id=$2 limit 1",
      [organizationId, user.id],
    );
    if (!membership.rowCount) return NextResponse.json({ error: "Workspace access denied." }, { status: 403 });

    const [monthly, categories, statuses, currencyRows] = await Promise.all([
      db.query(
        `select to_char(date_trunc('month', transaction_date), 'YYYY-MM') as month,
                currency,
                coalesce(sum(amount) filter (where kind='income' and status='recorded'),0)::numeric as income,
                coalesce(sum(amount) filter (where kind='expense' and status='recorded'),0)::numeric as expenses,
                coalesce(sum(amount) filter (where status='pending'),0)::numeric as pending,
                count(*)::int as transaction_count
         from bi_transactions
         where organization_id=$1 and transaction_date >= current_date - ($2::int - 1)
         group by 1,2 order by 1,2`,
        [organizationId, days],
      ),
      db.query(
        `select currency, coalesce(nullif(trim(category),''),'Uncategorized') as category,
                sum(amount)::numeric as amount, count(*)::int as transaction_count
         from bi_transactions
         where organization_id=$1 and transaction_date >= current_date - ($2::int - 1)
           and kind='expense' and status='recorded'
         group by 1,2 order by 1,3 desc limit 50`,
        [organizationId, days],
      ),
      db.query(
        `select status, currency, count(*)::int as transaction_count,
                coalesce(sum(amount),0)::numeric as amount
         from bi_transactions
         where organization_id=$1 and transaction_date >= current_date - ($2::int - 1)
         group by 1,2 order by 1,2`,
        [organizationId, days],
      ),
      db.query(
        `select currency,
                coalesce(sum(amount) filter (where kind='income' and status='recorded'),0)::numeric as income,
                coalesce(sum(amount) filter (where kind='expense' and status='recorded'),0)::numeric as expenses,
                coalesce(sum(amount) filter (where status='pending'),0)::numeric as pending,
                count(*)::int as transaction_count
         from bi_transactions
         where organization_id=$1 and transaction_date >= current_date - ($2::int - 1)
         group by currency order by currency`,
        [organizationId, days],
      ),
    ]);

    const summaries = currencyRows.rows.map((row: any) => ({
      currency: row.currency,
      income: Number(row.income),
      expenses: Number(row.expenses),
      operating_result: Number(row.income) - Number(row.expenses),
      pending: Number(row.pending),
      transaction_count: Number(row.transaction_count),
    }));

    return NextResponse.json({
      workspace: { id: membership.rows[0].id, name: membership.rows[0].name, base_currency: membership.rows[0].currency },
      period: { days, from: new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) },
      summaries,
      monthly: monthly.rows.map((row: any) => ({ ...row, income: Number(row.income), expenses: Number(row.expenses), pending: Number(row.pending), operating_result: Number(row.income) - Number(row.expenses) })),
      expense_categories: categories.rows.map((row: any) => ({ ...row, amount: Number(row.amount) })),
      transaction_status: statuses.rows.map((row: any) => ({ ...row, amount: Number(row.amount) })),
      data_quality: {
        source: "bi_transactions",
        currencies_reported_separately: true,
        currency_conversion_applied: false,
        generated_at: new Date().toISOString(),
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("BusinessIQ report generation failed", error);
    return NextResponse.json({ error: "Unable to generate this workspace report." }, { status: 500 });
  }
}
