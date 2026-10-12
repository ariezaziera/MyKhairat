import { errorResponse, json, requireAdmin } from "@/lib/guard";
import { reviewMemberRequest } from "@/lib/queries";
import { z } from "zod";

const decisionSchema = z.object({ decision: z.enum(["Approved", "Rejected"]) });
type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const session = await requireAdmin("families");
    const { id } = await context.params;
    const parsed = decisionSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return json({ error: "Choose approve or reject." }, 400);
    const familyId = await reviewMemberRequest(
      id,
      parsed.data.decision,
      session,
    );
    return json({ familyId, status: parsed.data.decision });
  } catch (error) {
    return errorResponse(error);
  }
}
