"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client-api";
import { PasswordInput } from "@/components/password-input";
import { Button, Card } from "@/components/ui";
export type AccountRow = {
  id: string;
  email: string;
  username: string | null;
  mustChangePassword: boolean;
  name: string;
  role: string;
  familyId: string | null;
  familyLabel: string | null;
  phone: string | null;
  active: boolean;
  accessProfile?: string;
  activationRequired?: boolean;
};
const profiles = {
  owner: "Pentadbir utama",
  treasurer: "Bendahari (rekod keluarga / resit)",
  approver: "Pelulus (bayaran / tuntutan)",
  auditor: "Auditor (lihat sahaja)",
};
export function AccountsBoard({
  accounts,
  currentUserId,
}: {
  accounts: AccountRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [delegate, setDelegate] = useState(false);
  const families = [
    ...new Map(
      accounts
        .filter((a) => a.familyId)
        .map((a) => [
          a.familyId!,
          { id: a.familyId!, name: a.familyLabel || a.name },
        ]),
    ).values(),
  ];
  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setCode("");
    try {
      const result = await api<{ activationCode?: string }>(
        "/api/users/" + id,
        "PATCH",
        body,
      );
      setCode(result.activationCode || "");
      setNotice(
        "Akaun dikemaskini. Sesi lama dibatalkan jika akses atau password berubah.",
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sambungan gagal.");
    } finally {
      setBusy(false);
    }
  }
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = e.currentTarget,
      f = new FormData(form);
    try {
      const r = await api<{ activationCode?: string }>("/api/users", "POST", {
        name: f.get("name"),
        email: f.get("email") || "",
        password: delegate ? "mykhairat" : f.get("password"),
        phone: f.get("phone") || "",
        accessProfile: f.get("profile") || "treasurer",
        delegateFamilyId: delegate ? f.get("family") : undefined,
      });
      setCode(r.activationCode || "");
      setNotice("Akaun disediakan. Password perlu ditukar pada login pertama.");
      form.reset();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sambungan gagal.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
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
      {code && (
        <Card>
          <p className="font-semibold">Kod pengaktifan baharu</p>
          <p className="mt-3 select-all font-mono text-2xl tracking-widest">
            {code}
          </p>
          <p className="mt-3 text-slate-600">
            Berikan hanya kepada wakil sebenar melalui WhatsApp / panggilan. Sah
            7 hari. Password awal: mykhairat. Kod tidak disimpan sebagai teks
            biasa.
          </p>
        </Card>
      )}
      <Card>
        <h2 className="text-xl font-semibold">
          Tambah akses AJK / wakil ganti
        </h2>
        <label className="mt-5 flex items-center gap-3">
          <input
            className="!w-5 !p-0"
            type="checkbox"
            checked={delegate}
            onChange={(e) => setDelegate(e.target.checked)}
          />
          Akaun ini untuk ahli keluarga yang membantu wakil
        </label>
        <form onSubmit={create} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label>
            Nama
            <input name="name" required minLength={2} />
          </label>
          <label>
            Email {delegate ? "(pilihan)" : ""}
            <input name="email" type="email" required={!delegate} />
          </label>
          <label>
            Telefon
            <input name="phone" type="tel" />
          </label>
          {delegate ? (
            <label>
              Keluarga
              <select name="family" required>
                <option value="">Pilih keluarga</option>
                {families.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.id} · {f.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <label>
                Password sementara
                <PasswordInput
                  name="password"
                  required
                  minLength={8}
                  maxLength={80}
                />
              </label>
              <label>
                Kuasa AJK
                <select name="profile" defaultValue="treasurer">
                  {Object.entries(profiles).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <Button disabled={busy} className="sm:w-fit">
            {busy ? "Menyimpan…" : "Cipta akses"}
          </Button>
        </form>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        {accounts.map((a) => (
          <Card key={a.id}>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{a.name}</h2>
                <p className="mt-2 font-semibold text-blue-800">
                  {a.username || a.email}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {a.role === "admin"
                    ? profiles[a.accessProfile as keyof typeof profiles] ||
                      "AJK"
                    : `Wakil / ganti · ${a.familyId}`}
                </p>
              </div>
              <span className={a.active ? "text-green-800" : "text-slate-600"}>
                {a.active ? "Akses aktif" : "Dinyahaktifkan"}
              </span>
            </div>
            {a.mustChangePassword && (
              <p className="mt-4 text-sm text-amber-900">
                Wajib tukar password semasa login berikutnya.
              </p>
            )}
            {a.activationRequired && (
              <p className="mt-2 text-sm text-blue-800">
                Kod pengaktifan diperlukan.
              </p>
            )}
            <form
              className="mt-5 grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void patch(a.id, {
                  name: f.get("name"),
                  password: f.get("password") || undefined,
                  accessProfile:
                    a.role === "admin" && a.id !== currentUserId
                      ? f.get("profile")
                      : undefined,
                });
              }}
            >
              <label>
                Nama
                <input
                  name="name"
                  defaultValue={a.name}
                  required
                  minLength={2}
                />
              </label>
              {a.role === "admin" && (
                <>
                  <label>
                    Kuasa
                    <select
                      name="profile"
                      defaultValue={a.accessProfile || "owner"}
                      disabled={a.id === currentUserId}
                    >
                      {Object.entries(profiles).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Password baharu (pilihan)
                    <PasswordInput name="password" minLength={8} />
                  </label>
                </>
              )}
              <Button variant="ghost" disabled={busy}>
                Simpan akaun
              </Button>
            </form>
            <div className="mt-5 flex flex-wrap gap-3">
              {a.role === "wakil" && (
                <>
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void patch(a.id, { issueActivation: true })}
                  >
                    Kod pengaktifan baharu
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      if (
                        confirm(
                          "Reset " +
                            a.name +
                            " kepada mykhairat dan batalkan sesi?",
                        )
                      )
                        void patch(a.id, { resetDefault: true });
                    }}
                  >
                    Reset password
                  </Button>
                </>
              )}
              {a.id !== currentUserId && (
                <Button
                  variant={a.active ? "danger" : "green"}
                  disabled={busy}
                  onClick={() => void patch(a.id, { active: !a.active })}
                >
                  {a.active ? "Nyahaktifkan" : "Aktifkan akses"}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
