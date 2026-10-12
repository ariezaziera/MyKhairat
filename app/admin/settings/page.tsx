import { requireAdminPage } from "@/lib/page-auth";
import { getClient } from "@/lib/db";
import { formatRM } from "@/lib/format";
import { HistoryPolicy } from "./history-policy";
import { getSettings } from "@/lib/queries";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  await requireAdminPage("settings");
  const settings = await getSettings();
  const policies = (
    await getClient().execute(
      "SELECT * FROM contribution_policies ORDER BY effective_month DESC",
    )
  ).rows;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold">Persetujuan keluarga</h1>
        <p className="text-sm text-slate-500">
          Caruman seorang, manfaat bantuan dan tarikh kuat kuasa. Perubahan ahli
          atau kadar tidak menulis semula assessment lama.
        </p>
      </div>
      <SettingsForm settings={settings} />
      <HistoryPolicy />
      <section className="surface-panel p-5">
        <h2 className="text-xl font-semibold">Sejarah persetujuan</h2>
        {policies.map((p) => (
          <p key={String(p.effective_month)} className="mt-3">
            {String(p.effective_month)} · {formatRM(Number(p.rate))} seorang ·{" "}
            {String(p.note)}
          </p>
        ))}
      </section>
    </div>
  );
}
