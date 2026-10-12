import { errorResponse, json, requireAdmin } from "@/lib/guard";
import { createClaim, getFamilyBundle } from "@/lib/queries";
import { claimSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const familyId = new URL(request.url).searchParams.get("familyId");
    if (!familyId) return json({ error: "Family ID is required." }, 400);
    const bundle = await getFamilyBundle(familyId);
    return json(bundle.claims);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin("claims");
    const parsed = claimSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return json(
        { error: parsed.error.issues[0]?.message ?? "Invalid claim." },
        400,
      );
    const claimId = await createClaim(
      { ...parsed.data, notes: parsed.data.notes || undefined },
      session.name,
      session,
    );
    return json({ claimId }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
