import { createHash } from "crypto";
import { NextRequest,NextResponse } from "next/server";
import { getNeonPool } from "@/utils/neon";
import { getAuthenticatedUser } from "@/utils/authenticated-user";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 const user=await getAuthenticatedUser();
 if(!user) return NextResponse.json({error:"Sign in before accepting this invitation."},{status:401});
 const body=await request.json().catch(()=>({}));
 const token=String(body?.token||"");
 if(token.length<30||token.length>200) return NextResponse.json({error:"This invitation link is invalid."},{status:400});
 const email=String(user.email||"").trim().toLowerCase();
 if(!email) return NextResponse.json({error:"Your account does not have a verified email address."},{status:400});
 const hash=createHash("sha256").update(token).digest("hex");
 const db=getNeonPool();
 const client=await db.connect();
 try{
  await client.query("BEGIN");
  const invite=await client.query("select id,organization_id,invited_email,role from bi_workspace_invitations where token_hash=$1 and accepted_at is null and expires_at>now() for update",[hash]);
  if(!invite.rowCount) {await client.query("ROLLBACK");return NextResponse.json({error:"This invitation has expired, was revoked, or has already been used."},{status:410});}
  const row=invite.rows[0];
  if(row.invited_email.toLowerCase()!==email){await client.query("ROLLBACK");return NextResponse.json({error:"Sign in with the email address this invitation was sent to."},{status:403});}
  await client.query("insert into bi_profiles(id,full_name) values($1,$2) on conflict(id) do nothing",[user.id,user.user_metadata?.full_name||user.user_metadata?.display_name||null]);
  await client.query("insert into bi_organization_members(organization_id,user_id,role) values($1,$2,$3) on conflict(organization_id,user_id) do nothing",[row.organization_id,user.id,row.role]);
  await client.query("update bi_workspace_invitations set accepted_at=now() where id=$1",[row.id]);
  await client.query("insert into bi_audit_logs(organization_id,actor_id,action,entity,detail) values($1,$2,'team.invitation_accepted','membership',$3::jsonb)",[row.organization_id,user.id,JSON.stringify({email,role:row.role})]);
  await client.query("COMMIT");
  return NextResponse.json({success:true,organization_id:row.organization_id});
 }catch(error){await client.query("ROLLBACK");console.error("BusinessIQ invitation acceptance failed",error);return NextResponse.json({error:"Unable to accept this invitation."},{status:500});}
 finally{client.release();}
}
