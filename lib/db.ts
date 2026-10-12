import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { MIGRATION_STATEMENTS } from "./migrate";
import { migrateLegacySettings } from "./migrate-settings";
import * as schema from "./schema";
import { settings } from "./schema";
import { nowIso } from "./format";
import { upgradeSystem } from "./upgrades";
import { uniqueUsername } from "./usernames";

const globalForDb = globalThis as unknown as {
  client?: Client;
  db?: LibSQLDatabase<typeof schema>;
};

export function getClient() {
  if (!globalForDb.client) {
    const url = process.env.TURSO_DATABASE_URL || "file:local.db";
    const authToken = process.env.TURSO_AUTH_TOKEN;
    globalForDb.client = createClient(authToken ? { url, authToken } : { url });
  }
  return globalForDb.client;
}

export function getDb() {
  if (!globalForDb.db) {
    globalForDb.db = drizzle(getClient(), { schema });
  }
  return globalForDb.db;
}

async function addColumn(
  client: Client,
  table: string,
  column: string,
  definition: string,
) {
  const info = await client.execute(`PRAGMA table_info(${table})`);
  const names = info.rows.map((row) => String(row.name));
  if (!names.includes(column)) {
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

let ready: Promise<void> | null = null;

export function ensureSchema() {
  if (!ready) {
    ready = (async () => {
      const client = getClient();
      await client.execute("PRAGMA foreign_keys = ON");
      await migrateLegacySettings(client);
      for (const statement of MIGRATION_STATEMENTS) {
        await client.execute(statement);
      }
      await addColumn(client, "settings", "duitnow_id", "TEXT");
      await addColumn(client, "settings", "duitnow_content_type", "TEXT");
      await addColumn(client, "settings", "duitnow_qr", "TEXT");
      await addColumn(client, "users", "active", "INTEGER NOT NULL DEFAULT 1");
      await addColumn(client, "users", "username", "TEXT");
      await addColumn(
        client,
        "users",
        "must_change_password",
        "INTEGER NOT NULL DEFAULT 0",
      );
      await addColumn(
        client,
        "users",
        "session_version",
        "INTEGER NOT NULL DEFAULT 0",
      );
      await client.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username COLLATE NOCASE)",
      );
      const accounts = await client.execute(
        "SELECT id, name, username FROM users ORDER BY created_at, id",
      );
      const occupied = new Set(
        accounts.rows
          .filter((row) => row.username)
          .map((row) => String(row.username).toLowerCase()),
      );
      for (const row of accounts.rows) {
        if (!row.username)
          await client.execute({
            sql: "UPDATE users SET username = ? WHERE id = ? AND username IS NULL",
            args: [uniqueUsername(String(row.name), occupied), row.id],
          });
      }
      await addColumn(client, "payments", "entry_note", "TEXT");
      await addColumn(
        client,
        "settings",
        "death_payout_amount",
        "REAL NOT NULL DEFAULT 2000",
      );
      await addColumn(
        client,
        "settings",
        "warded_payout_amount",
        "REAL NOT NULL DEFAULT 200",
      );
      await addColumn(
        client,
        "claims",
        "claim_type",
        "TEXT NOT NULL DEFAULT 'Death'",
      );
      await addColumn(
        client,
        "settings",
        "support_phone",
        "TEXT NOT NULL DEFAULT ''",
      );
      await addColumn(client, "settings", "agreement_month", "TEXT");
      await addColumn(
        client,
        "settings",
        "bank_verified",
        "INTEGER NOT NULL DEFAULT 0",
      );
      const db = getDb();
      const existing = await db
        .select()
        .from(settings)
        .where(eq(settings.id, 1));
      if (!existing.length) {
        await db.insert(settings).values({
          id: 1,
          baseRatePerMember: 5,
          paymentDueDay: 7,
          paymentMethod: "DuitNow QR / Bank Transfer",
          bankName: "Maybank",
          bankAccountNumber: "512345678901",
          bankAccountName: "Tabung Khairat Kematian",
          updatedAt: nowIso(),
        });
      }
      await upgradeSystem(client);
    })().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}
