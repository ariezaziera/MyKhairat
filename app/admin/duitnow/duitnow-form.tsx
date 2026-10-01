"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Card } from "@/components/ui";

export function DuitnowForm({ duitnowId, hasImage }: { duitnowId: string; hasImage: boolean }) {
  const router = useRouter();
  const [preview, setPreview] = useState(hasImage ? `/api/duitnow/qr?t=${Date.now()}` : "");
  const [removeImage, setRemoveImage] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSaved(false);
    const form = new FormData(event.currentTarget);
    const file = form.get("qr");
    let dataUrl = "";
    if (file instanceof File && file.size > 0) {
      dataUrl = await readFile(file);
    }
    const response = await fetch("/api/settings/duitnow", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        duitnowId: String(form.get("duitnowId") ?? ""),
        dataUrl,
        removeImage: removeImage && !dataUrl,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(data.error || "Could not save the DuitNow QR.");
      return;
    }
    setSaved(true);
    setRemoveImage(false);
    setPreview(data.hasDuitnowQr ? `/api/duitnow/qr?t=${Date.now()}` : "");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="space-y-4">
        {error ? <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        {saved ? <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">DuitNow details saved. Families can scan this code on the payment page.</p> : null}
        <div>
          <label htmlFor="duitnowId">DuitNow ID</label>
          <input id="duitnowId" name="duitnowId" defaultValue={duitnowId} placeholder="Phone number or business ID" />
          <p className="mt-1 text-xs text-slate-500">Shown next to the QR so a wakil can type it if the scan fails.</p>
        </div>
        <div>
          <label htmlFor="qr">QR image</label>
          <input id="qr" name="qr" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setRemoveImage(false);
            setPreview(URL.createObjectURL(file));
          }} />
        </div>
        {preview && !removeImage ? (
          <button type="button" className="text-sm font-semibold text-rose-600" onClick={() => setRemoveImage(true)}>
            Remove current QR
          </button>
        ) : null}
        {removeImage ? <p className="text-sm text-amber-700">The QR will be removed when you save.</p> : null}
        <Button type="submit" className="sm:w-fit" disabled={pending}>
          {pending ? "Saving..." : "Save DuitNow QR"}
        </Button>
      </Card>
      <Card>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</p>
        {preview && !removeImage ? (
          <img src={preview} alt="DuitNow QR preview" className="mt-3 w-full rounded-2xl bg-slate-50 object-contain" />
        ) : (
          <p className="mt-3 text-sm text-slate-500">No QR yet. Upload the Maybank or DuitNow merchant code families should scan.</p>
        )}
      </Card>
    </form>
  );
}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.readAsDataURL(file);
  });
}
