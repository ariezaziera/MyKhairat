import { assertFamily, errorResponse, json, requireSession } from "@/lib/guard";
import { createMemberRequest, listMemberRequests } from "@/lib/queries";
import { memberRequestSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const status = new URL(request.url).searchParams.get("status") ?? undefined;
    const rows = await listMemberRequests(status);
    if (session.role === "wakil") return json(rows.filter((row) => row.familyId === session.familyId));
    return json(rows);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const parsed = memberRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, 400);
    assertFamily(session, parsed.data.familyId);
    const requestId = await createMemberRequest({
      ...parsed.data,
      icNumber: parsed.data.icNumber || undefined,
      note: parsed.data.note || undefined,
    });
    return json({ requestId }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
