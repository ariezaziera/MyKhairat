"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client-api";
import { Button } from "@/components/ui";
export function ReviewActions({id,kind}:{id:string;kind:string}) {
  const router=useRouter(), [busy,setBusy]=useState(false), [error,setError]=useState("");
  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();setBusy(true);setError("");
    const f=new FormData(e.currentTarget);
    try {await api("/api/legacy-review","POST",{id,action:f.get("action"),note:f.get("note")});router.refresh();}
    catch(e){setError(e instanceof Error?e.message:"Gagal menyimpan.");} finally {setBusy(false);}
  }
  return <form onSubmit={submit} className="mt-4 space-y-3 border-t pt-4">
    {error && <p role="alert" className="text-rose-700">{error}</p>}
    <label className="block">Keputusan<select name="action" required defaultValue=""><option value="" disabled>Pilih selepas menyemak bukti</option>{kind==="opening2025"?<option value="confirm-opening">Sahkan semua caruman Ogos–Disember dan baki bank RM2,000</option>:kind==="duplicate"?<><option value="reject-duplicate">Sahkan pendua — tolak kedua-dua agihan RM35</option><option value="approve-duplicate">Bayaran tambahan sebenar — lulus kedua-dua agihan RM35</option></>:<option value="resolve">Semakan selesai (tiada perubahan amaun)</option>}</select></label>
    <label className="block">Alasan dan rujukan bukti<textarea name="note" minLength={10} maxLength={1000} required rows={2}/></label>
    <label className="flex items-start gap-2"><input type="checkbox" required className="!w-auto mt-1"/>Saya telah menyemak bukti dan bersetuju dengan keputusan ini.</label>
    <Button disabled={busy}>{busy?"Menyimpan…":"Simpan keputusan"}</Button>
  </form>;
}
