interface NetraLogoProps {
  size?: number;
  mono?: boolean;
}

// Netra-Thip logo — stylized "ดวงตาทิพย์" (divine eye) with crosshair reticle
// and a Thai chofa (mini flame) accent. Combines mandala geometry with a scope.
export function NetraLogo({ size = 28, mono = false }: NetraLogoProps) {
  const accent = mono ? "currentColor" : "var(--nt-blue)";
  const gold = mono ? "currentColor" : "var(--nt-gold)";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-label="Netra-Thip"
    >
      <path
        d="M2 16 C 8 6, 24 6, 30 16 C 24 26, 8 26, 2 16 Z"
        fill="none"
        stroke={accent}
        strokeWidth="1.6"
      />
      <circle cx="16" cy="16" r="6" fill="none" stroke={accent} strokeWidth="1.6" />
      <circle cx="16" cy="16" r="2.6" fill={accent} />
      <path
        d="M16 4 L16 7 M16 25 L16 28 M3 16 L6 16 M26 16 L29 16"
        stroke={accent}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M16 1.5 C 15 3, 14 3.5, 14.5 5 C 15.2 4.2, 16 4, 16 4 C 16 4, 16.8 4.2, 17.5 5 C 18 3.5, 17 3, 16 1.5 Z"
        fill={gold}
      />
    </svg>
  );
}
