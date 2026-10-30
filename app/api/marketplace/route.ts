import {NextRequest,NextResponse} from "next/server";
import {getNeonPool} from "@/utils/neon";
import {getAuthenticatedUser} from "@/utils/authenticated-user";
export const runtime="nodejs";
const modules=[
{id:"company-intelligence",name:"Company Intelligence",category:"Intelligence",description:"Visualise revenue, expenses, profit, trends and business signals in one workspace.",kind:"native",href:"/platform",features:["Financial KPIs","Trend analysis","Business signals"]},
{id:"csv-import",name:"Business Data Import",category:"Data",description:"Bring company records into BusinessIQ using validated CSV imports.",kind:"native",href:"/import",features:["CSV upload","Data preview","Workspace-scoped records"]},
{id:"team-collaboration",name:"Team Collaboration",category:"Productivity",description:"Invite colleagues and control their access to each company workspace.",kind:"native",href:"/team",features:["Workspace invitations","Role-based access","Invitation revocation"]},
{id:"developer-api",name:"Developer API",category:"Developers",description:"Create scoped API credentials for your own software and approved company systems.",kind:"native",href:"/developers",features:["Workspace API keys","Read-only transactions endpoint","Credential revocation"]},
{id:"microsoft-365",name:"Microsoft 365",category:"Productivity",description:"Connect Microsoft identity and, as supported connectors are released, company data services.",kind:"connector",href:"/integrations",features:["Microsoft sign-in foundation","Graph data sync not yet enabled"]},
{id:"google-workspace",name:"Google Workspace",category:"Productivity",description:"Planned connection for approved Google business data and services.",kind:"planned",href:"/integrations",features:["Planned connector"]},
{id:"accounting-connectors",name:"Accounting platforms",category:"Finance",description:"Connect accounting and bookkeeping systems as supported integrations become available.",kind:"planned",href:"/integrations",features:["Planned connector"]},
{id:"commerce-connectors",name:"Ecommerce platforms",category:"Commerce",description:"Bring orders, product and customer performance into company intelligence.",kind:"planned",href:"/integrations",features:["Planned connector"]},
{id:"crm-connectors",name:"CRM & Sales",category:"Sales",description:"Unify pipeline, customer and sales activity with business performance.",kind:"planned",href:"/integrations",features:["Planned connector"]},
{id:"banking-connectors",name:"Banking & payments",category:"Finance",description:"Securely connect financial activity from supported providers when available.",kind:"planned",href:"/integrations",features:["Planned connector"]}
];
export async function GET(req:NextRequest){
 const user=await getAuthenticatedUser();if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const org=req.nextUrl.searchParams.get("organization_id");if(!org)return NextResponse.json({error:"Select a company workspace."},{status:400});
 try{const db=getNeonPool();const member=await db.query("select role from bi_organization_members where organization_id=$1 and user_id=$2",[org,user.id]);if(!member.rowCount)return NextResponse.json({error:"Workspace access denied."},{status:403});
 const rows=await db.query("select id,provider,display_name,connection_status,config,created_at from bi_data_sources where organization_id=$1 and provider='businessiq_module' order by created_at desc",[org]);
 const installed=Object.fromEntries(rows.rows.map((r:any)=>[r.config?.module_id,{id:r.id,status:r.connection_status,created_at:r.created_at}]));
 return NextResponse.json({modules,installed,organization_id:org,viewer_role:member.rows[0].role});
 }catch(e){console.error("Marketplace load failed",e);return NextResponse.json({error:"Unable to load the marketplace."},{status:500});}
}
export async function POST(req:NextRequest){
 const user=await getAuthenticatedUser();if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 try{const body=await req.json();const org=String(body?.organization_id||"");const id=String(body?.module_id||"");const module=modules.find(m=>m.id===id&&m.kind==="native");if(!org||!module)return NextResponse.json({error:"This application is not currently available to install."},{status:400});
 const db=getNeonPool();const member=await db.query("select role from bi_organization_members where organization_id=$1 and user_id=$2",[org,user.id]);if(!member.rowCount||!["owner","manager"].includes(member.rows[0].role))return NextResponse.json({error:"Only workspace owners and managers can install applications."},{status:403});
 const saved=await db.query(`insert into bi_data_sources(organization_id,provider,display_name,connection_status,scopes,config,created_by,updated_at)
 values($1,'businessiq_module',$2,'connected',ARRAY['module:use'],$3::jsonb,$4,now())
 on conflict(organization_id,provider,display_name) do update set connection_status='connected',config=excluded.config,updated_at=now()
 returning id,display_name,connection_status,config`,[org,module.name,JSON.stringify({module_id:module.id,kind:"native",href:module.href}),user.id]);
 await db.query("insert into bi_audit_logs(organization_id,actor_id,action,entity,detail) values($1,$2,'marketplace.module_installed','businessiq_module',$3::jsonb)",[org,user.id,JSON.stringify({module_id:module.id,module_name:module.name})]);
 return NextResponse.json({success:true,installation:saved.rows[0],message:"Added to this workspace."});
 }catch(e){console.error("Marketplace install failed",e);return NextResponse.json({error:"Unable to add this application."},{status:500});}
}
export async function DELETE(req:NextRequest){
 const user=await getAuthenticatedUser();if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const org=req.nextUrl.searchParams.get("organization_id"),id=req.nextUrl.searchParams.get("module_id");if(!org||!id)return NextResponse.json({error:"Workspace and application are required."},{status:400});
 try{const db=getNeonPool();const member=await db.query("select role from bi_organization_members where organization_id=$1 and user_id=$2",[org,user.id]);if(!member.rowCount||!["owner","manager"].includes(member.rows[0].role))return NextResponse.json({error:"Only workspace owners and managers can remove applications."},{status:403});
 const result=await db.query("update bi_data_sources set connection_status='revoked',updated_at=now() where organization_id=$1 and provider='businessiq_module' and config->>'module_id'=$2 returning id",[org,id]);
 if(!result.rowCount)return NextResponse.json({error:"Application is not installed."},{status:404});
 await db.query("insert into bi_audit_logs(organization_id,actor_id,action,entity,detail) values($1,$2,'marketplace.module_removed','businessiq_module',$3::jsonb)",[org,user.id,JSON.stringify({module_id:id})]);
 return NextResponse.json({success:true});
 }catch(e){console.error("Marketplace removal failed",e);return NextResponse.json({error:"Unable to remove this application."},{status:500});}
}
