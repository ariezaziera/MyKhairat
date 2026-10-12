export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Sedang memuatkan halaman"
      className="space-y-5"
    >
      <p className="font-medium text-slate-600">Memuatkan rekod…</p>
      <div className="h-36 animate-pulse rounded-2xl bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-24 animate-pulse rounded-xl bg-slate-200" />
        ))}
      </div>
    </div>
  );
}
