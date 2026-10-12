import { errorResponse, json, requireAdmin } from "@/lib/guard";
import { createAdminAccount, listAccounts } from "@/lib/queries";
import { adminAccountSchema } from "@/lib/validators";

export async function GET() {
  try {
    await requireAdmin("accounts");
    return json(await listAccounts());
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin("accounts");
    const parsed = adminAccountSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return json(
        { error: parsed.error.issues[0]?.message ?? "Invalid account." },
        400,
      );
    const userId = await createAdminAccount(
      {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        phone: parsed.data.phone || undefined,
        accessProfile: parsed.data.accessProfile,
        delegateFamilyId: parsed.data.delegateFamilyId,
      },
      session,
    );
    return json(userId, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
