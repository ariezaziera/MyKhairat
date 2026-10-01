import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function GET() {
  await clearSessionCookie();
  return NextResponse.redirect(`${appUrl()}/login?error=disabled`);
}
