import { requireAdminPage } from "@/lib/page-auth";
import { listDirectory } from "@/lib/queries";
import { WhatsAppPayment } from "./whatsapp-payment";
import { PageHeading } from "@/components/page-heading";
export default async function PaymentDesk() {
  await requireAdminPage("payments");
  const families = await listDirectory();
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Aliran utama"
        title="Rekod resit WhatsApp"
        description="Pilih keluarga, masukkan butiran transaksi dan upload resit yang wakil hantar. AJK menyemak sebelum dikira sebagai kutipan."
      />
      <WhatsAppPayment
        families={families.map((f) => ({ id: f.familyId, name: f.wakilName }))}
      />
    </div>
  );
}
