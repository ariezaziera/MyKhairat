import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

export const COOKIE_NAME = "mk_session";
export const OAUTH_STATE_COOKIE = "mk_oauth_state";

export type Role = "admin" | "wakil";

export type Session = {
  sub: string;
  email: string;
  name: string;
  role: Role;
  familyId: string | null;
  accessProfile?: string;
  sessionVersion?: number;
  mustChangePassword?: boolean;
  activationVerified?: boolean;
};

function secretKey() {
  const value =
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV !== "production"
      ? "dev-mykhairat-secret-change-in-production"
      : "");
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
    accessProfile: session.accessProfile ?? "owner",
    sessionVersion: session.sessionVersion ?? 0,
    mustChangePassword: session.mustChangePassword ?? false,
    activationVerified: session.activationVerified ?? false,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    const role = payload.role;
    if (role !== "admin" && role !== "wakil") return null;
    return {
      sub: String(payload.sub),
      email: String(payload.email || ""),
      name: String(payload.name || ""),
      role,
      familyId: payload.familyId ? String(payload.familyId) : null,
      accessProfile: String(payload.accessProfile ?? "owner"),
      sessionVersion: Number(payload.sessionVersion ?? 0),
      mustChangePassword: payload.mustChangePassword === true,
      activationVerified: payload.activationVerified === true,
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
