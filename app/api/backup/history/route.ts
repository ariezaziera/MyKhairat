import { z } from "zod";
import { getClient } from "@/lib/db";
import { requireAdmin, errorResponse, json, AppError } from "@/lib/guard";
import { decryptBackup, encryptBackup } from "@/lib/backup";
import { write, auditWrite } from "@/lib/write";
export async function GET() {
  try {
    await requireAdmin("accounts");
    return json(
      (
        await getClient().execute(
          "SELECT id,day,created_at,bytes FROM system_backups ORDER BY created_at DESC",
        )
      ).rows,
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await requireAdmin("accounts"),
      p = z
        .object({
          id: z.string().min(1),
          passphrase: z.string().min(12).max(200),
        })
        .parse(await request.json());
    const row = (
      await getClient().execute({
        sql: "SELECT * FROM system_backups WHERE id=?",
        args: [p.id],
      })
    ).rows[0];
    if (!row) throw new AppError("Backup tidak ditemui.", 404);
    const source = process.env.BACKUP_PASSPHRASE;
    if (!source) throw new AppError("Kunci backup belum disediakan.", 503);
    const payload = encryptBackup(
      decryptBackup(JSON.parse(String(row.payload)), source),
      p.passphrase,
    );
    await write((tx) =>
      auditWrite(tx, actor, "Muat turun backup harian", {
        id: p.id,
        day: row.day,
      }),
    );
    return new Response(JSON.stringify(payload), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="mykhairat-backup-${row.day}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
