import { AdminShell } from "@/components/shells";
import { requireAdminPage } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminPage();
  return <AdminShell name={session.name}>{children}</AdminShell>;
}
