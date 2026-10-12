"use client";
import { UploadSample } from "@/components/upload-sample";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, uploadEvidence } from "@/lib/client-api";
import { Button, Card } from "@/components/ui";
import { StatusPill } from "@/components/status-pill";
import { useAdminPermission } from "@/components/admin-permissions";
import { formatRM, todayDate } from "@/lib/format";
import Link from "next/link";
type Member = {
  memberId: string;
  memberName: string;
  memberStatus: string;
  relationship: string;
  eligible: boolean;
  eligibilityReason: string;
  icNumber?: string | null;
  billingStartMonth?: string | null;
  billingEndMonth?: string | null;
};
type Claim = {
  claimId: string;
  memberId: string;
  claimDate: string;
  claimType: string;
  amount: number;
  notes: string | null;
  status?: string;
};
const relationships = [
  "Wakil",
  "Suami",
  "Isteri",
  "Anak",
  "Ibu",
  "Bapa",
  "Adik",
  "Lain-lain",
];
export function MemberTools({
  familyId,
  members,
  claims,
  deathPayout,
  wardedPayout,
}: {
  familyId: string;
  members: Member[];
  claims: Claim[];
  deathPayout: number;
  wardedPayout: number;
}) {
  const router = useRouter(),
    manage = useAdminPermission("families"),
    canClaim = useAdminPermission("claims"),
    history = useAdminPermission("settings");
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [kind, setKind] = useState("Death"),
    [amount, setAmount] = useState(String(deathPayout)),
    [revealed, setRevealed] = useState<Record<string, string>>({});
  async function send(url: string, method: string, body?: unknown) {
    setBusy(true);
    setError("");
    try {
      await api(url, method, body);
      setNotice(
        "Rekod disimpan. Perubahan bilangan pencarum bermula bulan depan.",
      );
      router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sambungan gagal.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function claim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const file = f.get("proof");
      if (!(file instanceof File) || !file.size)
        throw new Error("Upload bukti kejadian.");
      const receipt = await uploadEvidence(familyId, file);
      await api("/api/claims", "POST", {
        familyId,
        memberId: f.get("memberId"),
        claimDate: f.get("claimDate"),
        claimType: kind,
        amount: Number(amount),
        recipientName: f.get("recipientName"),
        recipientAccount: f.get("recipientAccount"),
        receiptId: receipt.receiptId,
        eventReference: f.get("eventReference") || undefined,
        notes: f.get("notes"),
        exceptionReason: f.get("exceptionReason") || undefined,
      });
      setNotice(
        "Permohonan diterima; belum dikira sebagai wang dibayar. Semak melalui modul Tuntutan.",
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sambungan gagal.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-800">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl bg-green-50 p-4 text-green-900">
          {notice}
        </p>
      )}
      <Card>
        <h2 className="text-xl font-semibold">Ahli keluarga</h2>
        <p className="mt-2 text-slate-600">
          Sejarah caruman kekal. Perubahan bilangan pencarum berkuat kuasa bulan
          depan.
        </p>
        <div className="mt-5 grid gap-4">
          {members.map((m) => (
            <div
              key={m.memberId}
              className="rounded-xl border border-slate-200 p-4"
            >
              {manage ? (
                <form
                  className="grid gap-3 md:grid-cols-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void send("/api/members/" + m.memberId, "PUT", {
                      memberName: f.get("name"),
                      relationship: f.get("relationship"),
                      memberStatus: f.get("status"),
                    });
                  }}
                >
                  <label>
                    Nama
                    <input name="name" defaultValue={m.memberName} required />
                  </label>
                  <label>
                    Hubungan
                    <select name="relationship" defaultValue={m.relationship}>
                      {relationships.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Status
                    <select name="status" defaultValue={m.memberStatus}>
                      <option>Aktif</option>
                      <option>Tidak Aktif</option>
                    </select>
                  </label>
                  <Button variant="ghost" disabled={busy}>
                    Simpan ahli
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    disabled={busy}
                    onClick={() => {
                      if (
                        confirm(
                          "Nyahaktifkan " +
                            m.memberName +
                            " dan kekalkan sejarah?",
                        )
                      )
                        void send("/api/members/" + m.memberId, "DELETE");
                    }}
                  >
                    Nyahaktifkan
                  </Button>
                </form>
              ) : (
                <p className="font-semibold">
                  {m.memberName} · {m.relationship}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <StatusPill status={m.memberStatus} />
                {history && (
                  <details>
                    <summary className="cursor-pointer font-medium text-blue-800">
                      Tempoh keahlian asal
                    </summary>
                    <form
                      className="mt-3 space-y-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        void send(
                          "/api/members/" + m.memberId + "/period",
                          "POST",
                          {
                            start: f.get("start"),
                            end: f.get("end") || "",
                            note: f.get("note"),
                          },
                        );
                      }}
                    >
                      <label>
                        Bulan mula
                        <input
                          name="start"
                          type="month"
                          defaultValue={m.billingStartMonth || ""}
                          required
                        />
                      </label>
                      <label>
                        Bulan berhenti (tidak termasuk bulan ini)
                        <input
                          name="end"
                          type="month"
                          defaultValue={m.billingEndMonth || ""}
                        />
                      </label>
                      <label>
                        Rujukan / bukti sejarah
                        <input name="note" minLength={10} required />
                      </label>
                      <Button disabled={busy}>Sahkan tempoh</Button>
                      <p className="text-sm text-slate-600">
                        Snapshot caruman lama tidak diubah. Pelarasan assessment
                        dibuat berasingan dengan rujukan asal.
                      </p>
                    </form>
                  </details>
                )}
                {m.icNumber && (
                  <>
                    <span className="text-sm text-slate-600">
                      IC: {revealed[m.memberId] || m.icNumber}
                    </span>
                    {manage && (
                      <button
                        className="secondary-link"
                        onClick={async () => {
                          try {
                            if (revealed[m.memberId]) {
                              setRevealed((r) => ({ ...r, [m.memberId]: "" }));
                              return;
                            }
                            const data = await api<{ icNumber: string }>(
                              "/api/members/" + m.memberId + "/reveal",
                              "POST",
                            );
                            setRevealed((r) => ({
                              ...r,
                              [m.memberId]: data.icNumber,
                            }));
                          } catch (e) {
                            setError(
                              e instanceof Error
                                ? e.message
                                : "Sambungan gagal.",
                            );
                          }
                        }}
                      >
                        {revealed[m.memberId]
                          ? "Sembunyikan IC"
                          : "Lihat IC (diaudit)"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        {manage && (
          <details className="mt-5">
            <summary className="cursor-pointer font-semibold text-blue-800">
              Tambah ahli
            </summary>
            <form
              className="mt-4 grid gap-3 sm:grid-cols-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget,
                  f = new FormData(form);
                if (
                  await send("/api/members", "POST", {
                    familyId,
                    memberName: f.get("name"),
                    relationship: f.get("relationship"),
                    memberStatus: "Aktif",
                    icNumber: f.get("ic"),
                  })
                )
                  form.reset();
              }}
            >
              <label>
                Nama ahli
                <input name="name" required />
              </label>
              <label>
                Hubungan
                <select name="relationship" defaultValue="Anak">
                  {relationships.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label>
                IC (pilihan, disimpan terenkripsi)
                <input name="ic" maxLength={20} />
              </label>
              <Button disabled={busy}>Tambah ahli</Button>
            </form>
          </details>
        )}
      </Card>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Permohonan bantuan</h2>
          <Link className="secondary-link" href="/admin/claims">
            Semak semua tuntutan
          </Link>
        </div>
        <p className="mt-3 leading-7 text-slate-600">
          Kematian {formatRM(deathPayout)} · Wad kritikal{" "}
          {formatRM(wardedPayout)}. Polisi dan kelayakan dinilai pada tarikh
          kejadian. Semua rekod lama mesti disahkan dahulu.
        </p>
        {canClaim && members.length > 0 && (
          <details className="mt-5">
            <summary className="cursor-pointer font-semibold text-blue-800">
              Masukkan tuntutan baharu
            </summary>
            <form onSubmit={claim} className="mt-5 grid gap-4 md:grid-cols-2">
              <label>
                Jenis
                <select
                  value={kind}
                  onChange={(e) => {
                    setKind(e.target.value);
                    setAmount(
                      String(
                        e.target.value === "Death" ? deathPayout : wardedPayout,
                      ),
                    );
                  }}
                >
                  <option value="Death">Kematian</option>
                  <option value="Warded">Wad kritikal</option>
                </select>
              </label>
              <label>
                Ahli
                <select name="memberId" required>
                  {members.map((m) => (
                    <option key={m.memberId} value={m.memberId}>
                      {m.memberName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tarikh kejadian
                <input
                  name="claimDate"
                  type="date"
                  max={todayDate()}
                  defaultValue={todayDate()}
                  required
                />
              </label>
              <label>
                Jumlah dimohon RM
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </label>
              <label>
                Rujukan episod kemasukan wad{" "}
                {kind === "Warded" ? "(wajib)" : "(pilihan)"}
                <input
                  name="eventReference"
                  required={kind === "Warded"}
                  minLength={3}
                  maxLength={80}
                />
              </label>
              <label>
                Nama penerima / waris
                <input name="recipientName" required minLength={2} />
              </label>
              <label>
                Akaun penerima / kaedah payout
                <input name="recipientAccount" required minLength={5} />
              </label>
              <label>
                Bukti kematian / wad kritikal
                <input
                  name="proof"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  required
                />
              </label>
              <UploadSample kind="evidence" className="md:col-span-2" />
              <label>
                Alasan pengecualian kadar (jika ada)
                <input name="exceptionReason" maxLength={500} />
              </label>
              <label className="md:col-span-2">
                Catatan kes
                <textarea name="notes" maxLength={500} rows={2} />
              </label>
              <Button disabled={busy}>
                {busy ? "Menghantar…" : "Daftar permohonan"}
              </Button>
            </form>
          </details>
        )}
        <ul className="mt-5 space-y-3">
          {claims.map((c) => (
            <li
              key={c.claimId}
              className="flex flex-wrap justify-between gap-3 rounded-xl bg-slate-50 p-4"
            >
              <div>
                <p>
                  {members.find((m) => m.memberId === c.memberId)?.memberName} ·{" "}
                  {c.claimType === "Death" ? "Kematian" : "Wad"}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {c.claimDate} · {formatRM(c.amount)}
                </p>
              </div>
              <StatusPill status={c.status || "Paid"} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
