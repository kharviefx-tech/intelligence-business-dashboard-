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
    const result = await db.query(
      `select o.id,o.name,o.legal_name,o.industry,o.country,o.timezone,o.website,o.company_size,o.description,o.currency,o.plan,m.role
       from bi_organizations o join bi_organization_members m on m.organization_id=o.id
       where o.id=$1 and m.user_id=$2 limit 1`,
      [organizationId,user.id],
    );
    if (!result.rowCount) return NextResponse.json({ error: "Workspace not found or access denied." }, { status: 404 });
    return NextResponse.json({ organization: result.rows[0] });
  } catch (error) {
    console.error("BusinessIQ organization read failed", error);
    return NextResponse.json({ error: "Unable to load company workspace." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const body = await request.json();
    const { organization_id, name, legal_name, industry, country, timezone, website, company_size, description } = body ?? {};
    if (!organization_id || typeof name !== "string" || name.trim().length < 1 || name.trim().length > 120) {
      return NextResponse.json({ error: "A valid company/workspace name is required." }, { status: 400 });
    }
    const cleanWebsite = typeof website === "string" && website.trim() ? website.trim() : null;
    if (cleanWebsite && (!/^https?:\/\//i.test(cleanWebsite) || cleanWebsite.length > 240)) {
      return NextResponse.json({ error: "Enter a complete website address beginning with https://." }, { status: 400 });
    }
    const allowedSizes = ["1-10","11-50","51-200","201-500","501-1000","1000+"];
    if (company_size && !allowedSizes.includes(company_size)) return NextResponse.json({ error: "Choose a valid company size." }, { status: 400 });
    const db = getNeonPool();
    const access = await db.query("select role from bi_organization_members where organization_id=$1 and user_id=$2", [organization_id,user.id]);
    if (!access.rowCount || !["owner","manager"].includes(access.rows[0].role)) {
      return NextResponse.json({ error: "Only workspace owners and managers can update company details." }, { status: 403 });
    }
    const result = await db.query(
      `update bi_organizations set name=$3,legal_name=$4,industry=$5,country=$6,timezone=$7,website=$8,company_size=$9,description=$10,updated_by=$2,updated_at=now()
       where id=$1 returning id,name,legal_name,industry,country,timezone,website,company_size,description,currency,plan`,
      [organization_id,user.id,name.trim(),typeof legal_name==="string"?legal_name.trim().slice(0,160)||null:null,typeof industry==="string"?industry.trim().slice(0,100)||null:null,typeof country==="string"?country.trim().slice(0,80)||"Nigeria":"Nigeria",typeof timezone==="string"?timezone.trim().slice(0,80)||"Africa/Lagos":"Africa/Lagos",cleanWebsite,company_size||null,typeof description==="string"?description.trim().slice(0,1000)||null:null],
    );
    await db.query("insert into bi_audit_logs(organization_id,actor_id,action,entity,detail) values($1,$2,'workspace.updated','organization',$3::jsonb)", [organization_id,user.id,JSON.stringify({ fields:["name","legal_name","industry","country","timezone","website","company_size","description"] })]);
    return NextResponse.json({ organization: result.rows[0] });
  } catch (error) {
    console.error("BusinessIQ organization update failed", error);
    return NextResponse.json({ error: "Unable to save company details." }, { status: 500 });
  }
}
