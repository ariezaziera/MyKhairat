import type { Client } from "@libsql/client";

// Convert the original key/value settings without deleting the source rows.
export async function migrateLegacySettings(client: Client) {
  const transaction = await client.transaction("write");
  try {
    const info = await transaction.execute("PRAGMA table_info(settings)");
    const columns = info.rows.map((row) => String(row.name));
    if (!columns.includes("key") || !columns.includes("value")) {
      await transaction.commit();
      return;
    }
    const source = await transaction.execute("SELECT * FROM settings");
    const normalize = (key: string) =>
      key.replace(/[^a-z0-9]/gi, "").toLowerCase();
    const values = new Map(
      source.rows.map((row) => [normalize(String(row.key)), String(row.value)]),
    );
    const read = (keys: string[], fallback: string) => {
      for (const key of keys) {
        const value = values.get(normalize(key));
        if (value !== undefined) return value;
      }
      return fallback;
    };
    const number = (keys: string[], fallback: number) => {
      const value = Number(read(keys, String(fallback)));
      return Number.isFinite(value) && value > 0 ? value : fallback;
    };
    const latest = [...source.rows].reverse();
    const column = (name: string) =>
      latest.find((row) => row[name] !== null && row[name] !== undefined)?.[
        name
      ] ?? null;
    await transaction.execute(
      "ALTER TABLE settings RENAME TO settings_legacy_backup",
    );
    await transaction.execute(`CREATE TABLE settings (
      id INTEGER PRIMARY KEY, base_rate_per_member REAL NOT NULL,
      payment_due_day INTEGER NOT NULL, payment_method TEXT NOT NULL,
      bank_name TEXT NOT NULL, bank_account_number TEXT NOT NULL,
      bank_account_name TEXT NOT NULL, updated_at TEXT NOT NULL,
      duitnow_id TEXT, duitnow_content_type TEXT, duitnow_qr TEXT,
      death_payout_amount REAL NOT NULL DEFAULT 2000,
      warded_payout_amount REAL NOT NULL DEFAULT 200
    )`);
    await transaction.execute({
      sql: `INSERT INTO settings VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        number(["base_rate_per_member", "monthly_rate", "rate_per_head"], 5),
        Math.min(
          28,
          Math.max(1, Math.floor(number(["payment_due_day", "due_day"], 7))),
        ),
        read(["payment_method"], "DuitNow QR / Bank Transfer"),
        read(["bank_name"], ""),
        read(["bank_account_number", "account_number"], ""),
        read(["bank_account_name", "account_name"], ""),
        new Date().toISOString(),
        read(["duitnow_id"], String(column("duitnow_id") ?? "")),
        column("duitnow_content_type"),
        column("duitnow_qr"),
        number(
          ["death_payout_amount"],
          Number(column("death_payout_amount") ?? 2000),
        ),
        number(
          ["warded_payout_amount"],
          Number(column("warded_payout_amount") ?? 200),
        ),
      ],
    });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  } finally {
    transaction.close();
  }
}
