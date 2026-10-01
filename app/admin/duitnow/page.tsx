import { requireAdminPage } from "@/lib/page-auth";
import { getSettings } from "@/lib/queries";
import { DuitnowForm } from "./duitnow-form";

export default async function DuitnowPage() {
  await requireAdminPage();
  const settings = await getSettings();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold">DuitNow QR</h1>
        <p className="text-sm text-slate-500">Upload the fund’s DuitNow QR. Wakil families see it on Home and Submit Payment, then upload their receipt for review.</p>
      </div>
      <DuitnowForm duitnowId={settings.duitnowId ?? ""} hasImage={settings.hasDuitnowQr} />
    </div>
  );
}
