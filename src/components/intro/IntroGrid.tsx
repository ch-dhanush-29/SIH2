import React from 'react';

interface IntroGridProps {
  theme: 'dark' | 'light';
  smoothX: number;
  smoothY: number;
}

export const IntroGrid: React.FC<IntroGridProps> = ({ theme, smoothX, smoothY }) => {
  const isDark = theme === 'dark';

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden transition-opacity duration-1000"
      style={{
        transform: `perspective(1200px) rotateX(${-smoothY * 2}deg) rotateY(${smoothX * 2}deg) scale(1.04)`,
        transition: 'transform 0.15s ease-out',
      }}
    >
      {/* Precision Engineering Grid */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: isDark
            ? 'linear-gradient(rgba(32, 214, 232, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(32, 214, 232, 0.07) 1px, transparent 1px)'
            : 'linear-gradient(rgba(8, 126, 164, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(8, 126, 164, 0.07) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          backgroundPosition: 'center center',
        }}
      />

      {/* Grid Dot Array at intersections */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage: isDark
            ? 'radial-gradient(circle, rgba(32, 214, 232, 0.35) 1px, transparent 1px)'
            : 'radial-gradient(circle, rgba(8, 126, 164, 0.35) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          backgroundPosition: 'center center',
        }}
      />

      {/* Subtle Coordinate Crosshairs in 4 corners */}
      <div className="absolute top-6 left-6 font-mono text-[9px] text-[var(--text-muted)] opacity-40 select-none">
        LAT: 13.0827° N • LON: 80.2707° E [SDSC-SHAR]
      </div>
      <div className="absolute top-6 right-6 font-mono text-[9px] text-[var(--text-muted)] opacity-40 select-none">
        FREQ: 50 MHz • MIL-STD-883H CLAS-S
      </div>
      <div className="absolute bottom-6 left-6 font-mono text-[9px] text-[var(--text-muted)] opacity-40 select-none">
        ESS OVEN: #01-A • N₂ ATMOSPHERE 99.8%
      </div>
      <div className="absolute bottom-6 right-6 font-mono text-[9px] text-[var(--text-muted)] opacity-40 select-none">
        ARRHENIUS ACCEL: 125°C • Ea = 0.72 eV
      </div>
    </div>
  );
};
export default IntroGrid;
