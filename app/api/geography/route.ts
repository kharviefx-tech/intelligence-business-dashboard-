import { NextRequest, NextResponse } from "next/server";
import { getNeonPool } from "@/utils/neon";
import { getAuthenticatedUser } from "@/utils/authenticated-user";

export const runtime = "nodejs";
const types = ["headquarters","office","store","warehouse","factory","branch","other"];

async function authorize(organizationId: string, userId: string) {
  const db = getNeonPool();
  const membership = await db.query(
    "select m.role from bi_organization_members m where m.organization_id=$1 and m.user_id=$2",
    [organizationId, userId],
  );
  return membership.rowCount ? membership.rows[0] : null;
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const organizationId = request.nextUrl.searchParams.get("organization_id");
  if (!organizationId) return NextResponse.json({ error: "Workspace is required." }, { status: 400 });
  try {
    if (!await authorize(organizationId, user.id)) return NextResponse.json({ error: "You do not have access to this workspace." }, { status: 403 });
    const db = getNeonPool();
    const [locations, countries, regions, cities] = await Promise.all([
      db.query("select id,location_name,location_type,country,country_code,region,city,address_line,notes,created_at from bi_business_locations where organization_id=$1 order by country,region,city,location_name", [organizationId]),
      db.query("select country,count(*)::int as location_count from bi_business_locations where organization_id=$1 group by country order by location_count desc,country", [organizationId]),
      db.query("select region,country,count(*)::int as location_count from bi_business_locations where organization_id=$1 and nullif(trim(region),'') is not null group by region,country order by location_count desc,region limit 100", [organizationId]),
      db.query("select city,region,country,count(*)::int as location_count from bi_business_locations where organization_id=$1 and nullif(trim(city),'') is not null group by city,region,country order by location_count desc,city limit 100", [organizationId]),
    ]);
    return NextResponse.json({
      locations: locations.rows,
      summary: { total_locations: locations.rowCount ?? 0, countries: countries.rowCount ?? 0, regions: regions.rowCount ?? 0, cities: cities.rowCount ?? 0 },
      by_country: countries.rows, by_region: regions.rows, by_city: cities.rows,
      data_quality: { source: "business locations entered by workspace members", inferred_location_data: false, generated_at: new Date().toISOString() },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("BusinessIQ geographic analytics read failed", error);
    return NextResponse.json({ error: "Unable to load geographic analytics." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const body = await request.json();
    const organizationId = typeof body?.organization_id === "string" ? body.organization_id : "";
    const locationName = typeof body?.location_name === "string" ? body.location_name.trim() : "";
    const country = typeof body?.country === "string" ? body.country.trim() : "";
    const locationType = typeof body?.location_type === "string" ? body.location_type : "office";
    const region = typeof body?.region === "string" ? body.region.trim() : "";
    const city = typeof body?.city === "string" ? body.city.trim() : "";
    const countryCode = typeof body?.country_code === "string" ? body.country_code.trim().toUpperCase() : "";
    const address = typeof body?.address_line === "string" ? body.address_line.trim() : "";
    const notes = typeof body?.notes === "string" ? body.notes.trim() : "";
    if (!organizationId || locationName.length < 2 || locationName.length > 160 || country.length < 2 || country.length > 100
      || !types.includes(locationType) || region.length > 120 || city.length > 120
      || (countryCode && !/^[A-Z]{2}$/.test(countryCode)) || address.length > 240 || notes.length > 1000) {
      return NextResponse.json({ error: "Check the location name, country, type and optional details." }, { status: 400 });
    }
    if (!await authorize(organizationId, user.id)) return NextResponse.json({ error: "You do not have access to this workspace." }, { status: 403 });
    const db = getNeonPool();
    const result = await db.query(
      `insert into bi_business_locations(organization_id,created_by,location_name,location_type,country,country_code,region,city,address_line,notes)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       returning id,location_name,location_type,country,country_code,region,city,address_line,notes,created_at`,
      [organizationId,user.id,locationName,locationType,country,countryCode || null,region || null,city || null,address || null,notes || null],
    );
    return NextResponse.json({ location: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("BusinessIQ geographic location create failed", error);
    return NextResponse.json({ error: "Unable to save this business location." }, { status: 500 });
  }
}
