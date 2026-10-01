import { ensureSchema } from "../lib/db";
import { seedIfEmpty } from "../lib/seed-data";

async function main() {
  await ensureSchema();
  const result = await seedIfEmpty();
  console.log(result.seeded ? "Demo data seeded." : "Users already exist. Seed skipped.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
