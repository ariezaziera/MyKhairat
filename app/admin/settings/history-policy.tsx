"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client-api";
import { Button, Card } from "@/components/ui";
import { malaysiaMonth, shiftMonth } from "@/lib/dates";
export function HistoryPolicy() {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <Card>
      <details>
        <summary className="cursor-pointer text-lg font-semibold">
          Sahkan persetujuan lama (2025 dan seterusnya)
        </summary>
        <p className="mt-4 text-slate-600">
          Digunakan untuk menilai tuntutan pada tarikh lama. Ia tidak mengubah
          snapshot caruman sedia ada; sahkan assessment bulan secara berasingan.
        </p>
        <form
          className="mt-5 grid gap-4 md:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            try {
              await api("/api/policies", "POST", {
                month: f.get("month"),
                rate: Number(f.get("rate")),
                dueDay: Number(f.get("dueDay")),
                death: Number(f.get("death")),
                warded: Number(f.get("warded")),
                note: f.get("note"),
              });
              setMessage("Polisi sejarah disahkan.");
              router.refresh();
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Sambungan gagal.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Bulan bermula
            <input
              name="month"
              type="month"
              max={shiftMonth(malaysiaMonth(), -1)}
              required
            />
          </label>
          <label>
            RM seorang
            <input name="rate" type="number" step="0.01" min="0.01" required />
          </label>
          <label>
            Hari akhir bayaran
            <input name="dueDay" type="number" min="1" max="28" required />
          </label>
          <label>
            Bantuan kematian RM
            <input name="death" type="number" min="0.01" step="0.01" required />
          </label>
          <label>
            Bantuan wad RM
            <input
              name="warded"
              type="number"
              min="0.01"
              step="0.01"
              required
            />
          </label>
          <label>
            Sumber / rujukan mesyuarat
            <input name="note" minLength={10} required />
          </label>
          <Button disabled={busy}>
            {busy ? "Menyimpan…" : "Sahkan polisi lama"}
          </Button>
          {message && <p role="status">{message}</p>}
        </form>
      </details>
    </Card>
  );
}
