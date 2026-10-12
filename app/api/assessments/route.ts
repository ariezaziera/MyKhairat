import { z } from "zod";
import { requireAdmin, json, errorResponse } from "@/lib/guard";
import { confirmAssessment } from "@/lib/finance";
const schema = z.object({
  familyId: z.string().min(2),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  expected: z.number().min(0).max(100000),
  count: z.number().int().min(0).max(1000),
  reason: z.string().trim().min(5).max(500),
});
export async function POST(request: Request) {
  try {
    const actor = await requireAdmin("settings");
    const p = schema.parse(await request.json());
    return json(
      await confirmAssessment(
        p.familyId,
        p.month,
        p.expected,
        p.count,
        p.reason,
        actor,
      ),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
