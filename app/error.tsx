"use client";
import Link from "next/link";
import { Button } from "@/components/ui";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div role="alert" className="empty-state">
      <h1 className="text-2xl">Halaman tidak dapat dimuatkan</h1>
      <p className="mt-4 text-slate-600">
        Sambungan mungkin terputus. Jika baru menghantar bayaran, semak rekod
        sebelum mengulang tindakan.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Cuba semula</Button>
        <Link className="secondary-link" href="/">
          Kembali ke utama
        </Link>
      </div>
    </div>
  );
}
