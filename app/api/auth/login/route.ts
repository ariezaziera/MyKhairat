import { errorResponse, json } from "@/lib/guard";
import { verifyPassword } from "@/lib/passwords";
import { findUserByEmail } from "@/lib/queries";
import { setSessionCookie } from "@/lib/session";
import { loginSchema } from "@/lib/validators";
import type { Role } from "@/lib/auth-token";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid login." }, 400);
    const user = await findUserByEmail(parsed.data.email);
    if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
      return json({ error: "Invalid email or password." }, 401);
    }
    if (user.active === 0) return json({ error: "This login has been disabled. Ask an AJK admin." }, 403);
    const role: Role = user.role === "admin" ? "admin" : "wakil";
    await setSessionCookie({
      sub: user.id,
      email: user.email,
      name: user.name,
      role,
      familyId: user.familyId,
    });
    return json({ role, familyId: user.familyId, name: user.name });
  } catch (error) {
    return errorResponse(error);
  }
}
