"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button } from "@/components/ui";
import { api } from "@/lib/client-api";
import { formatMonth, formatRM } from "@/lib/format";
import type { BillingSnapshot } from "@/lib/finance";
import { useAdminPermission } from "@/components/admin-permissions";
export function AssessmentBoard({
  familyId,
  snapshots,
}: {
  familyId: string;
  snapshots: BillingSnapshot[];
}) {
  const router = useRouter(),
    allowed = useAdminPermission("settings"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  return (
    <Card>
      <details open={snapshots.some((r) => !r.confirmed)}>
        <summary className="cursor-pointer text-xl font-semibold">
          Caruman bulanan & pengesahan sejarah
        </summary>
        <p className="mt-3 text-slate-600">
          Kiraan lama belum disahkan tidak digunakan untuk menggantung keluarga.
          Sahkan jumlah dengan rekod asal; jangan anggap bilangan ahli hari ini
          ialah bilangan ahli tahun 2025.
        </p>
        {error && (
          <p role="alert" className="mt-3 text-rose-700">
            {error}
          </p>
        )}
        <div className="mt-5 space-y-3">
          {snapshots.map((r) => (
            <div
              key={r.month}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="flex flex-wrap justify-between gap-3">
                <strong>
                  {formatMonth(r.month)} · {formatRM(r.expected)}
                </strong>
                <span
                  className={r.confirmed ? "text-green-800" : "text-amber-900"}
                >
                  {r.confirmed ? "Disahkan" : "Perlu semakan"}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {r.activeCount} orang · RM {r.rate.toFixed(2)} · {r.source}
              </p>
              {allowed && (
                <details className="mt-3">
                  <summary className="cursor-pointer font-medium text-blue-800">
                    {r.confirmed
                      ? "Pelarasan dengan alasan"
                      : "Sahkan rekod bulan"}
                  </summary>
                  <form
                    className="mt-3 grid gap-3 sm:grid-cols-3"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      setBusy(r.month);
                      try {
                        await api("/api/assessments", "POST", {
                          familyId,
                          month: r.month,
                          expected: Number(f.get("expected")),
                          count: Number(f.get("count")),
                          reason: f.get("reason"),
                        });
                        router.refresh();
                      } catch (e) {
                        setError(
                          e instanceof Error ? e.message : "Sambungan gagal.",
                        );
                      } finally {
                        setBusy("");
                      }
                    }}
                  >
                    <label>
                      Jumlah caruman RM
                      <input
                        name="expected"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={r.expected}
                        required
                      />
                    </label>
                    <label>
                      Bilangan ahli ketika itu
                      <input
                        name="count"
                        type="number"
                        min="0"
                        defaultValue={r.activeCount}
                        required
                      />
                    </label>
                    <label>
                      Alasan / sumber
                      <input name="reason" minLength={5} required />
                    </label>
                    <Button disabled={busy === r.month}>
                      {busy === r.month ? "Menyimpan…" : "Sahkan caruman"}
                    </Button>
                  </form>
                </details>
              )}
            </div>
          ))}
        </div>
      </details>
    </Card>
  );
}
