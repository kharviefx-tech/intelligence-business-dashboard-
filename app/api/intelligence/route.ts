import { NextRequest, NextResponse } from "next/server";
import { getNeonPool } from "@/utils/neon";
import { getAuthenticatedUser } from "@/utils/authenticated-user";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const organizationId = request.nextUrl.searchParams.get("organization_id");
  if (!organizationId) return NextResponse.json({ error: "Workspace is required." }, { status: 400 });
  try {
    const db = getNeonPool();
    const access = await db.query("select 1 from bi_organization_members where organization_id=$1 and user_id=$2", [organizationId,user.id]);
    if (!access.rowCount) return NextResponse.json({ error: "Workspace access denied." }, { status: 403 });
    const result = await db.query(
      `select kind,status,currency,category,amount::numeric as amount,transaction_date
       from bi_transactions where organization_id=$1 and transaction_date >= current_date - interval '90 days'
       order by transaction_date desc limit 5000`, [organizationId]
    );
    const rows = result.rows;
    const recorded = rows.filter((r:any)=>r.status==="recorded");
    const currencies = [...new Set(recorded.map((r:any)=>r.currency))];
    const insights: {type:string;title:string;summary:string;severity:"info"|"watch"|"critical"|"opportunity";evidence:Record<string,unknown>}[] = [];
    if (!recorded.length) {
      insights.push({type:"data_readiness",title:"Connect your business activity",summary:"BusinessIQ is ready to analyse this workspace, but there are not enough recorded transactions yet. Import a CSV or add transactions to establish a reliable baseline.",severity:"info",evidence:{records:0}});
    } else {
      if (currencies.length > 1) insights.push({type:"currency_integrity",title:"Multiple currencies detected",summary:"This workspace contains more than one currency. Review reporting currency and avoid combining amounts until exchange-rate conversion is configured.",severity:"watch",evidence:{currencies}});
      for (const currency of currencies) {
        const subset=recorded.filter((r:any)=>r.currency===currency);
        const income=subset.filter((r:any)=>r.kind==="income").reduce((s:number,r:any)=>s+Number(r.amount),0);
        const expenses=subset.filter((r:any)=>r.kind==="expense").reduce((s:number,r:any)=>s+Number(r.amount),0);
        const margin=income>0?(income-expenses)/income*100:null;
        if (income>0) insights.push({type:"profitability",title:margin!==null&&margin<0?"Expenses exceed income": "Operating margin",summary:margin===null?"There is not enough income data to calculate margin.":`Recorded operating margin over the last 90 days is ${margin.toFixed(1)}% in ${currency}. This is a historical calculation, not a forecast.`,severity:margin!==null&&margin<0?"critical":margin!==null&&margin<10?"watch":"info",evidence:{currency,income,expenses,net:income-expenses,margin}});
        const pending=rows.filter((r:any)=>r.status==="pending"&&r.currency===currency).reduce((s:number,r:any)=>s+Number(r.amount),0);
        if(pending>0) insights.push({type:"cash_attention",title:"Pending items need review",summary:`There are pending entries totalling ${pending.toLocaleString("en-NG")} ${currency}. Confirm their status before relying on final reporting.`,severity:"watch",evidence:{currency,pending}});
      }
      const categories=new Map<string,number>();
      recorded.filter((r:any)=>r.kind==="expense").forEach((r:any)=>categories.set(r.category||"Uncategorised",(categories.get(r.category||"Uncategorised")||0)+Number(r.amount)));
      const top=[...categories.entries()].sort((a,b)=>b[1]-a[1])[0];
      if(top) insights.push({type:"cost_concentration",title:"Largest expense category",summary:`${top[0]} is the largest recorded expense category in the 90-day dataset. Review the underlying transactions before making cost decisions.`,severity:"info",evidence:{category:top[0],amount:top[1]}});
      const recent=recorded.filter((r:any)=>new Date(r.transaction_date).getTime()>=Date.now()-30*86400000);
      if(recent.length===0) insights.push({type:"activity",title:"No recent recorded activity",summary:"No recorded transactions were found in the last 30 days. Import recent records to keep the dashboard current.",severity:"watch",evidence:{last30Days:0}});
    }
    return NextResponse.json({ generated_at:new Date().toISOString(), window_days:90, record_count:recorded.length, insights, limitations:["Insights are rule-based observations from the records available in this workspace.","Amounts are not combined across currencies.","No predictive model or external data source is used in this report."] });
  } catch (error) {
    console.error("BusinessIQ intelligence analysis failed", error);
    return NextResponse.json({ error: "Unable to analyse this workspace right now." }, { status: 500 });
  }
}
