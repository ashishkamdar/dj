export function Logo({ className = "h-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Kachaa Pakka"
    >
      <defs>
        <linearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e85d04" />
          <stop offset="100%" stopColor="#dc2f02" />
        </linearGradient>
        <linearGradient id="accent" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f48c06" />
          <stop offset="100%" stopColor="#e85d04" />
        </linearGradient>
      </defs>
      <rect x="0" y="8" width="280" height="64" rx="32" fill="url(#brand)" opacity="0.08" />
      <text x="16" y="58" fontFamily="'Noto Sans Devanagari', sans-serif" fontSize="48" fontWeight="700" fill="url(#brand)">
        {"\u0915"}
      </text>
      <text x="52" y="52" fontFamily="'Inter', system-ui, sans-serif" fontSize="32" fontWeight="600" fill="currentColor" letterSpacing="-0.5">
        achaa
      </text>
      <text x="152" y="58" fontFamily="'Noto Sans Devanagari', sans-serif" fontSize="48" fontWeight="700" fill="url(#brand)">
        {"\u092A"}
      </text>
      <text x="188" y="52" fontFamily="'Inter', system-ui, sans-serif" fontSize="32" fontWeight="600" fill="currentColor" letterSpacing="-0.5">
        akka
      </text>
      <rect x="16" y="66" width="248" height="3" rx="1.5" fill="url(#accent)" opacity="0.6" />
    </svg>
  );
}

export function LogoIcon({ className = "size-8" }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600 font-bold text-white ${className}`}
      style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}
    >
      <span className="text-sm leading-none">{"\u0915\u092A"}</span>
    </div>
  );
}
