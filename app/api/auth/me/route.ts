import { errorResponse, json, requireSession } from "@/lib/guard";

export async function GET() {
  try {
    const session = await requireSession();
    return json(session);
  } catch (error) {
    return errorResponse(error);
  }
}
