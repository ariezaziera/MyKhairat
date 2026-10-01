import { errorResponse, json, requireAdmin } from "@/lib/guard";
import { recordActivity, updateAccount } from "@/lib/queries";
import { accountUpdateSchema } from "@/lib/validators";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const session = await requireAdmin();
    const { id } = await context.params;
    const parsed = accountUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid account update." }, 400);
    const updated = await updateAccount(session.sub, id, {
      name: parsed.data.name,
      password: parsed.data.password || undefined,
      phone: parsed.data.phone,
      active: parsed.data.active,
    });
    const parts = [
      parsed.data.name ? `renamed to ${parsed.data.name}` : "",
      parsed.data.password ? "password reset" : "",
      parsed.data.active === true ? "enabled" : "",
      parsed.data.active === false ? "disabled" : "",
    ].filter(Boolean);
    await recordActivity(session, "Account", `${updated.role} account ${id}: ${parts.join(", ") || "updated"}.`);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
