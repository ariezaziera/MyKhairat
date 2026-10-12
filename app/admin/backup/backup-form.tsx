"use client";
import { useState, type FormEvent } from "react";
import { PasswordInput } from "@/components/password-input";
import { Card, Button } from "@/components/ui";
export function BackupForm() {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const f = new FormData(e.currentTarget),
        r = await fetch("/api/backup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ passphrase: f.get("passphrase") }),
        });
      if (!r.ok) throw new Error((await r.json()).error || "Eksport gagal.");
      const url = URL.createObjectURL(await r.blob()),
        a = document.createElement("a");
      a.href = url;
      a.download =
        "mykhairat-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      a.click();
      URL.revokeObjectURL(url);
      setMessage(
        "Backup dimuat turun. Simpan passphrase di tempat berasingan.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Sambungan gagal.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <form onSubmit={submit} className="max-w-lg space-y-4">
        <label htmlFor="backup-pass">
          Passphrase backup (sekurang-kurangnya 12 aksara)
        </label>
        <PasswordInput
          id="backup-pass"
          name="passphrase"
          minLength={12}
          maxLength={200}
          required
          autoComplete="new-password"
        />
        <p className="text-slate-600">
          Passphrase tidak disimpan. Fail ini mengandungi data keluarga dan hash
          akaun; simpan dengan selamat.
        </p>
        <Button disabled={busy}>
          {busy ? "Menjana…" : "Muat turun sandaran"}
        </Button>
        {message && <p role="status">{message}</p>}
      </form>
      <div className="mt-6 border-t border-slate-200 pt-5 text-slate-600">
        <h2 className="font-semibold text-slate-900">Pemulihan</h2>
        <p className="mt-2">
          Gunakan skrip pemulihan ke database baharu yang kosong. Arahan
          terdapat dalam OPERATIONS.md. Sahkan rekod dan bukti sebelum menukar
          sambungan production.
        </p>
      </div>
    </Card>
  );
}
