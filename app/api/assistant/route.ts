import { NextRequest, NextResponse } from "next/server";
import { getNeonPool } from "@/utils/neon";
import { getAuthenticatedUser } from "@/utils/authenticated-user";

export const runtime = "nodejs";

type Row = { income: string | number; expenses: string | number; pending: string | number; income_count: number; expense_count: number; pending_count: number };
const number = (value: unknown) => Number(value ?? 0);
const money = (value: number, currency: string) => {
  try { return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(value); }
  catch { return value.toLocaleString("en-NG") + " " + currency; }
};

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Please sign in to use BusinessIQ Assistant." }, { status: 401 });

  try {
    const body = await request.json();
    const organizationId = typeof body.organization_id === "string" ? body.organization_id : "";
    const question = typeof body.question === "string" ? body.question.trim().slice(0, 600) : "";
    const period = [30, 90, 180].includes(Number(body.period)) ? Number(body.period) : 30;
    if (!organizationId || !question) return NextResponse.json({ error: "Choose a workspace and enter a question." }, { status: 400 });

    const db = getNeonPool();
    const access = await db.query(
      `select o.id, o.name, o.currency
       from bi_organizations o
       join bi_organization_members m on m.organization_id=o.id
       where o.id=$1 and m.user_id=$2 limit 1`,
      [organizationId, user.id],
    );
    if (!access.rowCount) return NextResponse.json({ error: "You do not have access to this workspace." }, { status: 403 });

    const workspace = access.rows[0];
    const currency = ["NGN","USD","GBP","EUR","GHS","KES","ZAR"].includes(workspace.currency) ? workspace.currency : "NGN";
    const totalsResult = await db.query(
      `select
        coalesce(sum(amount) filter (where kind='income' and status='recorded' and currency=$2),0) as income,
        coalesce(sum(amount) filter (where kind='expense' and status='recorded' and currency=$2),0) as expenses,
        coalesce(sum(amount) filter (where status='pending' and currency=$2),0) as pending,
        count(*) filter (where kind='income' and status='recorded' and currency=$2)::int as income_count,
        count(*) filter (where kind='expense' and status='recorded' and currency=$2)::int as expense_count,
        count(*) filter (where status='pending' and currency=$2)::int as pending_count
       from bi_transactions
       where organization_id=$1 and transaction_date >= current_date - ($3::int - 1)
         and status <> 'cancelled'`,
      [organizationId, currency, period],
    );
    const row = totalsResult.rows[0] as Row;
    const income = number(row.income), expenses = number(row.expenses), pending = number(row.pending);
    const profit = income - expenses;
    const margin = income > 0 ? profit / income * 100 : 0;
    const categoryResult = await db.query(
      `select coalesce(nullif(trim(category),''),'Uncategorized') as category, sum(amount)::numeric as amount
       from bi_transactions
       where organization_id=$1 and transaction_date >= current_date - ($3::int - 1)
         and status='recorded' and kind='expense' and currency=$2
       group by 1 order by sum(amount) desc limit 5`,
      [organizationId, currency, period],
    );
    const categories = categoryResult.rows.map((item: {category:string;amount:string|number}) => ({ category: item.category, amount: number(item.amount) }));
    const largest = categories[0];

    const q = question.toLowerCase();
    const periodLabel = period === 30 ? "last 30 days" : period === 90 ? "last 90 days" : "last 6 months";
    const fmt = (v: number) => money(v, currency);
    let answer = "";
    let recommendations: string[] = [];

    if (!income && !expenses && !pending) {
      answer = `I checked the ${workspace.name} workspace for the ${periodLabel}, and there are no matching transaction records in ${currency} yet. Add recorded income and expenses to unlock meaningful analysis. I won't invent figures or forecasts.`;
      recommendations = ["Record your sales or other income.", "Add operating costs with clear categories.", "Mark uncertain entries as pending until confirmed."];
    } else if (/expense|spend|cost|category|where.*money|highest/.test(q)) {
      answer = `Recorded expenses for the ${periodLabel} total ${fmt(expenses)} across ${row.expense_count} entries. ${largest ? `Your largest expense category is ${largest.category} at ${fmt(largest.amount)}.` : "There are no recorded expenses in this period."}`;
      recommendations = largest ? [`Review ${largest.category} for savings opportunities before cutting essential costs.`, "Compare this period with the previous period before treating a change as a trend.", "Keep expense categories consistent so reports remain useful."] : ["Record expenses with categories to see where money is going."];
    } else if (/pending|await|unpaid|not.*confirm/.test(q)) {
      answer = `You have ${row.pending_count} pending entries totalling ${fmt(pending)} in the ${periodLabel}. Pending entries are not included in your operating result. Confirm each item only when it is supported by your records.`;
      recommendations = ["Review the oldest pending entries first.", "Confirm completed transactions and leave uncertain items pending.", "Do not treat pending amounts as cash received or paid."];
    } else if (/margin|profitability|profitable|percentage/.test(q)) {
      answer = income > 0 ? `Your operating margin is ${margin.toFixed(1)}% for the ${periodLabel}. That is ${fmt(profit)} in operating result from ${fmt(income)} recorded income after ${fmt(expenses)} recorded expenses.` : `I can't calculate an operating margin because there is no recorded income for the ${periodLabel}. Recorded expenses are ${fmt(expenses)}.`;
      recommendations = ["Check whether all income and expenses for this period have been recorded.", "Review the largest expense categories for possible efficiency improvements.", "Use a longer reporting period if this period has very few entries."];
    } else if (/income|revenue|sales|earning/.test(q)) {
      answer = `Recorded income for the ${periodLabel} is ${fmt(income)} across ${row.income_count} entries. Recorded expenses are ${fmt(expenses)}, leaving an operating result of ${fmt(profit)}.`;
      recommendations = ["Review which income sources contribute most, using consistent descriptions or categories.", "Compare completed periods to identify repeatable revenue patterns.", "Keep pending income separate until payment is confirmed."];
    } else if (/forecast|predict|next month|future|projection/.test(q)) {
      answer = `I can describe recorded performance, but this workspace does not yet have a validated forecasting model. For the ${periodLabel}, recorded income is ${fmt(income)}, expenses are ${fmt(expenses)}, and operating result is ${fmt(profit)}. These figures alone are not a reliable prediction.`;
      recommendations = ["Build a consistent history of dated transactions.", "Track recurring income and fixed costs separately.", "Use at least several complete periods before relying on a forecast."];
    } else if (/risk|problem|warning|concern/.test(q)) {
      const signals = [];
      if (profit < 0) signals.push("recorded expenses exceed recorded income");
      if (pending > 0) signals.push(`${fmt(pending)} remains pending`);
      if (!income) signals.push("no recorded income is available");
      if (largest) signals.push(`${largest.category} is the largest expense category at ${fmt(largest.amount)}`);
      answer = signals.length ? `The main items worth reviewing in the ${periodLabel}: ${signals.join("; ")}.` : `I found no obvious negative operating signal in the recorded totals for the ${periodLabel}. This is not a full audit or a guarantee of financial health.`;
      recommendations = ["Review pending entries and confirm their status.", "Check unusual or unusually large transactions against source documents.", "Keep an eye on expense concentration in the largest categories."];
    } else {
      answer = `Here is the ${workspace.name} snapshot for the ${periodLabel}: recorded income ${fmt(income)}, recorded expenses ${fmt(expenses)}, operating result ${fmt(profit)}, and pending amount ${fmt(pending)}. ${income > 0 ? `Operating margin is ${margin.toFixed(1)}%.` : "Operating margin is unavailable until income is recorded."}`;
      recommendations = profit < 0
        ? ["Review costs and confirm that all income has been recorded.", "Inspect the largest expense category.", "Review pending entries without counting them as confirmed cash."]
        : ["Keep recording transactions consistently.", "Review the largest expense category for efficiency opportunities.", "Compare complete periods to identify genuine changes."];
    }

    return NextResponse.json({
      answer,
      recommendations,
      snapshot: { income, expenses, profit, pending, margin, currency, period, incomeCount: row.income_count, expenseCount: row.expense_count, pendingCount: row.pending_count, topExpense: largest ?? null },
      source: "workspace_transactions",
      disclaimer: "Insights are calculated from authorised workspace records. They are not forecasts, accounting advice or a substitute for professional financial advice.",
    });
  } catch (error) {
    console.error("BusinessIQ assistant request failed", error);
    return NextResponse.json({ error: "The assistant could not analyse this workspace right now. Please try again." }, { status: 500 });
  }
}
