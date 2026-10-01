import { errorResponse, json, requireAdmin, requireSession } from "@/lib/guard";
import { getSettings, recordActivity, updateSettings } from "@/lib/queries";
import { settingsSchema } from "@/lib/validators";

export async function GET() {
  try {
    await requireSession();
    return json(await getSettings());
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireAdmin();
    const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid settings." }, 400);
    const updated = await updateSettings(parsed.data);
    await recordActivity(
      session,
      "Settings",
      `Updated the agreement: RM ${parsed.data.baseRatePerMember} per head, death RM ${parsed.data.deathPayoutAmount}, warded RM ${parsed.data.wardedPayoutAmount}.`,
    );
    return json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
