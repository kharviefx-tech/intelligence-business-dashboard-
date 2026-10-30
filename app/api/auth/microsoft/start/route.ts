import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const tenant = process.env.MICROSOFT_TENANT_ID || "common";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (!clientId || !appUrl) return NextResponse.redirect(new URL("/integrations?microsoft=setup_required", request.url));

  const state = randomBytes(24).toString("hex");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const redirectUri = `${appUrl}/api/auth/microsoft/callback`;
  const scopes = ["openid","profile","email","offline_access","User.Read","Files.ReadWrite","Mail.ReadWrite","Mail.Send","Calendars.ReadWrite","Chat.ReadWrite","ChannelMessage.Send","Sites.ReadWrite.All"];
  const authorize = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
  authorize.search = new URLSearchParams({
    client_id: clientId, response_type: "code", redirect_uri: redirectUri,
    response_mode: "query", scope: scopes.join(" "), state, code_challenge: challenge,
    code_challenge_method: "S256", prompt: "select_account"
  }).toString();

  const response = NextResponse.redirect(authorize);
  const secure = appUrl.startsWith("https://");
  response.cookies.set("bi_ms_state", state, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 600 });
  response.cookies.set("bi_ms_verifier", verifier, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 600 });
  response.cookies.set("bi_ms_redirect", redirectUri, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 600 });
  return response;
}
