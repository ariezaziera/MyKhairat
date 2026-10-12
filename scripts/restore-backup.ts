import { readFile } from "fs/promises";
import { BACKUP_TABLES, decryptBackup } from "../lib/backup";
import { ensureSchema, getClient } from "../lib/db";
async function main() {
  const filename = process.argv[2],
    url = process.env.RESTORE_DATABASE_URL,
    passphrase = process.env.BACKUP_PASSPHRASE;
  if (!filename || !url || !passphrase)
    throw new Error(
      "Gunakan: RESTORE_DATABASE_URL=<database kosong> BACKUP_PASSPHRASE=<passphrase> npm run db:restore -- backup.json",
    );
  if (url === process.env.TURSO_DATABASE_URL)
    throw new Error(
      "Sasaran pemulihan mesti database berasingan daripada database aplikasi.",
    );
  process.env.TURSO_DATABASE_URL = url;
  process.env.TURSO_AUTH_TOKEN = process.env.RESTORE_AUTH_TOKEN || "";
  const encrypted = JSON.parse(await readFile(filename, "utf8"));
  const backup = decryptBackup(encrypted, passphrase);
  // Older encrypted backups predate the source archive / review tables.
  if (backup.tables) for (const t of ["legacy_imports", "legacy_issues"]) backup.tables[t] ??= [];
  if (
    backup.version !== 1 ||
    !backup.tables ||
    BACKUP_TABLES.some((t) => !Array.isArray(backup.tables[t]))
  )
    throw new Error("Struktur backup tidak sah.");
  await ensureSchema();
  const tx = await getClient().transaction("write");
  try {
    for (const table of BACKUP_TABLES.filter(
      (t) => t !== "settings" && t !== "contribution_policies",
    )) {
      const r = await tx.execute("SELECT COUNT(*) AS n FROM " + table);
      if (Number(r.rows[0].n) !== 0)
        throw new Error(
          "Pemulihan hanya ke database kosong. Sasaran mempunyai " + table,
        );
    }
    await tx.execute("DELETE FROM contribution_policies");
    await tx.execute("DELETE FROM settings");
    for (const table of BACKUP_TABLES) {
      const info = await tx.execute("PRAGMA table_info(" + table + ")");
      const allowed = new Set(info.rows.map((r) => String(r.name)));
      for (const row of backup.tables[table]) {
        if (!row || typeof row !== "object" || Array.isArray(row))
          throw new Error("Baris backup tidak sah.");
        const columns = Object.keys(row);
        if (!columns.length || columns.some((c) => !allowed.has(c)))
          throw new Error("Kolum backup tidak dikenali: " + table);
        await tx.execute({
          sql:
            "INSERT INTO " +
            table +
            "(" +
            columns.map((c) => '"' + c + '"').join(",") +
            ") VALUES(" +
            columns.map(() => "?").join(",") +
            ")",
          args: columns.map((c) => row[c]),
        });
      }
    }
    const check = await tx.execute("PRAGMA foreign_key_check");
    if (check.rows.length) throw new Error("Semakan hubungan rekod gagal.");
    await tx.commit();
    console.log(
      "Pemulihan selesai ke database berasingan. Sahkan jumlah, login dan bukti sebelum menukar production.",
    );
  } catch (e) {
    await tx.rollback();
    throw e;
  } finally {
    tx.close();
    getClient().close();
  }
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Pemulihan gagal.");
  process.exitCode = 1;
});
