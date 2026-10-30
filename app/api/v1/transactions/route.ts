import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getNeonPool } from "@/utils/neon";

export const runtime = "nodejs";
const RATE_LIMIT_PER_MINUTE = 120;

export async function GET(req: NextRequest) {
  const authorization = req.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(bi_live_[A-Za-z0-9_-]{30,})$/);
  if (!match) {
    return NextResponse.json({ error: "A valid BusinessIQ API bearer key is required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const rawLimit = req.nextUrl.searchParams.get("limit");
  const parsedLimit = rawLimit === null ? 100 : Number(rawLimit);
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
    return NextResponse.json({ error: "The limit parameter must be a positive whole number." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const requested = Math.min(parsedLimit, 500);
  const hash = createHash("sha256").update(match[1]).digest("hex");

  try {
    const db = getNeonPool();
    const key = await db.query(
      `select id, organization_id, scopes
       from bi_api_credentials
       where secret_hash = $1 and revoked_at is null
         and (expires_at is null or expires_at > now())
       limit 1`,
      [hash],
    );
    if (!key.rowCount) {
      return NextResponse.json({ error: "API key is invalid, expired or revoked." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const credential = key.rows[0];
    const scopes: string[] = Array.isArray(credential.scopes) ? credential.scopes : [];
    if (!scopes.includes("transactions:read")) {
      return NextResponse.json({ error: "This API key does not have permission to read transactions." }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }

    // A database-backed fixed-window limit applies consistently across serverless instances.
    const usage = await db.query(
      `insert into bi_api_rate_limits (credential_id, window_started_at, request_count, updated_at)
       values ($1::text, date_trunc('minute', now()), 1, now())
       on conflict (credential_id) do update
       set request_count = case
             when bi_api_rate_limits.window_started_at = date_trunc('minute', now())
               then bi_api_rate_limits.request_count + 1
             else 1
           end,
           window_started_at = date_trunc('minute', now()),
           updated_at = now()
       returning request_count`,
      [String(credential.id)],
    );
    if (Number(usage.rows[0]?.request_count ?? 0) > RATE_LIMIT_PER_MINUTE) {
      return NextResponse.json(
        { error: "API rate limit exceeded. Retry in the next minute.", limit: RATE_LIMIT_PER_MINUTE, window: "1 minute" },
        { status: 429, headers: { "Retry-After": "60", "X-RateLimit-Limit": String(RATE_LIMIT_PER_MINUTE), "Cache-Control": "no-store" } },
      );
    }

    const result = await db.query(
      `select id, transaction_date, description, kind, amount, currency, category, status, created_at
       from bi_transactions
       where organization_id = $1
       order by transaction_date desc, created_at desc
       limit $2`,
      [credential.organization_id, requested],
    );
    await db.query("update bi_api_credentials set last_used_at = now() where id = $1", [credential.id]);

    return NextResponse.json(
      { data: result.rows, meta: { count: result.rowCount, limit: requested, workspace_id: credential.organization_id, served_at: new Date().toISOString() } },
      { headers: { "X-RateLimit-Limit": String(RATE_LIMIT_PER_MINUTE), "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("BusinessIQ public API read failed", error);
    return NextResponse.json({ error: "BusinessIQ API request failed." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
