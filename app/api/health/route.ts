import { NextResponse } from "next/server";
import { getNeonPool } from "@/utils/neon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requiredTables = [
  "bi_profiles",
  "bi_organizations",
  "bi_organization_members",
  "bi_transactions",
  "bi_subscriptions",
  "bi_payment_attempts",
  "bi_data_sources",
  "bi_audit_logs",
  "bi_api_credentials",
];

export async function GET() {
  const checks: Record<string, "ok" | "error" | "not_configured"> = {
    application: "ok",
    database: "error",
    schema: "error",
    supabase_auth: process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "ok" : "not_configured",
    paystack: process.env.PAYSTACK_SECRET_KEY ? "ok" : "not_configured",
    microsoft_oauth: process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET ? "ok" : "not_configured",
  };

  try {
    const db = getNeonPool();
    await db.query("select 1");
    checks.database = "ok";
    const result = await db.query(
      "select table_name from information_schema.tables where table_schema='public' and table_name = any($1::text[])",
      [requiredTables],
    );
    const found = new Set(result.rows.map((row: { table_name: string }) => row.table_name));
    checks.schema = requiredTables.every((table) => found.has(table)) ? "ok" : "error";
  } catch {
    checks.database = "error";
  }

  const healthy = checks.application === "ok" && checks.database === "ok" && checks.schema === "ok";
  return NextResponse.json(
    { service: "BusinessIQ", status: healthy ? "operational" : "degraded", checked_at: new Date().toISOString(), checks },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
