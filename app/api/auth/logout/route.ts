import { clearSessionCookie } from "@/lib/session";
import { json } from "@/lib/guard";

export async function POST() {
  await clearSessionCookie();
  return json({ ok: true });
}
