import { Download } from "lucide-react";

const samples = {
  families: {
    file: "keluarga",
    title: "senarai keluarga",
    note: "Excel (.xlsx) atau CSV, maksimum 3 MB. Satu baris setiap ahli. Gantikan semua data CONTOH; kekalkan tajuk kolum. Family ID di sini ialah kod rujukan keluarga untuk import.",
    spreadsheet: true,
  },
  transactions: {
    file: "transaksi",
    title: "transaksi",
    note: "Excel (.xlsx) atau CSV, maksimum 3 MB / 500 baris. Gantikan CONTOH-ID dengan Family ID sebenar dalam sistem. Tarikh: YYYY-MM-DD; bulan: YYYY-MM; jumlah: nombor tanpa RM. Semak dan gantikan semua nilai contoh sebelum import.",
    spreadsheet: true,
  },
  receipt: {
    file: "resit",
    title: "resit bayaran",
    note: "PNG, JPG atau WebP, maksimum 2 MB. Pastikan tarikh, jumlah, penerima, status bayaran dan nombor rujukan jelas. Contoh ini hanya panduan; muat naik resit sebenar.",
    spreadsheet: false,
  },
  evidence: {
    file: "bukti-tuntutan",
    title: "bukti tuntutan",
    note: "PNG, JPG atau WebP, maksimum 2 MB. Muat naik foto dokumen kematian atau kemasukan wad kritikal yang jelas, termasuk nama ahli dan tarikh kejadian. Contoh ini ialah panduan, bukan dokumen rasmi. PDF belum diterima.",
    spreadsheet: false,
  },
  duitnow: {
    file: "duitnow",
    title: "imej DuitNow",
    note: "PNG, JPG atau WebP, maksimum 2 MB. Gunakan QR asal daripada bank dengan nama penerima yang jelas dan keseluruhan QR tidak dipotong. Contoh ini hanya panduan susun atur dan tidak boleh diimbas untuk bayaran.",
    spreadsheet: false,
  },
} as const;

export function UploadSample({ kind, className = "" }: { kind: keyof typeof samples; className?: string }) {
  const sample = samples[kind];
  return (
    <div className={`my-3 min-w-0 rounded-xl border border-blue-100 bg-blue-50/60 p-3 sm:p-4 ${className}`}>
      <div className="flex flex-wrap gap-2">
        {(sample.spreadsheet ? ["xlsx", "csv"] : ["png"]).map((extension) => (
          <a
            key={extension}
            href={`/samples/contoh-${sample.file}.${extension}`}
            download
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100"
          >
            <Download size={17} aria-hidden="true" className="shrink-0" />
            Muat turun contoh {sample.title} ({extension.toUpperCase()})
          </a>
        ))}
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{sample.note}</p>
    </div>
  );
}
