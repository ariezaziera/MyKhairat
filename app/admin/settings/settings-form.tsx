"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui";

type Settings = {
  baseRatePerMember: number;
  paymentDueDay: number;
  paymentMethod: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  deathPayoutAmount: number;
  wardedPayoutAmount: number;
};

export function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setSaved(false);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseRatePerMember: Number(form.get("baseRatePerMember")),
        paymentDueDay: Number(form.get("paymentDueDay")),
        paymentMethod: form.get("paymentMethod"),
        bankName: form.get("bankName"),
        bankAccountNumber: form.get("bankAccountNumber"),
        bankAccountName: form.get("bankAccountName"),
        deathPayoutAmount: Number(form.get("deathPayoutAmount")),
        wardedPayoutAmount: Number(form.get("wardedPayoutAmount")),
      }),
    });
    const data = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(data.error || "Could not save settings.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-4xl gap-4 rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-200 sm:grid-cols-2">
      {error ? <p className="text-sm text-rose-600 sm:col-span-2">{error}</p> : null}
      {saved ? <p className="text-sm text-emerald-700 sm:col-span-2">Changes saved. Family dues and suspension status were recalculated.</p> : null}
      <div>
        <label htmlFor="baseRatePerMember">RM per head</label>
        <input id="baseRatePerMember" name="baseRatePerMember" type="number" min="0.01" step="0.01" required defaultValue={settings.baseRatePerMember} />
        <p className="mt-1 text-xs text-slate-500">Each family’s monthly payment is this amount times its Aktif members.</p>
      </div>
      <div>
        <label htmlFor="paymentDueDay">Payment Due Day</label>
        <input id="paymentDueDay" name="paymentDueDay" type="number" min="1" max="28" required defaultValue={settings.paymentDueDay} />
      </div>
      <div>
        <label htmlFor="deathPayoutAmount">Khairat kematian lump sum</label>
        <input id="deathPayoutAmount" name="deathPayoutAmount" type="number" min="0.01" step="0.01" required defaultValue={settings.deathPayoutAmount} />
      </div>
      <div>
        <label htmlFor="wardedPayoutAmount">Masuk wad lump sum</label>
        <input id="wardedPayoutAmount" name="wardedPayoutAmount" type="number" min="0.01" step="0.01" required defaultValue={settings.wardedPayoutAmount} />
        <p className="mt-1 text-xs text-slate-500">Critical admission only. Change these when the family agrees a new figure.</p>
      </div>
      <div>
        <label htmlFor="paymentMethod">Payment Method</label>
        <input id="paymentMethod" name="paymentMethod" required defaultValue={settings.paymentMethod} />
      </div>
      <div>
        <label htmlFor="bankName">Bank name</label>
        <input id="bankName" name="bankName" required defaultValue={settings.bankName} />
      </div>
      <div>
        <label htmlFor="bankAccountNumber">Bank Account Number</label>
        <input id="bankAccountNumber" name="bankAccountNumber" required defaultValue={settings.bankAccountNumber} />
      </div>
      <div>
        <label htmlFor="bankAccountName">Account name</label>
        <input id="bankAccountName" name="bankAccountName" required defaultValue={settings.bankAccountName} />
      </div>
      <Button type="submit" className="sm:col-span-2 sm:w-fit" disabled={pending}>
        {pending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
