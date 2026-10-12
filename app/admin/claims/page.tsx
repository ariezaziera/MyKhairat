import { requireAdminPage } from "@/lib/page-auth";
import { getClient } from "@/lib/db";
import { PageHeading } from "@/components/page-heading";
import { ClaimsBoard } from "./claims-board";
export default async function ClaimsPage() {
  await requireAdminPage();
  const rows = await getClient().execute(
    "SELECT c.*,m.member_name,f.wakil_name FROM claims c JOIN members m ON m.member_id=c.member_id JOIN families f ON f.family_id=c.family_id ORDER BY c.created_at DESC LIMIT 500",
  );
  return (
    <div className="space-y-6">
      <PageHeading
        title="Tuntutan bantuan"
        description="Diterima → Disemak → Diluluskan → Dibayar. Tuntutan baharu dimasukkan dari halaman keluarga."
      />
      <ClaimsBoard
        claims={
          rows.rows.map((r) => ({ ...r })) as unknown as Record<
            string,
            string | number | null
          >[]
        }
      />
    </div>
  );
}
