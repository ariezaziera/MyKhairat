import { requireWakilPage } from "@/lib/page-auth";
import { getFamilyBundle } from "@/lib/queries";
import { PaymentForm } from "./payment-form";

export default async function PaymentPage() {
  const session = await requireWakilPage();
  const bundle = await getFamilyBundle(session.familyId!);
  const months = [...bundle.assessment.months].reverse().map((row) => ({
    month: row.month,
    state: row.state,
    outstanding: row.outstanding,
  }));
  return (
    <PaymentForm
      familyId={bundle.family.familyId}
      dues={bundle.assessment.monthlyDues}
      bankName={bundle.settings.bankName}
      bankAccountName={bundle.settings.bankAccountName}
      bankAccountNumber={bundle.settings.bankAccountNumber}
      paymentMethod={bundle.settings.paymentMethod}
      duitnowId={bundle.settings.duitnowId}
      hasDuitnowQr={bundle.settings.hasDuitnowQr}
      months={months}
      inactive={bundle.family.familyStatus === "Inactive"}
    />
  );
}
