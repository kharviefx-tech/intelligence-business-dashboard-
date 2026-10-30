import {createHash} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {getNeonPool} from "@/utils/neon";
export const runtime="nodejs";
export async function GET(req:NextRequest){
 const auth=req.headers.get("authorization")||"";const match=auth.match(/^Bearer\s+(bi_live_[A-Za-z0-9_-]{30,})$/);
 if(!match)return NextResponse.json({error:"A valid BusinessIQ API bearer key is required."},{status:401});
 const hash=createHash("sha256").update(match[1]).digest("hex");const db=getNeonPool();
 try{
  const key=await db.query("select id,organization_id,scopes from bi_api_credentials where secret_hash=$1 and revoked_at is null and (expires_at is null or expires_at>now()) limit 1",[hash]);
  if(!key.rowCount)return NextResponse.json({error:"API key is invalid, expired or revoked."},{status:401});
  const credential=key.rows[0];if(!credential.scopes?.includes("transactions:read"))return NextResponse.json({error:"This API key does not have permission to read transactions."},{status:403});
  const requested=Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit")||100),1),500);
  const result=await db.query("select id,transaction_date,description,kind,amount,currency,category,status,created_at from bi_transactions where organization_id=$1 order by transaction_date desc,created_at desc limit $2",[credential.organization_id,requested]);
  await db.query("update bi_api_credentials set last_used_at=now() where id=$1",[credential.id]);
  return NextResponse.json({data:result.rows,meta:{count:result.rowCount,limit:requested,workspace_id:credential.organization_id,served_at:new Date().toISOString()}});
 }catch(e){console.error("BusinessIQ public API read failed",e);return NextResponse.json({error:"BusinessIQ API request failed."},{status:500});}
}
