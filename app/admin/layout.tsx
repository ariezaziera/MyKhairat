import { AdminPermissions } from "@/components/admin-permissions";
import { AdminShell } from "@/components/shells";
import { requireAdminPage } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdminPage();
  return (
    <AdminPermissions profile={session.accessProfile ?? "owner"}>
      <AdminShell name={session.name} accessProfile={session.accessProfile}>
        {children}
      </AdminShell>
    </AdminPermissions>
  );
}
