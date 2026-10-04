import React from 'react';

interface IntroGridProps {
  theme: 'dark' | 'light';
  smoothX: number;
  smoothY: number;
}

export const IntroGrid: React.FC<IntroGridProps> = ({ theme, smoothX, smoothY }) => {
  const isDark = theme === 'dark';

  // Indian flag palette:  saffron / India Green
  const saffronLine  = isDark ? 'rgba(255, 153, 51, 0.07)' : 'rgba(204, 102, 0, 0.07)';
  const greenLine    = isDark ? 'rgba(19, 136,  8, 0.05)'  : 'rgba(13,  92,  6, 0.05)';
  const navyLine     = isDark ? 'rgba(0,   0, 128, 0.05)'  : 'rgba(0,   0, 100, 0.04)';

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{
        transform: `perspective(1200px) rotateX(${-smoothY * 2}deg) rotateY(${smoothX * 2}deg) scale(1.04)`,
        transition: 'transform 0.15s ease-out',
      }}
    >
      {/* Primary saffron grid lines */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `linear-gradient(${saffronLine} 1px, transparent 1px), linear-gradient(90deg, ${saffronLine} 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          backgroundPosition: 'center center',
        }}
      />

      {/* India Green secondary grid — offset 24px for a tri-colour grid lattice */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `linear-gradient(${greenLine} 1px, transparent 1px), linear-gradient(90deg, ${greenLine} 1px, transparent 1px)`,
          backgroundSize: '96px 96px',
          backgroundPosition: 'center center',
        }}
      />

      {/* Dot array at intersections — saffron */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage: `radial-gradient(circle, ${isDark ? 'rgba(255,153,51,0.40)' : 'rgba(204,102,0,0.35)'} 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          backgroundPosition: 'center center',
        }}
      />

      {/* Corner coordinate labels — Indian flag mission metadata */}
      <div className="absolute top-6 left-6 font-mono text-[9px] opacity-40 select-none" style={{ color: isDark ? '#7a5c3a' : '#a05a20' }}>
        LAT: 13.0827° N • LON: 80.2707° E [SDSC-SHAR]
      </div>
      <div className="absolute top-6 right-6 font-mono text-[9px] opacity-40 select-none" style={{ color: isDark ? '#7a5c3a' : '#a05a20' }}>
        FREQ: 50 MHz • MIL-STD-883H CLAS-S
      </div>
      <div className="absolute bottom-6 left-6 font-mono text-[9px] opacity-40 select-none" style={{ color: isDark ? '#7a5c3a' : '#a05a20' }}>
        ESS OVEN: #01-A • N₂ ATMOSPHERE 99.8%
      </div>
      <div className="absolute bottom-6 right-6 font-mono text-[9px] opacity-40 select-none" style={{ color: isDark ? '#7a5c3a' : '#a05a20' }}>
        ARRHENIUS ACCEL: 125°C • Ea = 0.72 eV
      </div>
    </div>
  );
};

export default IntroGrid;
