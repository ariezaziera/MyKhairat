"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import { Card, Button } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";
export function ScheduledHistory() {
  const [rows, setRows] = useState<
      { id: string; day: string; created_at: string; bytes: number }[]
    >([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [passphrase, setPassphrase] = useState("");
  useEffect(() => {
    api<typeof rows>("/api/backup/history")
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);
  async function download(id: string, day: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/backup/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, passphrase }),
      });
      if (!response.ok)
        throw new Error((await response.json()).error || "Muat turun gagal.");
      const url = URL.createObjectURL(await response.blob()),
        a = document.createElement("a");
      a.href = url;
      a.download = "mykhairat-backup-" + day + ".json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sambungan gagal.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <h2 className="text-xl font-semibold">Sandaran harian automatik</h2>
      <p className="mt-3 text-slate-600">
        Vercel menjadualkan backup sekitar2 pagi waktu Malaysia. Tujuh snapshot
        terbaru disimpan terenkripsi dalam Turso. Muat turun salinan di luar
        platform secara berkala; snapshot dalam database tidak melindungi
        kehilangan keseluruhan akaun/database.
      </p>
      <label className="mt-5">
        Passphrase untuk fail yang dimuat turun
        <PasswordInput
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          minLength={12}
        />
      </label>
      {error && (
        <p role="alert" className="mt-3 text-rose-700">
          {error}
        </p>
      )}
      {rows.map((r) => (
        <div
          key={r.id}
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
        >
          <p>
            {r.day} · {(r.bytes / 1024).toFixed(1)}KB
          </p>
          <Button
            variant="ghost"
            disabled={busy || passphrase.length < 12}
            onClick={() => void download(r.id, r.day)}
          >
            Muat turun
          </Button>
        </div>
      ))}
      {!rows.length && (
        <p className="mt-4 text-slate-600">
          Belum ada snapshot harian direkod. Backup manual boleh dimuat turun
          sekarang.
        </p>
      )}
    </Card>
  );
}
