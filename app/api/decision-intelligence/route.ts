import { NextRequest, NextResponse } from "next/server";
import { getNeonPool } from "@/utils/neon";
import { getAuthenticatedUser } from "@/utils/authenticated-user";

export const runtime = "nodejs";

const allowedPeriods = [30, 90, 180] as const;

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const organizationId = request.nextUrl.searchParams.get("organization_id");
  const requestedPeriod = Number(request.nextUrl.searchParams.get("period") || 30);
  const period = allowedPeriods.includes(requestedPeriod as typeof allowedPeriods[number]) ? requestedPeriod : 30;
  if (!organizationId) return NextResponse.json({ error: "Workspace is required." }, { status: 400 });

  try {
    const db = getNeonPool();
    const access = await db.query(
      `select o.id,o.name,o.currency,m.role
       from bi_organizations o
       join bi_organization_members m on m.organization_id=o.id
       where o.id=$1 and m.user_id=$2 limit 1`,
      [organizationId, user.id],
    );
    if (!access.rowCount) return NextResponse.json({ error: "Workspace access denied." }, { status: 403 });

    const [transactions, membership, locations] = await Promise.all([
      db.query(
        `select kind,status,currency,category,amount::numeric as amount,transaction_date
         from bi_transactions
         where organization_id=$1 and transaction_date >= current_date - ($2::int * 2)
         order by transaction_date desc limit 10000`,
        [organizationId, period],
      ),
      db.query("select count(*)::int as total from bi_organization_members where organization_id=$1", [organizationId]),
      db.query("select count(*)::int as total from bi_business_locations where organization_id=$1", [organizationId]),
    ]);

    const rows = transactions.rows;
    const currentStart = new Date();
    currentStart.setDate(currentStart.getDate() - (period - 1));
    currentStart.setHours(0, 0, 0, 0);
    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - period);
    const currentRows = rows.filter((r:any) => new Date(r.transaction_date) >= currentStart && r.status === "recorded");
    const previousRows = rows.filter((r:any) => {
      const date = new Date(r.transaction_date);
      return date >= previousStart && date < currentStart && r.status === "recorded";
    });
    const currencies = [...new Set(currentRows.map((r:any) => r.currency))] as string[];
    const currencySummaries = currencies.map(currency => {
      const now = currentRows.filter((r:any) => r.currency === currency);
      const before = previousRows.filter((r:any) => r.currency === currency);
      const sum = (list:any[], kind:string) => list.filter(r=>r.kind===kind).reduce((total:number,r:any)=>total+Number(r.amount),0);
      const income=sum(now,"income"), expenses=sum(now,"expense");
      const priorIncome=sum(before,"income"), priorExpenses=sum(before,"expense");
      const change=(value:number, prior:number) => prior===0 ? null : ((value-prior)/Math.abs(prior))*100;
      return {
        currency,
        income,
        expenses,
        operating_result: income-expenses,
        operating_margin: income>0 ? ((income-expenses)/income)*100 : null,
        income_change_percent: change(income,priorIncome),
        expense_change_percent: change(expenses,priorExpenses),
        prior_period_income: priorIncome,
        prior_period_expenses: priorExpenses,
        recorded_transactions: now.length,
      };
    });

    const pending = rows.filter((r:any)=>r.status==="pending");
    const categories = new Map<string,{currency:string;amount:number;count:number}>();
    currentRows.filter((r:any)=>r.kind==="expense").forEach((r:any)=>{
      const key = r.currency + "::" + (r.category || "Uncategorised");
      const item = categories.get(key) || {currency:r.currency,amount:0,count:0};
      item.amount += Number(r.amount); item.count += 1; categories.set(key,item);
    });
    const expenseDrivers = [...categories.entries()].map(([key,value])=>({
      category:key.split("::").slice(1).join("::"),...value
    })).sort((a,b)=>b.amount-a.amount).slice(0,10);

    const locationCount = Number(locations.rows[0]?.total || 0);
    const memberCount = Number(membership.rows[0]?.total || 0);
    const recordedCount = currentRows.length;
    const hasFinancialData = recordedCount > 0;
    const salesCustomerReady = false;
    const operationsReady = locationCount > 0 || memberCount > 1;
    const modules = [
      { id:"executive", name:"Executive intelligence", status:hasFinancialData?"available":"needs_data", source:"Recorded workspace transactions", description:"Executive income, expenses, operating result and period-over-period movement, kept separate by currency." },
      { id:"financial", name:"Financial intelligence", status:hasFinancialData?"partial":"needs_data", source:"Recorded and pending transactions", description:"Income, expense, operating result, margin, pending items and expense concentration. Cash balances, receivables, payables and budgets are not yet captured." },
      { id:"performance", name:"Sales & customer intelligence", status:"needs_data", source:"No sales, product, customer or CRM records connected", description:"Customer acquisition, retention, lifetime value, product performance and sales conversion require dedicated sales/customer data sources." },
      { id:"operations", name:"Operational intelligence", status:operationsReady?"partial":"needs_data", source:"Workspace membership and manually recorded business locations", description:"Team and footprint coverage are visible. Department KPIs, inventory, delivery, service levels and workforce productivity are not yet captured." },
      { id:"predictive", name:"Predictive analytics", status:"readiness", source:"Historical transaction coverage", description:"Forecasting and anomaly models are not activated. BusinessIQ will not label a run-rate or rule-based alert as a prediction." },
      { id:"drilldown", name:"Drill-down analytics", status:hasFinancialData?"available":"needs_data", source:"Transaction ledger and expense categories", description:"Financial totals can be traced to recorded transaction rows and expense categories; customer, product and department drill-downs await those data sources." },
      { id:"enterprise", name:"Enterprise controls & integrations", status:"partial", source:"Workspace membership, role checks, audit trail and connector configuration", description:"Workspace-isolated access and multi-workspace comparison are available. Live third-party syncs and automated scheduled reporting require connector setup." },
      { id:"ai", name:"AI decision support", status:hasFinancialData?"available":"needs_data", source:"Authorised workspace transaction context", description:"BusinessIQ Assistant answers from permission-scoped workspace records and states the limits of available data." },
    ];

    return NextResponse.json({
      generated_at: new Date().toISOString(),
      workspace: { id: access.rows[0].id, name: access.rows[0].name, base_currency: access.rows[0].currency },
      period_days: period,
      executive: {
        currencies: currencySummaries,
        pending_transaction_count: pending.length,
        pending_by_currency: [...new Set(pending.map((r:any)=>r.currency))].map(currency=>({
          currency,
          amount:pending.filter((r:any)=>r.currency===currency).reduce((s:number,r:any)=>s+Number(r.amount),0),
          count:pending.filter((r:any)=>r.currency===currency).length,
        })),
        recorded_transaction_count: recordedCount,
      },
      financial: { currency_summaries: currencySummaries, expense_drivers: expenseDrivers, currencies_kept_separate: true, fx_conversion_applied: false },
      operational: { workspace_members: memberCount, recorded_locations: locationCount },
      predictive: { enabled: false, reason: "A reliable forecasting layer requires sufficiently complete historical periods and validated source coverage.", available_history_days: period * 2 },
      drilldown: { available_dimensions: ["transaction_date","transaction_type","currency","category","status"], unavailable_dimensions: ["customer","product","department","sales_channel"] },
      enterprise: { multi_workspace_access: true, workspace_member_count: memberCount, audit_logging: true, live_external_sync: false, scheduled_reporting: false },
      ai: { assistant_available: true, grounded_in_authorised_workspace_data: true, external_company_data_used: false },
      modules,
      data_quality: {
        source: "BusinessIQ workspace records",
        currencies_reported_separately: true,
        currency_conversion_applied: false,
        pending_excluded_from_operating_result: true,
        cancelled_excluded: true,
        generated_at: new Date().toISOString(),
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("BusinessIQ decision intelligence failed", error);
    return NextResponse.json({ error: "Unable to generate decision intelligence for this workspace." }, { status: 500 });
  }
}
