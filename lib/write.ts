import { randomUUID } from "crypto";
import type { Transaction } from "@libsql/client";
import { getClient } from "./db";
import type { Session } from "./auth-token";
export async function auditWrite(
  tx: Transaction,
  actor: Pick<Session, "sub" | "name"> | undefined,
  action: string,
  detail: unknown,
) {
  await tx.execute({
    sql: "INSERT INTO activity_log(id,actor_id,actor_name,action,detail,created_at) VALUES(?,?,?,?,?,?)",
    args: [
      randomUUID(),
      actor?.sub ?? null,
      actor?.name ?? "Sistem",
      action,
      typeof detail === "string" ? detail : JSON.stringify(detail),
      new Date().toISOString(),
    ],
  });
}
export async function write<T>(operation: (tx: Transaction) => Promise<T>) {
  const tx = await getClient().transaction("write");
  try {
    const result = await operation(tx);
    await tx.commit();
    return result;
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally {
    tx.close();
  }
}
