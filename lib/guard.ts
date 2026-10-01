import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
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
  if (error instanceof AppError) return json({ error: error.message }, error.status);
  console.error(error);
  return json({ error: "Something went wrong." }, 500);
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new AppError("Please sign in.", 401);
  await ensureSchema();
  const rows = await getDb().select({ active: users.active }).from(users).where(eq(users.id, session.sub));
  if (!rows[0] || rows[0].active === 0) throw new AppError("This login has been disabled.", 401);
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (session.role !== "admin") throw new AppError("Only the AJK admin can do that.", 403);
  return session;
}

export function assertFamily(session: Session, familyId: string) {
  if (session.role === "admin") return;
  if (session.role !== "wakil" || session.familyId !== familyId) {
    throw new AppError("You can only access your own family.", 403);
  }
}
