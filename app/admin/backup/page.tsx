import { ScheduledHistory } from "./scheduled-history";
import { requireAdminPage } from "@/lib/page-auth";
import { PageHeading } from "@/components/page-heading";
import { BackupForm } from "./backup-form";
export default async function BackupPage() {
  await requireAdminPage("accounts");
  return (
    <div className="space-y-6">
      <PageHeading
        title="Sandaran terenkripsi"
        description="Simpan keluarga, akaun, transaksi, bukti dan audit dalam satu fail AES-256-GCM."
      />
      <BackupForm />
      <ScheduledHistory />
    </div>
  );
}
