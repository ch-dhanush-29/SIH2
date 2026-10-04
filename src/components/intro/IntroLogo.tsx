import React from 'react';

interface IntroLogoProps {
  theme: 'dark' | 'light';
  smoothX: number;
  smoothY: number;
  isRevealed: boolean;
  isStarting?: boolean;
}

export const IntroLogo: React.FC<IntroLogoProps> = ({
  theme,
  smoothX,
  smoothY,
  isRevealed,
  isStarting = false,
}) => {
  const isDark = theme === 'dark';

  // Parallax translation: subtle depth layer
  const tx = smoothX * 10;
  const ty = smoothY * 10;

  return (
    <div
      className="relative z-20 flex flex-col items-center select-none"
      style={{
        transform: `translate(${tx}px, ${ty}px) scale(${isStarting ? 1.08 : isRevealed ? 1 : 0.94})`,
        opacity: isRevealed ? 1 : 0,
        transition: 'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s ease',
      }}
    >
      {/* Precision Aerospace Badge / Frame for Official ISRO Mark */}
      <div className="relative group">
        {/* Subtle Ambient Glow Behind Badge */}
        <div
          className="absolute -inset-2 rounded-[16px] opacity-75 blur-xl transition-all duration-700"
          style={{
            background: isDark
              ? 'radial-gradient(circle, rgba(32, 214, 232, 0.25) 0%, rgba(243, 112, 35, 0.15) 50%, transparent 80%)'
              : 'radial-gradient(circle, rgba(8, 126, 164, 0.20) 0%, rgba(243, 112, 35, 0.12) 50%, transparent 80%)',
          }}
        />

        {/* Authentic Official ISRO Logo Presentation Aperture */}
        <div
          className={`relative px-5 py-3.5 rounded-[12px] transition-all duration-500 flex items-center justify-center ${
            isDark
              ? 'bg-white/95 shadow-[0_0_30px_rgba(32,214,232,0.22)] border border-cyan-400/40 ring-1 ring-cyan-400/20'
              : 'bg-white/95 shadow-[0_4px_24px_rgba(8,126,164,0.15)] border border-slate-200 ring-1 ring-sky-500/20'
          }`}
        >
          {/* Official ISRO Logo Asset provided by project - 100% Proportions Preserved */}
          <img
            src="/assets/isro-logo.webp"
            alt="Official ISRO Logo - Indian Space Research Organisation"
            className="w-36 sm:w-44 h-auto object-contain block select-none pointer-events-none drop-shadow-sm"
          />

          {/* Technical Corner Brackets */}
          <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-cyan-500/60 pointer-events-none" />
          <div className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-cyan-500/60 pointer-events-none" />
          <div className="absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 border-cyan-500/60 pointer-events-none" />
          <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-cyan-500/60 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
export default IntroLogo;
