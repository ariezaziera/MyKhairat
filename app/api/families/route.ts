import { errorResponse, json, requireAdmin } from "@/lib/guard";
import { createFamily, listDirectory } from "@/lib/queries";
import { familyCreateSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const query = new URL(request.url).searchParams.get("q") ?? "";
    return json(await listDirectory(query));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const parsed = familyCreateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid family." }, 400);
    const bundle = await createFamily({ ...parsed.data, notes: parsed.data.notes || undefined });
    return json(bundle, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
