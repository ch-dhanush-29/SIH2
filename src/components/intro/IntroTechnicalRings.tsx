import React from 'react';

interface IntroTechnicalRingsProps {
  theme: 'dark' | 'light';
  smoothX: number;
  smoothY: number;
  isStarting?: boolean;
}

export const IntroTechnicalRings: React.FC<IntroTechnicalRingsProps> = ({
  theme,
  smoothX,
  smoothY,
  isStarting = false,
}) => {
  const isDark = theme === 'dark';
  const ringColor = isDark ? 'rgba(32, 214, 232, 0.28)' : 'rgba(8, 126, 164, 0.25)';
  const tickColor = isDark ? 'rgba(32, 214, 232, 0.45)' : 'rgba(8, 126, 164, 0.4)';
  const labelColor = isDark ? '#64748b' : '#94a3b8';

  // Parallax translation
  const tx = smoothX * 12;
  const ty = smoothY * 12;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-15 transition-transform duration-300"
      style={{
        transform: `translate(${tx}px, ${ty}px) scale(${isStarting ? 1.25 : 1.0})`,
        opacity: isStarting ? 0.3 : 1,
        transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s ease',
      }}
    >
      <svg
        className="w-[420px] h-[420px] sm:w-[520px] sm:h-[520px] select-none"
        viewBox="0 0 520 520"
      >
        <defs>
          <radialGradient id="ringGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isDark ? '#20d6e8' : '#087ea4'} stopOpacity="0.08" />
            <stop offset="100%" stopColor={isDark ? '#20d6e8' : '#087ea4'} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Central Ambient Glow Disk */}
        <circle cx="260" cy="260" r="180" fill="url(#ringGlow)" />

        {/* Outer Boundary Ring with Corner Caliber Brackets */}
        <circle
          cx="260"
          cy="260"
          r="230"
          fill="none"
          stroke={ringColor}
          strokeWidth="1"
          strokeDasharray="4 8"
          className="animate-spin-very-slow"
          style={{ transformOrigin: '260px 260px', animationDuration: '90s' }}
        />

        {/* Middle Precision Ring with Compass Ticks */}
        <circle
          cx="260"
          cy="260"
          r="190"
          fill="none"
          stroke={ringColor}
          strokeWidth="1.2"
        />

        {/* 12 Concentric Degree Ticks */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = 260 + Math.cos(rad) * 184;
          const y1 = 260 + Math.sin(rad) * 184;
          const x2 = 260 + Math.cos(rad) * 196;
          const y2 = 260 + Math.sin(rad) * 196;

          return (
            <line
              key={deg}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={tickColor}
              strokeWidth={deg % 90 === 0 ? '2' : '1'}
            />
          );
        })}

        {/* Inner Tracking Orbit with Telemetry Labels */}
        <circle
          cx="260"
          cy="260"
          r="150"
          fill="none"
          stroke={ringColor}
          strokeWidth="1"
          strokeDasharray="2 6"
        />

        {/* Micro Telemetry Labels along the circle */}
        <text
          x="260"
          y="95"
          textAnchor="middle"
          fill={labelColor}
          fontSize="9"
          fontFamily="monospace"
          letterSpacing="0.15em"
          opacity="0.8"
        >
          SIH26170 • FLIGHT QUALIFICATION
        </text>

        <text
          x="260"
          y="435"
          textAnchor="middle"
          fill={labelColor}
          fontSize="9"
          fontFamily="monospace"
          letterSpacing="0.15em"
          opacity="0.8"
        >
          125°C ESS • ZERO-FN GUARANTEE
        </text>

        <text
          x="90"
          y="264"
          textAnchor="middle"
          fill={labelColor}
          fontSize="8"
          fontFamily="monospace"
          letterSpacing="0.1em"
          opacity="0.7"
        >
          LOT-04
        </text>

        <text
          x="430"
          y="264"
          textAnchor="middle"
          fill={labelColor}
          fontSize="8"
          fontFamily="monospace"
          letterSpacing="0.1em"
          opacity="0.7"
        >
          24h GATE
        </text>

        {/* 4 Cardinal Crosshair Points */}
        <circle cx="260" cy="70" r="2.5" fill={isDark ? '#20d6e8' : '#087ea4'} />
        <circle cx="260" cy="450" r="2.5" fill={isDark ? '#20d6e8' : '#087ea4'} />
        <circle cx="70" cy="260" r="2.5" fill={isDark ? '#20d6e8' : '#087ea4'} />
        <circle cx="450" cy="260" r="2.5" fill={isDark ? '#20d6e8' : '#087ea4'} />
      </svg>
    </div>
  );
};
export default IntroTechnicalRings;
