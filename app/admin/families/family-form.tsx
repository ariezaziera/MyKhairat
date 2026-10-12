"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client-api";
import { Button, Card } from "@/components/ui";
import { malaysiaMonth } from "@/lib/dates";
type Initial = {
  familyName?: string;
  familyId: string;
  wakilName: string;
  wakilPhone: string;
  email: string;
  familyStatus: string;
  joinedMonth: string;
  openingBalance: number;
  notes: string;
};
export function FamilyForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [created, setCreated] = useState<{
      id: string;
      username: string;
      code: string;
    } | null>(null);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const data = await api<{
        family: { familyId: string; username: string };
        activationCode?: string;
      }>(
        initial ? "/api/families/" + initial.familyId : "/api/families",
        initial ? "PUT" : "POST",
        {
          ...Object.fromEntries(f),
          openingBalance: Number(f.get("openingBalance") || 0),
        },
      );
      if (!initial) {
        setCreated({
          id: data.family.familyId,
          username: data.family.username,
          code: data.activationCode || "",
        });
      } else router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sambungan gagal.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      {created ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Keluarga disediakan</h2>
          <p>
            Username: <strong>{created.username}</strong> · Password awal:
            mykhairat
          </p>
          <p>
            Kod pengaktifan:{" "}
            <strong className="select-all font-mono">{created.code}</strong>
          </p>
          <p className="text-slate-600">
            Berikan kod hanya kepada wakil sebenar. Sah7 hari. Wakil dikira
            sebagai ahli sekali; tambah ahli keluarga yang lain selepas ini.
          </p>
          <Link href={"/admin/families/" + created.id} className="action-link">
            Buka keluarga dan tambah ahli
          </Link>
        </div>
      ) : (
        <form onSubmit={save} className="space-y-5">
          {error && (
            <p role="alert" className="text-rose-700">
              {error}
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <label>Nama keluarga (pilihan)<input name="familyName" maxLength={160} defaultValue={initial?.familyName}/></label>
            <label>
              Nama wakil
              <input
                name="wakilName"
                required
                minLength={2}
                defaultValue={initial?.wakilName}
              />
            </label>
            <label>
              Telefon (jika tersedia)
              <input
                name="wakilPhone"
                type="tel"
                minLength={8}
                defaultValue={initial?.wakilPhone}
              />
            </label>
            <label>
              Email wakil (pilihan)
              <input
                name="email"
                type="email"
                defaultValue={
                  initial?.email.endsWith("@wakil.invalid")
                    ? ""
                    : initial?.email
                }
              />
            </label>
            <label>
              Bulan menyertai
              <input
                name="joinedMonth"
                type="month"
                max={malaysiaMonth()}
                required
                readOnly={Boolean(initial)}
                defaultValue={initial?.joinedMonth || malaysiaMonth()}
              />
              <span className="mt-1 block text-sm text-slate-600">
                Tarikh asal keahlian, termasuk tahun2025. Sejarah lama perlu
                disahkan.
              </span>
            </label>
            <label>
              Baki asal keluarga (+ hutang / − kredit)
              <input
                name="openingBalance"
                type="number"
                step="0.01"
                defaultValue={initial?.openingBalance || 0}
              />
              <span className="mt-1 block text-sm text-slate-600">
                Jangan masukkan hutang bulan yang turut dikira dalam sejarah.
                Gunakan tarikh mula kiraan jika mengambil baki cutover.
              </span>
            </label>
            {!initial && (
              <label>
                Bulan mula kiraan dalam sistem (pilihan)
                <input
                  name="billingStartMonth"
                  type="month"
                  max={malaysiaMonth()}
                />
                <span className="mt-1 block text-sm text-slate-600">
                  Jika menggunakan baki cutover, mula kira selepas bulan yang
                  termasuk dalam baki asal.
                </span>
              </label>
            )}
            <label>
              Status
              <select
                name="familyStatus"
                defaultValue={initial?.familyStatus || "Active"}
              >
                <option value="Active">Aktif</option>
                <option value="Suspended">
                  Digantung (dikira daripada tunggakan disahkan)
                </option>
                <option value="Inactive">Tidak aktif</option>
              </select>
            </label>
          </div>
          <label>
            Catatan / sebab pelarasan
            <textarea
              name="notes"
              rows={3}
              maxLength={500}
              defaultValue={initial?.notes}
            />
          </label>
          <p className="text-sm text-slate-600">
            Akses wakil disediakan secara automatik. Portal pilihan; resit boleh
            terus dihantar melalui WhatsApp. Reset password dibuat dalam Akaun &
            kuasa.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button disabled={busy}>
              {busy
                ? "Menyimpan…"
                : initial
                  ? "Simpan keluarga"
                  : "Daftar keluarga"}
            </Button>
            {initial && (
              <Button
                type="button"
                variant="danger"
                disabled={busy}
                onClick={async () => {
                  if (
                    !confirm(
                      "Padam keluarga kosong " +
                        initial.familyId +
                        "? Rekod kewangan tidak boleh dipadam.",
                    )
                  )
                    return;
                  setBusy(true);
                  try {
                    await api("/api/families/" + initial.familyId, "DELETE");
                    router.push("/admin/families");
                    router.refresh();
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Sambungan gagal.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Padam keluarga kosong
              </Button>
            )}
          </div>
        </form>
      )}
    </Card>
  );
}
