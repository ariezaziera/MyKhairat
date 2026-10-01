import { errorResponse, json, requireAdmin } from "@/lib/guard";
import { listActivity } from "@/lib/queries";

export async function GET() {
  try {
    await requireAdmin();
    return json(await listActivity());
  } catch (error) {
    return errorResponse(error);
  }
}
