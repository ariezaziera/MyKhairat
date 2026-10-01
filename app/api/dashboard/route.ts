import { errorResponse, json, requireSession } from "@/lib/guard";
import { getAdminDashboard, getFamilyBundle } from "@/lib/queries";

export async function GET() {
  try {
    const session = await requireSession();
    if (session.role === "admin") return json(await getAdminDashboard());
    if (!session.familyId) return json({ error: "No family is linked to this account." }, 403);
    const bundle = await getFamilyBundle(session.familyId);
    return json({
      family: bundle.family,
      assessment: bundle.assessment,
      members: bundle.members,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
