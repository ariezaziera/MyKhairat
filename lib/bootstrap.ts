import { ensureSchema } from "./db";
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
      if (shouldSeed()) await seedIfEmpty();
    })().catch((error) => {
      boot = null;
      throw error;
    });
  }
  return boot;
}
