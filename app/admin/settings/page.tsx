import { getSettings } from "@/lib/queries";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="text-sm text-slate-500">The family agreement: RM per head, the death lump sum, and the warded lump sum. Changing them does not rewrite payments or claims already recorded.</p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}
