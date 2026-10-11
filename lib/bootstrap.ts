import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { ensureSchema, getDb } from "./db";
import { hashPassword } from "./passwords";
import { users } from "./schema";
import { seedIfEmpty } from "./seed-data";

let boot: Promise<void> | null = null;

function shouldSeed() {
  return process.env.NODE_ENV !== "production" || process.env.SEED_DEMO === "true";
}

export function bootstrap() {
  if (process.env.NEXT_PHASE === "phase-production-build") return Promise.resolve();
  if (!boot) {
    boot = (async () => {
      await ensureSchema();
      const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
      const password = process.env.INITIAL_ADMIN_PASSWORD;
      if (email && password) {
        const db = getDb();
        const existing = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${email}`);
        if (!existing.length) {
          await db.insert(users).values({
            id: randomUUID(), email, passwordHash: hashPassword(password),
            name: "AJK Admin", role: "admin", familyId: null,
            phone: null, active: 1, createdAt: new Date().toISOString(),
          }).onConflictDoNothing();
        }
      }
      if (shouldSeed()) await seedIfEmpty();
    })().catch((error) => {
      boot = null;
      throw error;
    });
  }
  return boot;
}
