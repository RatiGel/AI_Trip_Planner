import type { Locale } from "@/i18n/routing";

/** Crisp circular SVG flags — consistent across all OS/browsers (unlike emoji). */
export function FlagIcon({ locale, size = 20 }: { locale: Locale; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 512 512",
    role: "img" as const,
    "aria-hidden": true,
  };
  const clip = "flagClip";

  if (locale === "en") {
    // United Kingdom
    return (
      <svg {...common}>
        <defs>
          <clipPath id={`${clip}-en`}>
            <circle cx="256" cy="256" r="256" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clip}-en)`}>
          <rect width="512" height="512" fill="#012169" />
          <path d="M0 0l512 512M512 0L0 512" stroke="#fff" strokeWidth="102" />
          <path d="M0 0l512 512M512 0L0 512" stroke="#C8102E" strokeWidth="60" />
          <path d="M256 0v512M0 256h512" stroke="#fff" strokeWidth="170" />
          <path d="M256 0v512M0 256h512" stroke="#C8102E" strokeWidth="102" />
        </g>
      </svg>
    );
  }

  if (locale === "ka") {
    // Georgia — five-cross flag
    return (
      <svg {...common}>
        <defs>
          <clipPath id={`${clip}-ka`}>
            <circle cx="256" cy="256" r="256" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clip}-ka)`}>
          <rect width="512" height="512" fill="#fff" />
          {/* Large St George cross */}
          <path d="M215 0h82v215h215v82H297v215h-82V297H0v-82h215z" fill="#FF0000" />
          {/* Four small Bolnisi crosses */}
          {[
            [107, 107],
            [405, 107],
            [107, 405],
            [405, 405],
          ].map(([cx, cy]) => (
            <g key={`${cx}-${cy}`} fill="#FF0000" transform={`translate(${cx} ${cy})`}>
              <path d="M-18-46a64 64 0 0136 0v28h28a64 64 0 010 36h-28v28a64 64 0 01-36 0v-28h-28a64 64 0 010-36h28z" />
            </g>
          ))}
        </g>
      </svg>
    );
  }

  // Russia — white/blue/red tricolor
  return (
    <svg {...common}>
      <defs>
        <clipPath id={`${clip}-ru`}>
          <circle cx="256" cy="256" r="256" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip}-ru)`}>
        <rect width="512" height="171" fill="#fff" />
        <rect y="171" width="512" height="170" fill="#0039A6" />
        <rect y="341" width="512" height="171" fill="#D52B1E" />
      </g>
    </svg>
  );
}
