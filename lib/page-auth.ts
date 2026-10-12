import { can, type Permission } from "./permissions";
import { redirect } from "next/navigation";
import { accountIsActive } from "./queries";
import { getSession } from "./session";
import { requireSession } from "./guard";

async function activeSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await accountIsActive(session.sub))) redirect("/api/auth/disabled");
  let verified;
  try {
    verified = await requireSession(true);
  } catch {
    redirect("/login");
  }
  if (verified.mustChangePassword) redirect("/change-password");
  return verified;
}

export async function requireAdminPage(permission: Permission = "read") {
  const session = await activeSession();
  if (session.role !== "admin") redirect("/app");
  if (!can(session.accessProfile, permission)) redirect("/admin");
  return session;
}

export async function requireWakilPage() {
  const session = await activeSession();
  if (session.role !== "wakil" || !session.familyId) redirect("/admin");
  return session;
}
