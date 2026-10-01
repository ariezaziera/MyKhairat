const styles: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-800 ring-amber-200",
  Approved: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  Rejected: "bg-rose-50 text-rose-700 ring-rose-200",
  Active: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  Suspended: "bg-rose-50 text-rose-700 ring-rose-200",
  Inactive: "bg-slate-100 text-slate-600 ring-slate-200",
  Aktif: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  "Tidak Aktif": "bg-slate-100 text-slate-600 ring-slate-200",
  Paid: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  Overdue: "bg-rose-50 text-rose-700 ring-rose-200",
  Partial: "bg-orange-50 text-orange-800 ring-orange-200",
  Due: "bg-sky-50 text-sky-800 ring-sky-200",
  Upcoming: "bg-slate-100 text-slate-500 ring-slate-200",
  BeforeJoin: "bg-slate-50 text-slate-400 ring-slate-200",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[status] ?? styles.Inactive}`}>
      {status === "BeforeJoin" ? "—" : status}
    </span>
  );
}
