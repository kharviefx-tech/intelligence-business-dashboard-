import { NextRequest, NextResponse } from "next/server";
import { getNeonPool } from "@/utils/neon";
import { getAuthenticatedUser } from "@/utils/authenticated-user";
export const runtime = "nodejs";
export async function PATCH(request: NextRequest) {
 const user = await getAuthenticatedUser();
 if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
 try {
  const body = await request.json();
  const f = { full_name: typeof body.full_name === "string" ? body.full_name.trim() : "", avatar_url: typeof body.avatar_url === "string" ? body.avatar_url : null, phone: typeof body.phone === "string" ? body.phone.trim() : null, job_title: typeof body.job_title === "string" ? body.job_title.trim() : null, bio: typeof body.bio === "string" ? body.bio.trim() : null, company_name: typeof body.company_name === "string" ? body.company_name.trim() : null, company_website: typeof body.company_website === "string" ? body.company_website.trim() : null, timezone: typeof body.timezone === "string" ? body.timezone : "Africa/Lagos", preferred_organization_id: typeof body.preferred_organization_id === "string" && body.preferred_organization_id ? body.preferred_organization_id : null };
  if (f.full_name.length < 2 || f.full_name.length > 120 || (f.phone?.length ?? 0) > 40 || (f.job_title?.length ?? 0) > 120 || (f.bio?.length ?? 0) > 500) return NextResponse.json({ error: "Please check your profile details." }, { status: 400 });
  const db = getNeonPool();
  if (f.preferred_organization_id) { const access = await db.query("select 1 from bi_organization_members where organization_id=$1 and user_id=$2", [f.preferred_organization_id,user.id]); if (!access.rowCount) return NextResponse.json({ error: "You are not a member of that workspace." }, { status: 403 }); }
  await db.query("insert into bi_profiles(id,full_name,avatar_url,phone,job_title,bio,company_name,company_website,timezone,preferred_organization_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict(id) do update set full_name=excluded.full_name,avatar_url=excluded.avatar_url,phone=excluded.phone,job_title=excluded.job_title,bio=excluded.bio,company_name=excluded.company_name,company_website=excluded.company_website,timezone=excluded.timezone,preferred_organization_id=excluded.preferred_organization_id", [user.id,f.full_name,f.avatar_url,f.phone,f.job_title,f.bio,f.company_name,f.company_website,f.timezone,f.preferred_organization_id]);
  return NextResponse.json({ profile: { id:user.id, ...f } });
 } catch (error) { console.error("BusinessIQ profile update failed", error); return NextResponse.json({ error: "Unable to save your profile." }, { status: 500 }); }
}
