import { bootstrap } from "@/lib/bootstrap";
import { limitLogin, clearAccountAttempts } from "@/lib/login-limiter";
import { verifyActivation } from "@/lib/activation";
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
    if (!parsed.success)
      return json(
        { error: parsed.error.issues[0]?.message ?? "Invalid login." },
        400,
      );
    await bootstrap();
    await limitLogin(request, parsed.data.email);
    const user = await findUserByEmail(parsed.data.email);
    if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
      return json({ error: "Username atau password tidak tepat." }, 401);
    }
    if (user.active === 0)
      return json(
        { error: "This login has been disabled. Ask an AJK admin." },
        403,
      );
    if (
      user.activationRequired &&
      !verifyActivation(
        parsed.data.activationCode ?? "",
        user.activationHash,
        user.activationExpires,
      )
    )
      return json(
        {
          error:
            "Minta kod pengaktifan daripada AJK. Kod diperlukan untuk login pertama atau selepas reset.",
          activationRequired: true,
        },
        403,
      );
    await clearAccountAttempts(parsed.data.email);
    const role: Role = user.role === "admin" ? "admin" : "wakil";
    await setSessionCookie({
      sub: user.id,
      email: user.email,
      name: user.name,
      role,
      familyId: user.familyId,
      sessionVersion: user.sessionVersion,
      accessProfile: user.accessProfile,
      mustChangePassword: Boolean(user.mustChangePassword),
      activationVerified: Boolean(user.activationRequired),
    });
    return json({
      role,
      familyId: user.familyId,
      name: user.name,
      mustChangePassword: Boolean(user.mustChangePassword),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
