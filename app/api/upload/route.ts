import { assertFamily, errorResponse, json, requireSession } from "@/lib/guard";
import { saveReceipt } from "@/lib/queries";
import { parseDataUrl, uploadSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const parsed = uploadSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: "Choose a receipt image." }, 400);
    assertFamily(session, parsed.data.familyId);
    const image = parseDataUrl(parsed.data.dataUrl);
    if (!image) return json({ error: "Upload a PNG, JPG, or WebP receipt under 2MB." }, 400);
    const saved = await saveReceipt(parsed.data.familyId, image.contentType, image.base64);
    return json(saved, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
