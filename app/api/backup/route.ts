import { z } from "zod";
import { requireAdmin, errorResponse } from "@/lib/guard";
import { getClient } from "@/lib/db";
import { write, auditWrite } from "@/lib/write";
import { BACKUP_TABLES, encryptBackup } from "@/lib/backup";
export async function POST(request: Request) {
  try {
    const actor = await requireAdmin("accounts");
    const { passphrase } = z
      .object({ passphrase: z.string().min(12).max(200) })
      .parse(await request.json());
    const tables = await write(async (tx) => {
      const data: Record<string, unknown> = {};
      for (const table of BACKUP_TABLES)
        data[table] = (await tx.execute("SELECT * FROM " + table)).rows;
      await auditWrite(tx, actor, "Eksport backup terenkripsi", {
        tables: BACKUP_TABLES,
      });
      return data;
    });
    const payload = encryptBackup(
      { version: 1, createdAt: new Date().toISOString(), tables },
      passphrase,
    );
    return new Response(JSON.stringify(payload), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="mykhairat-backup-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function GET() {
  try {
    await requireAdmin("accounts");
    const tables = await getClient().execute(
      "SELECT name FROM sqlite_master WHERE type='table'",
    );
    return Response.json({ tables: tables.rows.map((r) => r.name) });
  } catch (e) {
    return errorResponse(e);
  }
}
