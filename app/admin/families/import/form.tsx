"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, Card } from "@/components/ui";
import {
  detectMapping,
  groupImportRows,
  type ImportMapping,
} from "@/lib/family-import";
type Sheet = {
  name: string;
  headers: string[];
  rows: string[][];
  mapping: ImportMapping;
};
export function ImportForm() {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [mapping, setMapping] = useState<ImportMapping>(detectMapping([]));
  const [joinedMonth, setJoinedMonth] = useState("2025-01");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [accounts, setAccounts] = useState<
    {
      familyId: string;
      name: string;
      username: string;
      activationCode?: string;
    }[]
  >([]);
  const sheet = sheets[sheetIndex];
  const preview = useMemo(
    () => groupImportRows(sheet?.rows ?? [], mapping),
    [sheet, mapping],
  );
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    setAccounts([]);
    setSheets([]);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/import/families/preview", {
        method: "POST",
        body,
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error);
        return;
      }
      setSheets(data.sheets);
      setSheetIndex(0);
      setMapping(data.sheets[0].mapping);
    } catch {
      setError("Tidak dapat membaca fail. Cuba lagi.");
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/import/families", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinedMonth, families: preview.families }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error);
        return;
      }
      setAccounts(data.accounts);
      setSheets([]);
    } catch {
      setError("Sambungan terputus. Semak Directory sebelum mengulang import.");
    } finally {
      setBusy(false);
    }
  }
  function download() {
    const escape = (value: string) =>
      `"${(/^[=+@-]/.test(value) ? "'" : "") + value.replace(/"/g, '""')}"`;
    const csv =
      "Family ID,Nama wakil,Username,Password awal,Kod pengaktifan\r\n" +
      accounts
        .map((a) =>
          [a.familyId, a.name, a.username, "mykhairat", a.activationCode || ""]
            .map(escape)
            .join(","),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "akaun-wakil.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-semibold">Import keluarga dari Excel</h1>
      <div className="flex flex-wrap gap-3 text-sm font-semibold text-blue-800">
        <span>1 · Upload</span>
        <span>2 · Pemetaan</span>
        <span>3 · Preview & sahkan</span>
        <span>4 · Akaun</span>
      </div>
      <Link
        href="/admin/families/import/transactions"
        className="secondary-link"
      >
        Import bayaran sejarah →
      </Link>
      <p className="text-slate-600">
        Fail .xlsx atau CSV, bawah 3MB. Satu baris setiap ahli, atau kolum Ahli
        1, Ahli 2 dan seterusnya. Nama wakil yang kosong mengikuti wakil pada
        baris sebelumnya.
      </p>
      <Card>
        <label htmlFor="file">
          Upload senarai wakil dan ahli (gunakan Family ID / ID Ahli untuk nama
          sama)
        </label>
        <input
          id="file"
          type="file"
          accept=".xlsx,.csv"
          disabled={busy}
          onChange={(e) => void upload(e.target.files?.[0])}
        />
        <p className="mt-3 text-sm text-slate-500">
          Contoh kolum: Nama Wakil, Telefon, Nama Ahli, Hubungan, No IC. Wakil
          turut dikira sebagai ahli sekali sahaja.
        </p>
      </Card>
      {error && (
        <p role="alert" className="rounded-2xl bg-rose-50 p-3 text-rose-700">
          {error}
        </p>
      )}
      {busy && <p role="status">Sedang memproses…</p>}
      {sheet && (
        <>
          <Card className="grid gap-4 sm:grid-cols-2">
            <label>
              Sheet
              <select
                value={sheetIndex}
                onChange={(e) => {
                  const i = Number(e.target.value);
                  setSheetIndex(i);
                  setMapping(sheets[i].mapping);
                }}
              >
                {sheets.map((s, i) => (
                  <option key={i} value={i}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Bulan mula caruman
              <input
                type="month"
                value={joinedMonth}
                onChange={(e) => setJoinedMonth(e.target.value)}
                required
              />
              <span className="text-xs text-slate-500">
                Semak bulan sebenar. Rekod bayaran lama perlu dimasukkan
                berasingan; tanpa rekod bayaran, bulan lama akan dianggap
                tertunggak.
              </span>
            </label>
            {(
              [
                ["wakil", "Nama wakil (wajib)"],
                ["phone", "Telefon"],
                ["member", "Nama ahli"],
                ["relationship", "Hubungan"],
                ["ic", "No IC"],
                ["familyKey", "Family ID asal"],
                ["memberKey", "ID Ahli asal"],
                ["joined", "Bulan mula per keluarga"],
                ["status", "Status ahli"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <select
                  value={mapping[key] ?? -1}
                  onChange={(e) =>
                    setMapping({ ...mapping, [key]: Number(e.target.value) })
                  }
                >
                  <option value={-1}>Tidak dipilih</option>
                  {sheet.headers.map((header, i) => (
                    <option key={i} value={i}>
                      {header || `Kolum ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <fieldset>
              <legend className="text-sm font-medium">
                Kolum ahli tambahan
              </legend>
              {sheet.headers.map((header, i) => (
                <label key={i} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-auto"
                    checked={mapping.extraMembers.includes(i)}
                    onChange={(e) =>
                      setMapping({
                        ...mapping,
                        extraMembers: e.target.checked
                          ? [...mapping.extraMembers, i]
                          : mapping.extraMembers.filter((col) => col !== i),
                      })
                    }
                  />
                  {header || `Kolum ${i + 1}`}
                </label>
              ))}
            </fieldset>
          </Card>
          <h2 className="text-xl font-semibold">
            Preview: {preview.families.length} keluarga ·{" "}
            {preview.families.reduce((n, f) => n + f.members.length, 0)} ahli
          </h2>
          {preview.errors.map((message, i) => (
            <p key={i} className="text-rose-600">
              {message}
            </p>
          ))}
          <div className="grid gap-3 md:grid-cols-2">
            {preview.families.map((family, i) => (
              <Card key={i}>
                <h3 className="font-semibold">{family.wakilName}</h3>
                <p className="text-sm">
                  {family.phone || "Telefon belum diisi"}
                </p>
                <ul className="mt-2 text-sm">
                  {family.members.map((m, j) => (
                    <li key={j}>
                      {m.name} · {m.relationship}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
          <p>
            Kod pengaktifan per wakil akan dijana dan sah selama7 hari. Password
            awal semua wakil: <strong>mykhairat</strong>. Wajib tukar selepas
            login. Username sebenar akan dipaparkan selepas import.
          </p>
          <Button
            disabled={
              busy ||
              mapping.wakil < 0 ||
              !preview.families.length ||
              Boolean(preview.errors.length) ||
              !joinedMonth
            }
            onClick={() => void save()}
          >
            Sahkan dan import {preview.families.length} keluarga
          </Button>
        </>
      )}
      {accounts.length > 0 && (
        <Card>
          <h2 className="text-xl font-semibold">Import berjaya</h2>
          <p>Password awal: mykhairat. Wajib tukar semasa login pertama.</p>
          <ul className="my-4">
            {accounts.map((a) => (
              <li key={a.familyId}>
                {a.name} → <strong>{a.username}</strong> ({a.familyId}) · Kod{" "}
                <strong className="font-mono">{a.activationCode}</strong>
              </li>
            ))}
          </ul>
          <p className="mb-4 text-slate-600">
            Berikan kod hanya kepada wakil sebenar. Admin boleh menjana kod
            baharu dalam Akaun & kuasa.
          </p>
          <Button onClick={download}>Download senarai akaun</Button>
        </Card>
      )}
    </div>
  );
}
