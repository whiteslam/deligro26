/**
 * Map-and-pin artwork for the location permission sheet.
 *
 * Drawn inline (not an <img>) so it inherits the theme tokens — the same
 * illustration reads correctly on the light and dark surfaces. No frame or
 * background plate: the scene sits directly on the sheet. Motion (pin drop,
 * float, radar ping, drifting clouds) lives in globals.css under `.loc-*`.
 */
export function LocationIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 140"
      role="img"
      aria-label="A map pin dropping next to a restaurant"
      className={className}
    >
      {/* Clouds */}
      <g fill="var(--muted)" opacity="0.22">
        <path
          className="loc-cloud-a"
          d="M22 30h24a6 6 0 1 0-6-7A8 8 0 0 0 22 24a3 3 0 0 0 0 6Z"
        />
        <path
          className="loc-cloud-b"
          d="M196 22h26a6.5 6.5 0 1 0-7-7.4A8.5 8.5 0 0 0 196 15a3.5 3.5 0 0 0 0 7Z"
        />
      </g>

      {/* Ground */}
      <ellipse cx="120" cy="112" rx="106" ry="22" fill="var(--surface-2)" />
      <g stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" opacity="0.3">
        <path d="M34 116h10M56 118h10M150 118h10M172 116h10M194 113h8" />
      </g>

      {/* Trees */}
      <g>
        <path d="M30 98c0-7 5-12 11-12s11 5 11 12-5 10-11 10-11-3-11-10Z" fill="#3d9a6a" />
        <rect x="38" y="104" width="5" height="9" rx="2.5" fill="#2f7d55" />
        <path d="M60 102c0-5 4-8 8-8s8 3 8 8-3 8-8 8-8-3-8-8Z" fill="#4fb37f" />
        <rect x="65" y="107" width="4" height="7" rx="2" fill="#2f7d55" />
      </g>

      {/* Restaurant */}
      <g>
        <rect x="162" y="62" width="60" height="50" rx="5" fill="var(--surface-2)" />
        <rect x="158" y="62" width="68" height="8" rx="4" fill="var(--muted)" opacity="0.45" />
        {/* Awning */}
        <path d="M162 76h60v10a3 3 0 0 1-3 3h-54a3 3 0 0 1-3-3Z" fill="var(--accent)" />
        <g fill="var(--surface)" opacity="0.35">
          <rect x="172" y="76" width="9" height="13" />
          <rect x="192" y="76" width="9" height="13" />
          <rect x="212" y="76" width="9" height="13" />
        </g>
        {/* Door + windows */}
        <rect x="184" y="96" width="15" height="16" rx="2" fill="var(--muted)" opacity="0.4" />
        <rect x="167" y="96" width="11" height="9" rx="2" fill="var(--muted)" opacity="0.25" />
        <rect x="205" y="96" width="11" height="9" rx="2" fill="var(--muted)" opacity="0.25" />
      </g>

      {/* Radar ping + contact shadow under the pin */}
      <ellipse
        className="loc-ping"
        cx="120"
        cy="110"
        rx="26"
        ry="8"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
      />
      <ellipse className="loc-shadow" cx="120" cy="110" rx="17" ry="4.5" fill="var(--ink)" />

      {/* Pin */}
      <g className="loc-pin">
        <path
          d="M120 16c-16 0-29 12.8-29 28.6 0 20.8 24.1 55.9 26.5 59.3a3 3 0 0 0 5 0C124.9 100.5 149 65.4 149 44.6 149 28.8 136 16 120 16Z"
          fill="var(--accent)"
        />
        <circle cx="120" cy="44" r="11.5" fill="var(--surface)" />
        {/* Fork + knife */}
        <g stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M115 38.5v4a2 2 0 0 0 4 0v-4M117 42.5V50" />
          <path d="M125 38.5c1.6 0 2.6 1.8 2.6 4.2s-1 3-2.6 3V50" />
        </g>
      </g>
    </svg>
  );
}
