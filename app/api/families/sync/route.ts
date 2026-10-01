import { errorResponse, json, requireAdmin } from "@/lib/guard";
import { syncAllFamilies } from "@/lib/queries";

export async function POST() {
  try {
    await requireAdmin();
    const families = await syncAllFamilies();
    return json({ updated: families.length });
  } catch (error) {
    return errorResponse(error);
  }
}
