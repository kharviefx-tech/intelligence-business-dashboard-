import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getNeonPool } from "@/utils/neon";
import { getAuthenticatedUser } from "@/utils/authenticated-user";

export const runtime = "nodejs";
const roles = ["manager", "staff", "analyst"] as const;

async function accessToManage(organizationId:string,userId:string) {
  const db=getNeonPool();
  const result=await db.query("select role from bi_organization_members where organization_id=$1 and user_id=$2",[organizationId,userId]);
  return result.rows[0]?.role as string|undefined;
}

export async function GET(request:NextRequest) {
  const user=await getAuthenticatedUser();
  if(!user) return NextResponse.json({error:"Authentication required."},{status:401});
  const organizationId=request.nextUrl.searchParams.get("organization_id");
  if(!organizationId) return NextResponse.json({error:"Workspace is required."},{status:400});
  try {
    const db=getNeonPool();
    const access=await db.query("select role from bi_organization_members where organization_id=$1 and user_id=$2",[organizationId,user.id]);
    if(!access.rowCount) return NextResponse.json({error:"Workspace access denied."},{status:403});
    const [members,invites]=await Promise.all([
      db.query(`select m.id,m.user_id,m.role,m.created_at,p.full_name,p.avatar_url
        from bi_organization_members m left join bi_profiles p on p.id=m.user_id
        where m.organization_id=$1 order by case when m.role='owner' then 0 when m.role='manager' then 1 else 2 end,m.created_at asc`,[organizationId]),
      db.query(`select id,invited_email,role,expires_at,created_at from bi_workspace_invitations
        where organization_id=$1 and accepted_at is null and expires_at>now() order by created_at desc`,[organizationId])
    ]);
    return NextResponse.json({members:members.rows,invitations:invites.rows,viewer_role:access.rows[0].role});
  } catch(error) {
    console.error("BusinessIQ team read failed",error);
    return NextResponse.json({error:"Unable to load workspace team."},{status:500});
  }
}

export async function POST(request:NextRequest) {
  const user=await getAuthenticatedUser();
  if(!user) return NextResponse.json({error:"Authentication required."},{status:401});
  try {
    const body=await request.json();
    const organizationId=String(body?.organization_id||"");
    const email=String(body?.email||"").trim().toLowerCase();
    const role=String(body?.role||"staff");
    if(!organizationId||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!roles.includes(role as typeof roles[number])) {
      return NextResponse.json({error:"Enter a valid email address and invitation role."},{status:400});
    }
    const db=getNeonPool();
    const actorRole=await accessToManage(organizationId,user.id);
    if(!actorRole||!["owner","manager"].includes(actorRole)) return NextResponse.json({error:"Only workspace owners and managers can invite members."},{status:403});
    if(actorRole==="manager"&&role==="manager") return NextResponse.json({error:"Only the workspace owner can invite another manager."},{status:403});
    const secret=randomBytes(32).toString("base64url");
    const hash=createHash("sha256").update(secret).digest("hex");
    const inserted=await db.query(`insert into bi_workspace_invitations(organization_id,invited_email,role,token_hash,invited_by,expires_at)
      values($1,$2,$3,$4,$5,now()+interval '7 days') returning id,invited_email,role,expires_at`,[organizationId,email,role,hash,user.id]);
    await db.query("insert into bi_audit_logs(organization_id,actor_id,action,entity,detail) values($1,$2,'team.invitation_created','invitation',$3::jsonb)",[organizationId,user.id,JSON.stringify({email,role})]);
    return NextResponse.json({invitation:inserted.rows[0],invite_url:new URL("/invite/accept?token="+secret,request.nextUrl.origin).toString(),share_once:true},{status:201});
  } catch(error) {
    console.error("BusinessIQ team invite failed",error);
    return NextResponse.json({error:"Unable to create invitation."},{status:500});
  }
}

export async function DELETE(request:NextRequest) {
  const user=await getAuthenticatedUser();
  if(!user) return NextResponse.json({error:"Authentication required."},{status:401});
  const invitationId=request.nextUrl.searchParams.get("invitation_id");
  const organizationId=request.nextUrl.searchParams.get("organization_id");
  if(!invitationId||!organizationId) return NextResponse.json({error:"Invitation and workspace are required."},{status:400});
  try {
    const db=getNeonPool();
    const actorRole=await accessToManage(organizationId,user.id);
    if(!actorRole||!["owner","manager"].includes(actorRole)) return NextResponse.json({error:"You cannot manage invitations in this workspace."},{status:403});
    const result=await db.query("delete from bi_workspace_invitations where id=$1 and organization_id=$2 and accepted_at is null returning id,invited_email",[invitationId,organizationId]);
    if(!result.rowCount) return NextResponse.json({error:"Invitation not found or already accepted."},{status:404});
    await db.query("insert into bi_audit_logs(organization_id,actor_id,action,entity,detail) values($1,$2,'team.invitation_revoked','invitation',$3::jsonb)",[organizationId,user.id,JSON.stringify({email:result.rows[0].invited_email})]);
    return NextResponse.json({success:true});
  } catch(error) {
    console.error("BusinessIQ invitation revoke failed",error);
    return NextResponse.json({error:"Unable to revoke invitation."},{status:500});
  }
}
