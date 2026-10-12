import { randomUUID } from "crypto";
import { getClient } from "./db";
import { bootstrap } from "./bootstrap";
import { BACKUP_TABLES, encryptBackup } from "./backup";
import { write, auditWrite } from "./write";
import { malaysiaDate } from "./dates";
export async function scheduledBackup() {
  await bootstrap();
  const passphrase = process.env.BACKUP_PASSPHRASE;
  if (!passphrase || passphrase.length < 12)
    throw new Error("BACKUP_PASSPHRASE diperlukan.");
  const day = malaysiaDate();
  const previous = await getClient().execute({
    sql: "SELECT id FROM system_backups WHERE day=?",
    args: [day],
  });
  if (previous.rows.length) return { ok: true, alreadySaved: true };
  return write(async (tx) => {
    const check = await tx.execute({
      sql: "SELECT id FROM system_backups WHERE day=?",
      args: [day],
    });
    if (check.rows.length) return { ok: true, alreadySaved: true };
    const tables: Record<string, unknown> = {};
    for (const table of BACKUP_TABLES)
      tables[table] = (await tx.execute("SELECT * FROM " + table)).rows;
    const payload = JSON.stringify(
      encryptBackup(
        { version: 1, createdAt: new Date().toISOString(), tables },
        passphrase,
      ),
    );
    await tx.execute({
      sql: "INSERT INTO system_backups(id,day,created_at,payload,bytes) VALUES(?,?,?,?,?)",
      args: [
        randomUUID(),
        day,
        new Date().toISOString(),
        payload,
        Buffer.byteLength(payload),
      ],
    });
    await tx.execute(
      "DELETE FROM system_backups WHERE id NOT IN (SELECT id FROM system_backups ORDER BY created_at DESC LIMIT 7)",
    );
    await auditWrite(tx, undefined, "Sandaran harian", { day, retained: 7 });
    return { ok: true, alreadySaved: false };
  });
}
