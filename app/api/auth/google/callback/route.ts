import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { OAUTH_STATE_COOKIE, type Role } from "@/lib/auth-token";
import { findUserByEmail } from "@/lib/queries";
import { setSessionCookie } from "@/lib/session";

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get(OAUTH_STATE_COOKIE)?.value;
  jar.set(OAUTH_STATE_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(`${appUrl()}/login?error=google_state`);
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl()}/login?error=google_not_configured`);
  }
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${appUrl()}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenResponse.ok) return NextResponse.redirect(`${appUrl()}/login?error=google_token`);
  const tokens = (await tokenResponse.json()) as { access_token?: string };
  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!profileResponse.ok) return NextResponse.redirect(`${appUrl()}/login?error=google_profile`);
  const profile = (await profileResponse.json()) as { email?: string };
  const user = profile.email ? await findUserByEmail(profile.email) : null;
  if (!user) return NextResponse.redirect(`${appUrl()}/login?error=google_no_account`);
  if (user.active === 0) return NextResponse.redirect(`${appUrl()}/login?error=disabled`);
  const role: Role = user.role === "admin" ? "admin" : "wakil";
  await setSessionCookie({
    sub: user.id,
    email: user.email,
    name: user.name,
    role,
    familyId: user.familyId,
  });
  return NextResponse.redirect(`${appUrl()}${role === "admin" ? "/admin" : "/app"}`);
}
