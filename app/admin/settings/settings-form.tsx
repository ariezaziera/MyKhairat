"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Card } from "@/components/ui";
import { api } from "@/lib/client-api";
import { malaysiaMonth, shiftMonth } from "@/lib/dates";
type Settings = {
  baseRatePerMember: number;
  paymentDueDay: number;
  paymentMethod: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  deathPayoutAmount: number;
  wardedPayoutAmount: number;
  supportPhone?: string;
  bankVerified?: number;
};
const fields = [
  ["baseRatePerMember", "Caruman RM seorang"],
  ["paymentDueDay", "Hari akhir bayaran (1–28)"],
  ["deathPayoutAmount", "Bantuan kematian RM"],
  ["wardedPayoutAmount", "Bantuan wad kritikal RM"],
] as const;
export function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      await api("/api/settings", "PUT", {
        ...Object.fromEntries(f),
        ...Object.fromEntries(fields.map(([k]) => [k, Number(f.get(k))])),
      });
      setSaved(
        "Persetujuan baharu disimpan. Kadar bermula pada bulan dipilih; rekod caruman lama kekal. Butiran bank dan bantuan dikemaskini.",
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sambungan gagal.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        {error && (
          <p role="alert" className="text-rose-700 md:col-span-2">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="text-green-800 md:col-span-2">
            {saved}
          </p>
        )}
        {fields.map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              name={key}
              type="number"
              required
              min={key === "paymentDueDay" ? 1 : 0.01}
              max={key === "paymentDueDay" ? 28 : 100000}
              step={key === "paymentDueDay" ? 1 : 0.01}
              defaultValue={settings[key]}
            />
          </label>
        ))}
        <label>
          Bulan kuat kuasa
          <input
            name="effectiveMonth"
            type="month"
            min={shiftMonth(malaysiaMonth(), 1)}
            defaultValue={shiftMonth(malaysiaMonth(), 1)}
            required
          />
        </label>
        <label>
          Rujukan persetujuan keluarga
          <input
            name="agreementNote"
            required
            minLength={5}
            defaultValue="Persetujuan keluarga"
          />
        </label>
        {(
          [
            ["paymentMethod", "Kaedah bayaran"],
            ["bankName", "Bank"],
            ["bankAccountNumber", "Nombor akaun"],
            ["bankAccountName", "Nama penerima"],
            ["supportPhone", "Telefon bantuan AJK / WhatsApp"],
          ] as const
        ).map(([k, label]) => (
          <label key={k}>
            {label}
            <input
              name={k}
              defaultValue={settings[k] || ""}
              required={k !== "supportPhone"}
              type={k === "supportPhone" ? "tel" : "text"}
            />
          </label>
        ))}
        <label className="flex items-center gap-3 md:col-span-2">
          <input
            type="checkbox"
            name="bankVerified"
            defaultChecked={Boolean(settings.bankVerified)}
            className="!w-5 !p-0"
          />
          Saya telah mengesahkan akaun dan penerima dana. Paparkan arahan bank /
          QR kepada wakil.
        </label>
        <Button disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan persetujuan"}
        </Button>
      </form>
    </Card>
  );
}
