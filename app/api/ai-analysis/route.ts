import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "AI provider setup is pending." }, { status: 503 });
}
