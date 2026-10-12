"use client";
import { UploadSample } from "@/components/upload-sample";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button, Card } from "@/components/ui";
import { api } from "@/lib/client-api";
export function DuitnowForm({
  duitnowId,
  hasImage,
}: {
  duitnowId: string;
  hasImage: boolean;
}) {
  const router = useRouter(),
    [preview, setPreview] = useState(hasImage ? "/api/duitnow/qr" : ""),
    [remove, setRemove] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  useEffect(
    () => () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const f = new FormData(e.currentTarget),
        file = f.get("qr");
      let dataUrl = "";
      if (file instanceof File && file.size) {
        if (
          file.size > 2_000_000 ||
          !["image/png", "image/jpeg", "image/webp"].includes(file.type)
        )
          throw new Error("Pilih PNG/JPG/WebP bawah2MB.");
        dataUrl = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.onerror = () => reject(new Error("Fail tidak dapat dibaca."));
          r.readAsDataURL(file);
        });
      }
      const data = await api<{ hasDuitnowQr: boolean }>(
        "/api/settings/duitnow",
        "PUT",
        {
          duitnowId: f.get("id") || "",
          dataUrl,
          removeImage: remove && !dataUrl,
        },
      );
      setPreview(data.hasDuitnowQr ? "/api/duitnow/qr?t=" + Date.now() : "");
      setRemove(false);
      setMessage(
        "QR dan ID DuitNow disimpan. Semak penerima sebelum memberi arahan bayaran.",
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sambungan gagal.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
      <Card>
        <h2 className="text-xl font-semibold">Maklumat DuitNow</h2>
        {error && (
          <p role="alert" className="mt-4 text-rose-700">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="mt-4 text-green-800">
            {message}
          </p>
        )}
        <label className="mt-5">
          ID DuitNow
          <input name="id" defaultValue={duitnowId} maxLength={40} />
        </label>
        <label className="mt-5">
          Imej QR daripada bank
          <input
            name="qr"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setRemove(false);
                setPreview(URL.createObjectURL(file));
              }
            }}
          />
        </label>
        <UploadSample kind="duitnow" />
        <div className="mt-5 flex flex-wrap gap-3">
          {preview && !remove && (
            <Button
              variant="danger"
              type="button"
              onClick={() => setRemove(true)}
            >
              Buang QR
            </Button>
          )}
          <Button disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan DuitNow"}
          </Button>
        </div>
        {remove && (
          <p className="mt-3 text-amber-900">
            QR akan dibuang selepas menyimpan.
          </p>
        )}
      </Card>
      <Card>
        <h2 className="text-xl font-semibold">Preview penerima</h2>
        {preview && !remove ? (
          <img
            src={preview}
            alt="Preview QR DuitNow yang akan digunakan keluarga"
            className="mx-auto mt-5 w-full max-w-72"
          />
        ) : (
          <p className="mt-5 text-slate-600">QR belum disediakan.</p>
        )}
        <p className="mt-4 text-sm text-slate-600">
          Gunakan imej asal yang jelas. Pastikan QR milik akaun dana keluarga,
          bukan akaun peribadi yang salah.
        </p>
      </Card>
    </form>
  );
}
