import { createDecipheriv, createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function open(value: string, secret: string) {
  const data = Buffer.from(value, "base64url");
  const iv = data.subarray(0, 12), tag = data.subarray(12, 28), body = data.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", createHash("sha256").update(secret).digest(), iv);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8")) as { expires_at: number; scope: string };
}

export async function GET(request: NextRequest) {
  const secret = process.env.MICROSOFT_CLIENT_SECRET;
  const value = request.cookies.get("bi_ms_session")?.value;
  if (!secret || !value) return NextResponse.json({ connected: false });
  try {
    const session = open(value, secret);
    return NextResponse.json({ connected: true, expiresAt: session.expires_at, scopes: session.scope.split(" ").filter(Boolean) });
  } catch {
    return NextResponse.json({ connected: false });
  }
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ connected: false });
  response.cookies.set("bi_ms_session", "", { httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
