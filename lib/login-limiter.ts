import { createHash } from "crypto";
import { getClient } from "./db";
import { AppError } from "./guard";
export async function limitLogin(request: Request, login: string) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const now = Date.now(),
    window = 15 * 60000;
  for (const key of ["account:" + login.trim().toLowerCase(), "ip:" + ip]) {
    const digest = createHash("sha256").update(key).digest("hex");
    const rows = await getClient().execute({
      sql: `INSERT INTO login_attempts(key,window_start,attempts) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET window_start=CASE WHEN login_attempts.window_start<? THEN excluded.window_start ELSE login_attempts.window_start END,attempts=CASE WHEN login_attempts.window_start<? THEN 1 ELSE login_attempts.attempts+1 END RETURNING attempts`,
      args: [digest, now, now - window, now - window],
    });
    if (Number(rows.rows[0].attempts) > (key.startsWith("ip:") ? 60 : 10))
      throw new AppError(
        "Terlalu banyak percubaan. Cuba selepas 15 minit atau hubungi AJK.",
        429,
      );
  }
  await getClient().execute({
    sql: "DELETE FROM login_attempts WHERE window_start<?",
    args: [now - 86400000],
  });
}
export async function clearAccountAttempts(login: string) {
  const key = createHash("sha256")
    .update("account:" + login.trim().toLowerCase())
    .digest("hex");
  await getClient().execute({
    sql: "DELETE FROM login_attempts WHERE key=?",
    args: [key],
  });
}
