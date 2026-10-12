import { timingSafeEqual } from "crypto";
import { scheduledBackup } from "@/lib/scheduled-backup";
import { errorResponse, json } from "@/lib/guard";
export const maxDuration = 60;
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET,
    actual = request.headers.get("authorization");
  if (!expected || !actual) return json({ error: "Unauthorized" }, 401);
  const a = Buffer.from(actual),
    b = Buffer.from("Bearer " + expected);
  if (a.length !== b.length || !timingSafeEqual(a, b))
    return json({ error: "Unauthorized" }, 401);
  try {
    return json(await scheduledBackup());
  } catch (e) {
    return errorResponse(e);
  }
}
