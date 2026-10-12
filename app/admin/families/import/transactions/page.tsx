import { requireAdminPage } from "@/lib/page-auth";
import { PageHeading } from "@/components/page-heading";
import { TransactionImport } from "./transaction-import";
export default async function TransactionPage() {
  await requireAdminPage("settings");
  return (
    <div className="space-y-6">
      <PageHeading
        title="Import bayaran sejarah"
        description="Masukkan transaksi sebenar sejak2025 dengan jumlah batch yang disahkan AJK."
      />
      <TransactionImport />
    </div>
  );
}
