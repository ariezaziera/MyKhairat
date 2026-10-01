import { cookies } from "next/headers";
import { COOKIE_NAME, cookieOptions, signSession, verifySession, type Session } from "./auth-token";

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function setSessionCookie(session: Session) {
  const token = await signSession(session);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, cookieOptions(60 * 60 * 24 * 7));
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", cookieOptions(0));
}
