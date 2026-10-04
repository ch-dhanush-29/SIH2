import React, { useRef, useState, useEffect } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

interface IntroStartButtonProps {
  theme: 'dark' | 'light';
  isActive: boolean;
  onClick: () => void;
  isStarting?: boolean;
}

export const IntroStartButton: React.FC<IntroStartButtonProps> = ({
  theme,
  isActive,
  onClick,
  isStarting = false,
}) => {
  const isDark = theme === 'dark';
  const buttonRef = useRef<HTMLButtonElement>(null);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const btn = buttonRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    setMousePos({ x: relX, y: relY });

    // Subtle magnetic pull (3 to 5 pixels toward cursor)
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const magneticX = ((relX - centerX) / centerX) * 4.5;
    const magneticY = ((relY - centerY) / centerY) * 4.5;

    setOffset({ x: magneticX, y: magneticY });
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    setOffset({ x: 0, y: 0 });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div className="relative flex flex-col items-center select-none pt-2">
      <button
        ref={buttonRef}
        onClick={onClick}
        onPointerEnter={() => setIsHovered(true)}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onKeyDown={handleKeyDown}
        aria-label="Start BurnWatch 3D Mission Control"
        tabIndex={0}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${
            isStarting ? 0.95 : isHovered ? 1.03 : 1.0
          })`,
          transition: isHovered
            ? 'transform 0.12s ease-out'
            : 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease',
        }}
        className={`group relative overflow-hidden px-8 py-3.5 rounded-[12px] font-display font-bold text-sm tracking-wide transition-all duration-300 flex items-center gap-3 cursor-pointer outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 ${
          isDark
            ? 'bg-slate-950/80 text-[var(--accent)] border border-cyan-400/50 shadow-[0_0_24px_rgba(32,214,232,0.25)] hover:border-cyan-300 hover:shadow-[0_0_36px_rgba(32,214,232,0.45)]'
            : 'bg-white/95 text-[var(--accent)] border border-sky-500/40 shadow-[0_4px_20px_rgba(8,126,164,0.18)] hover:border-sky-500 hover:shadow-[0_6px_28px_rgba(8,126,164,0.28)]'
        }`}
      >
        {/* Soft Radial Highlight inside button following cursor */}
        {isHovered && (
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle 90px at ${mousePos.x}px ${mousePos.y}px, ${
                isDark ? 'rgba(32, 214, 232, 0.22)' : 'rgba(8, 126, 164, 0.16)'
              }, transparent 80%)`,
            }}
          />
        )}

        {/* Ambient Shimmer Bar */}
        <div
          className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent)',
          }}
        />

        {/* Button Content */}
        <span className="relative z-10 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--accent)] transition-transform duration-300 group-hover:scale-110" />
          <span>START BURNWATCH</span>
        </span>

        {/* Interactive Arrow with Hover Glide (4 to 6px) */}
        <ArrowRight
          className="w-4 h-4 relative z-10 text-[var(--accent)] transition-transform duration-300 group-hover:translate-x-1.5"
        />
      </button>

      {/* Keyboard Shortcut Subtext */}
      <span className="text-[10px] font-mono text-[var(--text-muted)] opacity-60 mt-2 select-none">
        PRESS <kbd className="px-1 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[9px]">ENTER</kbd> OR CLICK TO INITIALIZE
      </span>
    </div>
  );
};
export default IntroStartButton;
