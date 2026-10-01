import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { MIGRATION_STATEMENTS } from "./migrate";
import * as schema from "./schema";
import { settings } from "./schema";
import { nowIso } from "./format";

const globalForDb = globalThis as unknown as { client?: Client; db?: LibSQLDatabase<typeof schema> };

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

async function addColumn(client: Client, table: string, column: string, definition: string) {
  const info = await client.execute(`PRAGMA table_info(${table})`);
  const names = info.rows.map((row) => String(row.name));
  if (!names.includes(column)) {
    await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

let ready: Promise<void> | null = null;

export function ensureSchema() {
  if (!ready) {
    ready = (async () => {
      const client = getClient();
      await client.execute("PRAGMA foreign_keys = ON");
      for (const statement of MIGRATION_STATEMENTS) {
        await client.execute(statement);
      }
      await addColumn(client, "settings", "duitnow_id", "TEXT");
      await addColumn(client, "settings", "duitnow_content_type", "TEXT");
      await addColumn(client, "settings", "duitnow_qr", "TEXT");
      await addColumn(client, "users", "active", "INTEGER NOT NULL DEFAULT 1");
      await addColumn(client, "payments", "entry_note", "TEXT");
      await addColumn(client, "settings", "death_payout_amount", "REAL NOT NULL DEFAULT 2000");
      await addColumn(client, "settings", "warded_payout_amount", "REAL NOT NULL DEFAULT 200");
      await addColumn(client, "claims", "claim_type", "TEXT NOT NULL DEFAULT 'Death'");
      const db = getDb();
      const existing = await db.select().from(settings).where(eq(settings.id, 1));
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
    })().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}
