import { SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "mk_session";
export const OAUTH_STATE_COOKIE = "mk_oauth_state";

export type Role = "admin" | "wakil";

export type Session = {
  sub: string;
  email: string;
  name: string;
  role: Role;
  familyId: string | null;
};

function secretKey() {
  const value =
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV !== "production" ? "dev-mykhairat-secret-change-in-production" : "");
  if (!value) {
    throw new Error("AUTH_SECRET is required");
  }
  return new TextEncoder().encode(value);
}

export async function signSession(session: Session) {
  return new SignJWT({
    email: session.email,
    name: session.name,
    role: session.role,
    familyId: session.familyId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const role = payload.role;
    if (role !== "admin" && role !== "wakil") return null;
    return {
      sub: String(payload.sub),
      email: String(payload.email || ""),
      name: String(payload.name || ""),
      role,
      familyId: payload.familyId ? String(payload.familyId) : null,
    };
  } catch {
    return null;
  }
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
