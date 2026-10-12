import { headers } from "next/headers";
import { can, type Permission } from "./permissions";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { Session } from "./auth-token";
import { ensureSchema, getDb } from "./db";
import { users } from "./schema";
import { getSession } from "./session";

export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(error: unknown) {
  if (error instanceof ZodError)
    return json(
      { error: error.issues[0]?.message || "Semak butiran borang." },
      400,
    );
  if (error instanceof AppError)
    return json({ error: error.message }, error.status);
  if (
    error instanceof Error &&
    /UNIQUE constraint|SQLITE_CONSTRAINT_UNIQUE/i.test(error.message)
  )
    return json(
      {
        error:
          "Rekod atau rujukan ini sudah wujud. Semak dahulu untuk elak pendua.",
      },
      409,
    );
  console.error(error);
  return json(
    {
      error:
        "Tindakan tidak dapat diselesaikan. Semak rekod sebelum cuba semula.",
    },
    500,
  );
}

export async function requireSession(
  allowPasswordChange = false,
): Promise<Session> {
  const h = await headers();
  const origin = h.get("origin");
  if (
    origin &&
    new URL(origin).host !== (h.get("x-forwarded-host") ?? h.get("host"))
  )
    throw new AppError("Permintaan daripada laman lain tidak dibenarkan.", 403);
  const session = await getSession();
  if (!session) throw new AppError("Please sign in.", 401);
  await ensureSchema();
  const rows = await getDb()
    .select()
    .from(users)
    .where(eq(users.id, session.sub));
  if (!rows[0] || rows[0].active === 0)
    throw new AppError("This login has been disabled.", 401);
  if (rows[0].sessionVersion !== (session.sessionVersion ?? 0))
    throw new AppError("Sila login semula.", 401);
  if (rows[0].activationRequired && !session.activationVerified)
    throw new AppError(
      "Login semula dengan kod pengaktifan daripada AJK.",
      403,
    );
  if (rows[0].mustChangePassword && !allowPasswordChange)
    throw new AppError("Sila tukar password dahulu.", 403);
  return {
    ...session,
    accessProfile: rows[0].accessProfile,
    role: rows[0].role as Session["role"],
    familyId: rows[0].familyId,
    mustChangePassword: Boolean(rows[0].mustChangePassword),
  };
}

export async function requireAdmin(
  permission: Permission = "read",
): Promise<Session> {
  const session = await requireSession();
  if (session.role !== "admin")
    throw new AppError("Tindakan ini hanya untuk AJK.", 403);
  if (!can(session.accessProfile, permission))
    throw new AppError(
      "Akaun AJK ini tiada kuasa untuk tindakan tersebut.",
      403,
    );
  return session;
}

export function assertFamily(session: Session, familyId: string) {
  if (session.role === "admin") return;
  if (session.role !== "wakil" || session.familyId !== familyId) {
    throw new AppError("You can only access your own family.", 403);
  }
}
