import { createCipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/utils/authenticated-user";

export const runtime = "nodejs";

function seal(value: string, secret: string) {
  const key = createHash("sha256").update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenant = process.env.MICROSOFT_TENANT_ID || "common";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://intelligence-business-dashboard-thinksociety.vercel.app";
  const code = request.nextUrl.searchParams.get("code");
  const returnedState = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("bi_ms_state")?.value;
  const verifier = request.cookies.get("bi_ms_verifier")?.value;
  const redirectUri = request.cookies.get("bi_ms_redirect")?.value;
  const expectedUserId = request.cookies.get("bi_ms_user")?.value;
  const clear = (response: NextResponse) => {
    ["bi_ms_state","bi_ms_verifier","bi_ms_redirect","bi_ms_user"].forEach(name => response.cookies.set(name, "", { path: "/", maxAge: 0 }));
    return response;
  };
  const fail = (reason: string) => clear(NextResponse.redirect(new URL(`/integrations?microsoft=${reason}`, request.url)));

  if (!user) return fail("login_required");
  if (!clientId || !clientSecret || !appUrl) return fail("setup_required");
  if (!code || !returnedState || !expectedState || !verifier || !redirectUri || !expectedUserId) return fail("cancelled");
  if (user.id !== expectedUserId) return fail("account_changed");
  const a = Buffer.from(returnedState), b = Buffer.from(expectedState);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return fail("state_error");

  const scopes = "openid profile email offline_access User.Read";
  const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "authorization_code", code, redirect_uri: redirectUri, code_verifier: verifier, scope: scopes })
  });
  if (!tokenResponse.ok) return fail("consent_or_token_error");
  const tokens = await tokenResponse.json() as { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string };
  if (!tokens.access_token) return fail("token_missing");

  const response = clear(NextResponse.redirect(new URL("/integrations?microsoft=connected", request.url)));
  const secure = request.nextUrl.protocol === "https:";
  const session = seal(JSON.stringify({ businessiq_user_id: user.id, access_token: tokens.access_token, refresh_token: tokens.refresh_token || null, expires_at: Date.now() + (tokens.expires_in || 3600) * 1000, scope: tokens.scope || "" }), clientSecret);
  response.cookies.set("bi_ms_session", session, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 14 });
  return response;
}
