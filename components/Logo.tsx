export default function Logo({ light = false }: { light?: boolean }) {
  const navy = light ? '#FFFFFF' : '#0E2A5C';
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 64 56" className="h-11 w-12 shrink-0" aria-hidden="true">
        <g stroke="#F5911E" strokeWidth="3" strokeLinecap="round">
          <path d="M14 16 11 12M22 10l-1.5-4.5M32 8.5V4M42 10l1.5-4.5M50 16l3-4" />
        </g>
        <path d="M18 22a14 14 0 0 1 28 0" fill="none" stroke="#F5911E" strokeWidth="3.4" strokeLinecap="round" />
        <text x="6" y="40" fontFamily="Arial Black, Arial, sans-serif" fontSize="26" fontWeight="900" fill={navy}>R</text>
        <text x="24" y="40" fontFamily="Arial Black, Arial, sans-serif" fontSize="26" fontWeight="900" fill="#F5911E">R</text>
        <g fill="#1B4C9B">
          <rect x="24" y="42" width="26" height="4" rx="1" transform="skewX(-14)" />
          <rect x="22" y="47" width="26" height="4" rx="1" transform="skewX(-14)" />
        </g>
        <path d="M52 44c5 0 8-3 8-8-6 0-9 3-8 8Z" fill="#2E9E4F" />
      </svg>
      <div className="leading-none">
        <div className={`text-xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-navy'}`}>
          R R <span className="text-solar">SOLAR</span> SOLUTIONS
        </div>
        <div className={`mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${light ? 'text-white/70' : 'text-navy/60'}`}>
          Complete Solar Energy Partner
        </div>
      </div>
    </div>
  );
}
