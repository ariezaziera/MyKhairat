import { errorResponse, json, requireAdmin } from "@/lib/guard";
import { saveDuitnow } from "@/lib/queries";
import { duitnowSchema, parseDataUrl } from "@/lib/validators";

export async function PUT(request: Request) {
  try {
    const session = await requireAdmin("settings");
    const parsed = duitnowSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return json(
        {
          error: parsed.error.issues[0]?.message ?? "Invalid DuitNow details.",
        },
        400,
      );
    let contentType: string | undefined;
    let imageBase64: string | undefined;
    if (parsed.data.dataUrl) {
      const image = parseDataUrl(parsed.data.dataUrl);
      if (!image)
        return json(
          { error: "Upload a PNG, JPEG, or WebP image of the DuitNow QR." },
          400,
        );
      contentType = image.contentType;
      imageBase64 = image.base64;
    }
    const settings = await saveDuitnow(
      {
        duitnowId: parsed.data.duitnowId ?? "",
        contentType,
        imageBase64,
        removeImage: parsed.data.removeImage,
      },
      session,
    );

    return json(settings);
  } catch (error) {
    return errorResponse(error);
  }
}
