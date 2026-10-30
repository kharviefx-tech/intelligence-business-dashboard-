import { NextRequest, NextResponse } from "next/server";
import { getNeonPool } from "@/utils/neon";
import { getAuthenticatedUser } from "@/utils/authenticated-user";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try {
    const db = getNeonPool();
    await db.query(
      `insert into bi_profiles(id, full_name) values ($1, $2)
       on conflict (id) do update set full_name = coalesce(nullif(bi_profiles.full_name,''), excluded.full_name)`,
      [user.id, user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? null],
    );

    const [profile, workspaces] = await Promise.all([
      db.query("select id,full_name,platform_role,monthly_transaction_limit,avatar_url,phone,job_title,bio,company_name,company_website,timezone,preferred_organization_id from bi_profiles where id=$1", [user.id]),
      db.query(
        `select o.id,o.name,o.currency,o.plan,m.role
         from bi_organization_members m join bi_organizations o on o.id=m.organization_id
         where m.user_id=$1 order by o.created_at asc`,
        [user.id],
      ),
    ]);

    const profileInfo = profile.rows[0] ?? null;
    const workspaceRows = workspaces.rows;
    const requestedId = request.nextUrl.searchParams.get("organization_id");
    const selected = workspaceRows.find((row) => row.id === requestedId)
      ?? workspaceRows.find((row) => row.id === profileInfo?.preferred_organization_id)
      ?? workspaceRows[0];
    let transactions: unknown[] = [];

    if (selected) {
      const membership = await db.query(
        "select 1 from bi_organization_members where organization_id=$1 and user_id=$2",
        [selected.id, user.id],
      );
      if (!membership.rowCount) return NextResponse.json({ error: "You do not have access to this workspace." }, { status: 403 });
      const result = await db.query(
        `select id,organization_id,transaction_date,description,kind,amount,currency,category,status
         from bi_transactions where organization_id=$1 order by transaction_date desc,created_at desc limit 500`,
        [selected.id],
      );
      transactions = result.rows;
    }

    return NextResponse.json({
      profile: profileInfo,
      workspaces: workspaceRows,
      transactions,
      email: user.email ?? "",
    });
  } catch (error) {
    console.error("BusinessIQ dashboard bootstrap failed", error);
    return NextResponse.json({ error: "Unable to load your BusinessIQ dashboard. Please retry." }, { status: 500 });
  }
}
