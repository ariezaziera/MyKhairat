export function Logo({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 72 72" className={compact ? "h-10 w-10" : "h-14 w-14"} aria-hidden="true">
        <defs>
          <linearGradient id="mk-blue" x1="12" y1="8" x2="60" y2="64">
            <stop stopColor="#4DA3FF" />
            <stop offset="1" stopColor="#007BFF" />
          </linearGradient>
          <linearGradient id="mk-green" x1="20" y1="20" x2="52" y2="58">
            <stop stopColor="#5DDC7A" />
            <stop offset="1" stopColor="#28A745" />
          </linearGradient>
        </defs>
        <circle cx="36" cy="36" r="32" fill="#F8FBFF" stroke="#E6EEF8" />
        <path
          d="M36 10c9 7 18 9 24 9-2 16-9 28-24 36C21 47 14 35 12 19c6 0 15-2 24-9z"
          stroke="url(#mk-blue)"
          strokeWidth="3.2"
          fill="none"
        />
        <path
          d="M27 34c2.4-7 7-12 9-14 2 2 6.6 7 9 14-3.2 2.2-6 2.4-9 2.4s-5.8-.2-9-2.4z"
          stroke="url(#mk-green)"
          strokeWidth="3"
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M43 20c4.5 1.2 8 4.6 9.2 9.2-3.4-1.2-6.4-3.6-9.2-9.2z" fill="url(#mk-blue)" />
        <path
          d="M50 15.2l1.5 3.2 3.5.4-2.6 2.4.7 3.4L50 22.8l-3.1 1.8.7-3.4-2.6-2.4 3.5-.4 1.5-3.2z"
          fill="url(#mk-green)"
        />
      </svg>
      <div>
        <div className="text-xl font-semibold leading-none tracking-tight">
          <span className={inverse ? "text-white" : "text-brand-blue"}>My</span>
          <span className={inverse ? "text-emerald-200" : "text-brand-green"}>Khairat</span>
        </div>
        {!compact ? <p className={`mt-1 text-xs ${inverse ? "text-white/70" : "text-slate-500"}`}>Sistem Dana Kita</p> : null}
      </div>
    </div>
  );
}
