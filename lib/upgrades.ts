import { protectIC } from "./private-data";
import type { Client } from "@libsql/client";
import { malaysiaMonth } from "./dates";

export async function upgradeSystem(client: Client) {
  const columns: Record<string, Record<string, string>> = {
    settings: {
      bank_verified: "INTEGER NOT NULL DEFAULT 0",
      support_phone: "TEXT NOT NULL DEFAULT ''",
      agreement_month: "TEXT",
    },
    families: {
      registration_complete: "INTEGER NOT NULL DEFAULT 1",
      external_id: "TEXT",
      billing_start_month: "TEXT",
    },
    members: {
      external_id: "TEXT",
      billing_start_month: "TEXT",
      billing_end_month: "TEXT",
    },
    users: {
      access_profile: "TEXT NOT NULL DEFAULT 'owner'",
      activation_hash: "TEXT",
      activation_expires: "TEXT",
      activation_required: "INTEGER NOT NULL DEFAULT 0",
    },
    claims: {
      status: "TEXT NOT NULL DEFAULT 'Paid'",
      recipient_name: "TEXT",
      recipient_account: "TEXT",
      evidence_url: "TEXT",
      reviewed_by: "TEXT",
      reviewed_at: "TEXT",
      paid_date: "TEXT",
      payout_reference: "TEXT",
      event_key: "TEXT",
      policy_amount: "REAL",
      exception_reason: "TEXT",
    },
    payments: { receipt_fingerprint: "TEXT" },
  };
  for (const [table, definitions] of Object.entries(columns)) {
    const info = await client.execute(`PRAGMA table_info(${table})`);
    const existing = new Set(info.rows.map((r) => String(r.name)));
    for (const [column, definition] of Object.entries(definitions)) {
      if (!existing.has(column)) {
        try {
          await client.execute(
            `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`,
          );
        } catch (error) {
          const current = await client.execute(`PRAGMA table_info(${table})`);
          if (!current.rows.some((row) => row.name === column)) throw error;
        }
      }
    }
  }
  const statements = [
    `CREATE TABLE IF NOT EXISTS system_backups (id TEXT PRIMARY KEY,day TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL,payload TEXT NOT NULL,bytes INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS system_migrations (key TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS monthly_assessments (family_id TEXT NOT NULL REFERENCES families(family_id), month TEXT NOT NULL, active_count INTEGER NOT NULL, rate REAL NOT NULL, due_day INTEGER NOT NULL, expected REAL NOT NULL, confirmed INTEGER NOT NULL DEFAULT 0, source TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(family_id,month))`,
    `CREATE TABLE IF NOT EXISTS contribution_policies (effective_month TEXT PRIMARY KEY, rate REAL NOT NULL, due_day INTEGER NOT NULL, death_amount REAL NOT NULL, warded_amount REAL NOT NULL, note TEXT NOT NULL, created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS fund_entries (id TEXT PRIMARY KEY, date TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('Opening','Donation','Expense','Adjustment','Refund')), amount REAL NOT NULL, reference TEXT NOT NULL UNIQUE, note TEXT NOT NULL, actor_id TEXT NOT NULL, created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS bank_reconciliations (id TEXT PRIMARY KEY, date TEXT NOT NULL, bank_balance REAL NOT NULL, book_balance REAL NOT NULL, note TEXT NOT NULL, actor_id TEXT NOT NULL, created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS login_attempts (key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, attempts INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS import_batches (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, family_count INTEGER NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_claim_event ON claims(event_key) WHERE event_key IS NOT NULL AND status != 'Rejected'`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_family_external ON families(external_id) WHERE external_id IS NOT NULL`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_member_external ON members(family_id,external_id) WHERE external_id IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS idx_fund_date ON fund_entries(date)`,
  ];
  for (const statement of statements) await client.execute(statement);
  // Cookies.txt was accidentally committed in earlier history. Revoke existing
  // sessions once, without changing account credentials, before serving requests.
  await client.batch(
    [
      { sql: "INSERT OR IGNORE INTO system_migrations(key,applied_at) VALUES('revoke-pre-upgrade-sessions','')" },
      { sql: "UPDATE users SET session_version=session_version+1 WHERE changes()=1" },
      { sql: "UPDATE system_migrations SET applied_at=? WHERE key='revoke-pre-upgrade-sessions' AND applied_at=''", args: [new Date().toISOString()] },
    ],
    "write",
  );
  await client.execute(
    "UPDATE users SET activation_required=1 WHERE role='wakil' AND must_change_password=1 AND activation_required=0",
  );
  for (const table of ["members", "member_requests"]) {
    const pk = table === "members" ? "member_id" : "request_id";
    const rows = (
      await client.execute(
        "SELECT " +
          pk +
          ",ic_number FROM " +
          table +
          " WHERE ic_number IS NOT NULL AND ic_number NOT LIKE 'enc:v1:%'",
      )
    ).rows;
    for (const row of rows)
      await client.execute({
        sql: "UPDATE " + table + " SET ic_number=? WHERE " + pk + "=?",
        args: [protectIC(String(row.ic_number)), row[pk]],
      });
  }
  const month = malaysiaMonth();
  await client.execute({
    sql: `INSERT OR IGNORE INTO contribution_policies SELECT ?,base_rate_per_member,payment_due_day,death_payout_amount,warded_payout_amount,'Polisi semasa ketika naik taraf; sejarah lama perlu disahkan.',? FROM settings WHERE id=1 AND NOT EXISTS (SELECT 1 FROM contribution_policies)`,
    args: [month, new Date().toISOString()],
  });
  await client.execute({
    sql: "UPDATE settings SET agreement_month=COALESCE(agreement_month,?) WHERE id=1",
    args: [month],
  });
}
