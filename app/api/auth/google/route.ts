import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { OAUTH_STATE_COOKIE, cookieOptions } from "@/lib/auth-token";

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(`${appUrl()}/login?error=google_not_configured`);
  }
  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set(OAUTH_STATE_COOKIE, state, cookieOptions(60 * 10));
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${appUrl()}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
