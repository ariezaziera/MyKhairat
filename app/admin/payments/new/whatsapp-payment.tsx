"use client";
import { useState } from "react";
import { Card } from "@/components/ui";
import { ManualPayment } from "@/app/admin/families/[id]/manual-payment";
import { api } from "@/lib/client-api";
import type { FamilyBundle } from "@/lib/queries";
export function WhatsAppPayment({
  families,
}: {
  families: { id: string; name: string }[];
}) {
  const [family, setFamily] = useState<FamilyBundle | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState("");
  async function select(id: string) {
    setFamily(null);
    setError("");
    if (!id) return;
    setBusy(true);
    try {
      setFamily(await api<FamilyBundle>("/api/families/" + id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sambungan gagal.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <Card>
        <label htmlFor="family-search">Cari nama atau ID keluarga</label>
        <input
          id="family-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Contoh: Siti / K001"
        />
        <label className="mt-4" htmlFor="payment-family">
          Keluarga
        </label>
        <select
          id="payment-family"
          disabled={busy}
          onChange={(e) => void select(e.target.value)}
          defaultValue=""
        >
          <option value="">Pilih keluarga…</option>
          {families
            .filter((f) =>
              (f.id + " " + f.name).toLowerCase().includes(query.toLowerCase()),
            )
            .map((f) => (
              <option key={f.id} value={f.id}>
                {f.id} · {f.name}
              </option>
            ))}
        </select>
      </Card>
      {busy && <p role="status">Membaca rekod keluarga…</p>}
      {error && (
        <p role="alert" className="text-rose-700">
          {error}
        </p>
      )}
      {family && (
        <ManualPayment
          key={family.family.familyId}
          familyId={family.family.familyId}
          months={[...family.assessment.months].reverse()}
          suggested={family.assessment.monthlyDues}
        />
      )}
    </div>
  );
}
