import { redirect } from "next/navigation";
import { accountIsActive } from "./queries";
import { getSession } from "./session";

async function activeSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await accountIsActive(session.sub))) redirect("/api/auth/disabled");
  return session;
}

export async function requireAdminPage() {
  const session = await activeSession();
  if (session.role !== "admin") redirect("/app");
  return session;
}

export async function requireWakilPage() {
  const session = await activeSession();
  if (session.role !== "wakil" || !session.familyId) redirect("/admin");
  return session;
}
