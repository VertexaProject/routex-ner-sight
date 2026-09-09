import React from "react";

interface RouteXIconProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

/**
 * RouteX Symbol for SIH26002:
 * AI-driven Resilient Multi-modal Logistics & Accessibility Intelligence for the North Eastern Region.
 *
 * Visual elements:
 * - Rounded squircle crest: Institutional resilience, security & trust
 * - Pin apex & silhouette: Geographic location & pinpoint dispatching
 * - S-curved highway corridor: Winding mountain terrain & resilient route discovery
 * - Directional transport chevron: Forward logistics convoy movement
 * - Central intelligence node: Real-time hazard monitoring & route safety
 */
export function RouteXIcon({ className = "", size = "md" }: RouteXIconProps) {
  const sizeMap = {
    sm: "h-7 w-7",
    md: "h-9 w-9",
    lg: "h-11 w-11",
    xl: "h-14 w-14",
  };

  const pixelMap = {
    sm: 28,
    md: 36,
    lg: 44,
    xl: 56,
  };

  const px = pixelMap[size];

  return (
    <div
      className={`relative inline-grid place-items-center rounded-xl bg-gradient-to-br from-primary via-blue-600 to-indigo-700 text-white shadow-md shadow-primary/25 ring-1 ring-black/10 shrink-0 select-none ${sizeMap[size]} ${className}`}
      title="RouteX — NER Logistics & Accessibility Intelligence"
    >
      <svg
        width={px * 0.72}
        height={px * 0.72}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transform transition-transform duration-200 group-hover:scale-105"
      >
        <defs>
          <linearGradient id="rxPathGrad" x1="8" y1="28" x2="28" y2="8" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38bdf8" />
            <stop offset="0.6" stopColor="#ffffff" />
            <stop offset="1" stopColor="#4ade80" />
          </linearGradient>
          <filter id="rxGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Geo-Pin Contour / Protective Perimeter */}
        <path
          d="M18 3.5 C11.5 3.5 6.5 8.5 6.5 15 C6.5 22.8 16.2 31.8 17.2 32.7 C17.7 33.1 18.3 33.1 18.8 32.7 C19.8 31.8 29.5 22.8 29.5 15 C29.5 8.5 24.5 3.5 18 3.5 Z"
          stroke="rgba(255, 255, 255, 0.45)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="rgba(255, 255, 255, 0.08)"
        />

        {/* Dynamic S-Curved Highway Corridor traversing through terrain */}
        <path
          d="M11.5 25 C14 24 16 19 20 18 C23 17.2 24.5 12.5 25 10"
          stroke="url(#rxPathGrad)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Forward Logistics Arrow / Directional Chevron */}
        <path
          d="M21.5 8.5 L26 9.5 L25 14"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Secondary Safe Bypass Branch Line */}
        <path
          d="M16 20 C18 21.5 21 21 23 23"
          stroke="#38bdf8"
          strokeWidth="1.8"
          strokeDasharray="2 2"
          strokeLinecap="round"
        />

        {/* Central Intelligence Beacon Node (Active Monitoring) */}
        <circle cx="18" cy="14" r="3.2" fill="#ffffff" filter="url(#rxGlow)" />
        <circle cx="18" cy="14" r="1.6" fill="#0284c7" />
      </svg>
    </div>
  );
}

interface RouteXLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showSubtitle?: boolean;
  subtitleText?: string;
}

export function RouteXLogo({
  className = "",
  size = "md",
  showSubtitle = true,
  subtitleText = "NER Logistics & Accessibility Intelligence",
}: RouteXLogoProps) {
  const textSizes = {
    sm: { title: "text-sm", sub: "text-[10px]" },
    md: { title: "text-base sm:text-lg", sub: "text-[11px] sm:text-xs" },
    lg: { title: "text-2xl sm:text-3xl", sub: "text-xs sm:text-sm" },
  };

  return (
    <div className={`flex items-center gap-2.5 min-w-0 ${className}`}>
      <RouteXIcon size={size} />
      <div className="leading-tight min-w-0">
        <div className="flex items-center gap-0.5 font-display font-black tracking-tight text-foreground">
          <span className={textSizes[size].title}>Route</span>
          <span className={`${textSizes[size].title} text-primary font-black`}>X</span>
        </div>
        {showSubtitle && (
          <span className={`block text-muted-foreground font-medium truncate ${textSizes[size].sub}`}>
            {subtitleText}
          </span>
        )}
      </div>
    </div>
  );
}
