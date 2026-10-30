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
    const access = await db.query("select 1 from bi_organization_members where organization_id=$1 and user_id=$2", [organizationId, user.id]);
    if (!access.rowCount) return NextResponse.json({ error: "You do not have access to this workspace." }, { status: 403 });
    const result = await db.query(
      `select id,organization_id,transaction_date,description,kind,amount,currency,category,status
       from bi_transactions where organization_id=$1 order by transaction_date desc,created_at desc limit 1000`,
      [organizationId],
    );
    return NextResponse.json({ transactions: result.rows });
  } catch (error) {
    console.error("BusinessIQ transaction read failed", error);
    return NextResponse.json({ error: "Unable to load transactions." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try {
    const body = await request.json();
    const { organization_id, description, kind, amount, currency, category, transaction_date, status } = body ?? {};
    const cleanDescription = typeof description === "string" ? description.trim() : "";
    const numericAmount = Number(amount);
    const validDate = typeof transaction_date === "string"
      && /^\d{4}-\d{2}-\d{2}$/.test(transaction_date)
      && !Number.isNaN(Date.parse(transaction_date + "T00:00:00.000Z"))
      && new Date(transaction_date + "T00:00:00.000Z").toISOString().slice(0, 10) === transaction_date;

    if (typeof organization_id !== "string" || !organization_id
      || cleanDescription.length < 1 || cleanDescription.length > 240
      || !["income", "expense"].includes(kind)
      || !Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 999999999999
      || Math.round(numericAmount * 100) !== numericAmount * 100
      || !["NGN", "USD", "GBP", "EUR", "GHS", "KES", "ZAR"].includes(currency)
      || !validDate
      || !["recorded", "pending"].includes(status)) {
      return NextResponse.json({ error: "Please check the transaction details. Amounts must be positive with no more than two decimal places, and the date must be valid." }, { status: 400 });
    }

    const db = getNeonPool();
    const client = await db.connect();
    try {
      await client.query("begin");
      const access = await client.query(
        "select role from bi_organization_members where organization_id=$1 and user_id=$2",
        [organization_id, user.id],
      );
      if (!access.rowCount || !["owner", "manager", "staff"].includes(access.rows[0].role)) {
        await client.query("rollback");
        return NextResponse.json({ error: "You do not have permission to add transactions." }, { status: 403 });
      }

      const allowance = await client.query("select monthly_transaction_limit from bi_profiles where id=$1", [user.id]);
      const limit = Number(allowance.rows[0]?.monthly_transaction_limit ?? 0);
      if (limit > 0) {
        const usage = await client.query(
          "select count(*)::int as used from bi_transactions where created_by=$1 and created_at >= date_trunc('month', now())",
          [user.id],
        );
        if (Number(usage.rows[0]?.used ?? 0) >= limit) {
          await client.query("rollback");
          return NextResponse.json({ error: "You have reached your monthly transaction allowance. Contact your administrator to increase it." }, { status: 429 });
        }
      }

      const result = await client.query(
        `insert into bi_transactions(organization_id,created_by,description,kind,amount,currency,category,transaction_date,status)
         values($1,$2,$3,$4,$5,$6,$7,$8,$9)
         returning id,organization_id,transaction_date,description,kind,amount,currency,category,status`,
        [organization_id, user.id, cleanDescription, kind, numericAmount, currency,
          typeof category === "string" && category.trim() ? category.trim().slice(0, 120) : "Uncategorized",
          transaction_date, status],
      );
      await client.query(
        `insert into bi_audit_logs(organization_id,actor_id,action,entity,detail)
         values($1,$2,'transaction.created','transaction',$3::jsonb)`,
        [organization_id, user.id, JSON.stringify({
          transaction_id: result.rows[0].id,
          kind,
          amount: numericAmount,
          currency,
          status,
          transaction_date,
        })],
      );
      await client.query("commit");
      return NextResponse.json({ transaction: result.rows[0] }, { status: 201 });
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("BusinessIQ transaction write failed", error);
    return NextResponse.json({ error: "Unable to save the transaction." }, { status: 500 });
  }
}
