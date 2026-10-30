import { createHash,randomBytes } from "node:crypto";
import { NextRequest,NextResponse } from "next/server";
import { getNeonPool } from "@/utils/neon";
import { getAuthenticatedUser } from "@/utils/authenticated-user";
export const runtime="nodejs";
const digest=(v:string)=>createHash("sha256").update(v).digest("hex");
export async function GET(req:NextRequest){
 const user=await getAuthenticatedUser();if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const org=req.nextUrl.searchParams.get("organization_id");if(!org)return NextResponse.json({error:"Workspace is required."},{status:400});
 const db=getNeonPool();const access=await db.query("select role from bi_organization_members where organization_id=$1 and user_id=$2",[org,user.id]);
 if(!access.rowCount||!["owner","manager"].includes(access.rows[0].role))return NextResponse.json({error:"Only owners and managers can manage API credentials."},{status:403});
 const result=await db.query("select id,label,key_prefix,scopes,last_used_at,expires_at,revoked_at,created_at from bi_api_credentials where organization_id=$1 order by created_at desc",[org]);
 return NextResponse.json({credentials:result.rows});
}
export async function POST(req:NextRequest){
 const user=await getAuthenticatedUser();if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 try{const body=await req.json();const org=String(body?.organization_id||"");const label=String(body?.label||"").trim().slice(0,80);
 if(!org||label.length<2)return NextResponse.json({error:"Enter a descriptive API key name."},{status:400});
 const db=getNeonPool();const access=await db.query("select role from bi_organization_members where organization_id=$1 and user_id=$2",[org,user.id]);
 if(!access.rowCount||!["owner","manager"].includes(access.rows[0].role))return NextResponse.json({error:"Only owners and managers can create API credentials."},{status:403});
 const secret="bi_live_"+randomBytes(32).toString("base64url");const prefix=secret.slice(0,15);
 const inserted=await db.query("insert into bi_api_credentials(organization_id,label,key_prefix,secret_hash,scopes,created_by,expires_at) values($1,$2,$3,$4,$5,$6,now()+interval '365 days') returning id,label,key_prefix,scopes,expires_at,created_at",[org,label,prefix,digest(secret),["transactions:read"],user.id]);
 await db.query("insert into bi_audit_logs(organization_id,actor_id,action,entity,detail) values($1,$2,'api.credential_created','api_credential',$3::jsonb)",[org,user.id,JSON.stringify({label,scopes:["transactions:read"]})]);
 return NextResponse.json({credential:inserted.rows[0],secret,warning:"Copy this secret now. BusinessIQ stores only its hash and cannot show it again."},{status:201});
 }catch(e){console.error("BusinessIQ API credential create failed",e);return NextResponse.json({error:"Unable to create API credential."},{status:500});}
}
export async function DELETE(req:NextRequest){
 const user=await getAuthenticatedUser();if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const org=req.nextUrl.searchParams.get("organization_id"),id=req.nextUrl.searchParams.get("credential_id");if(!org||!id)return NextResponse.json({error:"Workspace and credential are required."},{status:400});
 const db=getNeonPool();const access=await db.query("select role from bi_organization_members where organization_id=$1 and user_id=$2",[org,user.id]);
 if(!access.rowCount||!["owner","manager"].includes(access.rows[0].role))return NextResponse.json({error:"Permission denied."},{status:403});
 const result=await db.query("update bi_api_credentials set revoked_at=now() where id=$1 and organization_id=$2 and revoked_at is null returning id,label",[id,org]);
 if(!result.rowCount)return NextResponse.json({error:"Credential not found or already revoked."},{status:404});
 await db.query("insert into bi_audit_logs(organization_id,actor_id,action,entity,detail) values($1,$2,'api.credential_revoked','api_credential',$3::jsonb)",[org,user.id,JSON.stringify({label:result.rows[0].label})]);
 return NextResponse.json({success:true});
}
