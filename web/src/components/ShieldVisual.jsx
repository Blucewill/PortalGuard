// Dark glossy shield with a glowing orange visor band: the hero centerpiece.
export default function ShieldVisual() {
  return (
    <svg className="shield-visual" viewBox="0 0 400 460" aria-hidden="true">
      <defs>
        <radialGradient id="sv-body" cx="38%" cy="22%" r="85%">
          <stop offset="0" stopColor="#4a4b52" />
          <stop offset="0.35" stopColor="#18181b" />
          <stop offset="1" stopColor="#030304" />
        </radialGradient>
        <linearGradient id="sv-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id="sv-visor" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ff4d00" />
          <stop offset="0.45" stopColor="#ffb054" />
          <stop offset="1" stopColor="#ff4d00" />
        </linearGradient>
        <filter id="sv-glow" x="-50%" y="-300%" width="200%" height="700%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
      </defs>
      <path d="M200 8 372 68v150c0 116-74 196-172 236C102 414 28 334 28 218V68Z" fill="url(#sv-body)" />
      <path d="M200 8 372 68v150c0 116-74 196-172 236C102 414 28 334 28 218V68Z" fill="none" stroke="url(#sv-rim)" strokeWidth="2" />
      <rect className="visor-glow" x="58" y="168" width="284" height="52" rx="26" fill="#ff6a00" filter="url(#sv-glow)" />
      <rect x="72" y="176" width="256" height="36" rx="18" fill="url(#sv-visor)" />
      <rect x="92" y="182" width="128" height="6" rx="3" fill="#fff" opacity="0.6" />
      <rect x="72" y="176" width="256" height="36" rx="18" fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="2" />
    </svg>
  );
}
