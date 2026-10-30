import { NextRequest, NextResponse } from "next/server";
import { getNeonPool } from "@/utils/neon";
import { getAuthenticatedUser } from "@/utils/authenticated-user";

export const runtime = "nodejs";

export async function GET() {
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
    return NextResponse.json({ profile: profile.rows[0] ?? null, workspaces: workspaces.rows, email: user.email ?? "" });
  } catch (error) {
    console.error("BusinessIQ workspace read failed", error);
    return NextResponse.json({ error: "Unable to load your BusinessIQ workspace. Check the Neon database connection." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const currency = typeof body.currency === "string" ? body.currency : "NGN";
    if (name.length < 2 || name.length > 120) return NextResponse.json({ error: "Workspace name must be between 2 and 120 characters." }, { status: 400 });
    if (!["NGN","USD","GBP","EUR","GHS","KES","ZAR"].includes(currency)) return NextResponse.json({ error: "Unsupported currency." }, { status: 400 });
    const db = getNeonPool();
    const client = await db.connect();
    let workspaceId: string;
    try {
      await client.query("begin");
      await client.query(
        "insert into bi_profiles(id,full_name) values($1,$2) on conflict(id) do nothing",
        [user.id, user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? null],
      );
      const created = await client.query(
        "insert into bi_organizations(name,currency,created_by) values($1,$2,$3) returning id",
        [name,currency,user.id],
      );
      workspaceId = created.rows[0].id;
      await client.query(
        "insert into bi_organization_members(organization_id,user_id,role) values($1,$2,'owner')",
        [workspaceId,user.id],
      );
      await client.query(
        "update bi_profiles set preferred_organization_id=$1 where id=$2",
        [workspaceId,user.id],
      );
      await client.query(
        "insert into bi_audit_logs(organization_id,actor_id,action,entity,detail) values($1,$2,'workspace.created','organization',$3::jsonb)",
        [workspaceId,user.id,JSON.stringify({name,currency})],
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
    return NextResponse.json({ id: workspaceId }, { status: 201 });
  } catch (error) {
    console.error("BusinessIQ workspace creation failed", error);
    return NextResponse.json({ error: "Unable to create workspace. Please try again." }, { status: 500 });
  }
}
