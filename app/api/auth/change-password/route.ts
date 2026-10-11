import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { users } from "@/lib/schema";
import { requireSession, json, errorResponse } from "@/lib/guard";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { setSessionCookie } from "@/lib/session";
const schema = z.object({ currentPassword: z.string().min(1), password: z.string().min(8).max(80) });
export async function POST(request: Request) {
  try {
    const session = await requireSession(true);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return json({ error: "Password baharu mesti sekurang-kurangnya 8 aksara." }, 400);
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, session.sub));
    if (!user || !verifyPassword(parsed.data.currentPassword, user.passwordHash)) return json({ error: "Password semasa salah." }, 400);
    if (parsed.data.password.toLowerCase() === "mykhairat" || parsed.data.password === parsed.data.currentPassword) return json({ error: "Gunakan password baharu yang bukan password default." }, 400);
    const updated = await db.update(users).set({ passwordHash: hashPassword(parsed.data.password), mustChangePassword: 0, sessionVersion: user.sessionVersion + 1 }).where(sql`${users.id} = ${user.id} AND ${users.sessionVersion} = ${user.sessionVersion}`).returning({ id: users.id });
    if (!updated.length) return json({ error: "Akaun berubah. Sila login semula." }, 409);
    await setSessionCookie({ ...session, sessionVersion: user.sessionVersion + 1, mustChangePassword: false });
    return json({ role: session.role });
  } catch (error) { return errorResponse(error); }
}
