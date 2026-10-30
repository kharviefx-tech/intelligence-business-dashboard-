import { NextRequest, NextResponse } from "next/server";
import { getNeonPool } from "@/utils/neon";
import { getAuthenticatedUser } from "@/utils/authenticated-user";

export const runtime = "nodejs";
export const maxDuration = 30;

const currencies = new Set(["NGN", "USD", "GBP", "EUR", "GHS", "KES", "ZAR"]);
const validDate = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + "T00:00:00Z"));

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try {
    const body = await request.json();
    const organizationId = typeof body?.organization_id === "string" ? body.organization_id : "";
    const rows = body?.rows;
    if (!organizationId || !Array.isArray(rows) || rows.length < 1 || rows.length > 500) {
      return NextResponse.json({ error: "Choose a workspace and import between 1 and 500 rows at a time." }, { status: 400 });
    }

    const normalized = [];
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index] ?? {};
      const description = typeof row.description === "string" ? row.description.trim() : "";
      const kind = row.kind;
      const amount = Number(row.amount);
      const currency = typeof row.currency === "string" ? row.currency.toUpperCase() : "NGN";
      const category = typeof row.category === "string" && row.category.trim() ? row.category.trim().slice(0, 120) : "Uncategorized";
      const status = row.status === "pending" ? "pending" : "recorded";
      if (!description || description.length > 240 || !["income", "expense"].includes(kind) ||
          !Number.isFinite(amount) || amount <= 0 || amount > 999999999999 || Math.round(amount * 100) !== amount * 100 || !currencies.has(currency) || !validDate(row.transaction_date)) {
        return NextResponse.json({ error: "Row " + (index + 2) + " has invalid data. Check Date, Description, Type, Amount and Currency." }, { status: 400 });
      }
      normalized.push({ description, kind, amount, currency, category, status, transaction_date: row.transaction_date });
    }

    const db = getNeonPool();
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const access = await client.query(
        "select role from bi_organization_members where organization_id=$1 and user_id=$2",
        [organizationId, user.id],
      );
      if (!access.rowCount || !["owner", "manager", "staff"].includes(access.rows[0].role)) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "You do not have permission to import records into this workspace." }, { status: 403 });
      }

      const allowance = await client.query("select monthly_transaction_limit from bi_profiles where id=$1", [user.id]);
      const limit = Number(allowance.rows[0]?.monthly_transaction_limit ?? 0);
      if (limit > 0) {
        const usage = await client.query(
          "select count(*)::int as used from bi_transactions where created_by=$1 and created_at >= date_trunc('month', now())",
          [user.id],
        );
        if (Number(usage.rows[0]?.used ?? 0) + normalized.length > limit) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "This import exceeds your remaining monthly transaction allowance. Reduce the file size or contact your administrator." }, { status: 429 });
        }
      }

      const insertedIds: string[] = [];
      for (const row of normalized) {
        const inserted = await client.query(
          `insert into bi_transactions(organization_id,created_by,description,kind,amount,currency,category,transaction_date,status)
           values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
          [organizationId, user.id, row.description, row.kind, row.amount, row.currency, row.category, row.transaction_date, row.status],
        );
        insertedIds.push(inserted.rows[0].id);
      }
      await client.query(
        `insert into bi_audit_logs(organization_id,actor_id,action,entity,detail)
         values($1,$2,'transactions.imported','transaction_batch',$3::jsonb)`,
        [organizationId, user.id, JSON.stringify({ count: normalized.length, transaction_ids: insertedIds, currencies: [...new Set(normalized.map((row) => row.currency))] })],
      );
      await client.query("COMMIT");
      return NextResponse.json({ imported: normalized.length });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("BusinessIQ CSV import failed", error);
    return NextResponse.json({ error: "The import could not be completed. No partial rows were saved." }, { status: 500 });
  }
}
