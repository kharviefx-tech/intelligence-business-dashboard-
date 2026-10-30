import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/utils/authenticated-user";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/integrations", request.url));
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const tenant = process.env.MICROSOFT_TENANT_ID || "common";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://intelligence-business-dashboard-thinksociety.vercel.app";
  if (!clientId || !appUrl) return NextResponse.redirect(new URL("/integrations?microsoft=setup_required", request.url));

  const state = randomBytes(24).toString("hex");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const redirectUri = `${appUrl}/api/auth/microsoft/callback`;
  // Start with identity-only consent. Each Microsoft product receives additional
  // delegated permissions only when its specific feature is implemented and enabled.
  const scopes = ["openid","profile","email","offline_access","User.Read"];
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
  response.cookies.set("bi_ms_user", user.id, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 600 });
  return response;
}
