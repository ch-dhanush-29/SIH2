import React, { useRef, useState } from 'react';
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
    const cx = rect.width / 2, cy = rect.height / 2;
    setOffset({ x: ((relX - cx) / cx) * 4.5, y: ((relY - cy) / cy) * 4.5 });
  };

  const handlePointerLeave = () => { setIsHovered(false); setOffset({ x: 0, y: 0 }); };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
  };

  // Indian flag tri-colour button: deep black body, saffron border and text
  const borderColor    = isHovered ? '#FFB566' : '#FF9933';
  const shadowColor    = isHovered ? 'rgba(255,153,51,0.55)' : 'rgba(255,153,51,0.30)';
  const bgColor        = isDark ? '#0a0500' : '#fff8f0';
  const textColor      = '#FF9933';

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
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${isStarting ? 0.95 : isHovered ? 1.04 : 1.0})`,
          transition: isHovered ? 'transform 0.12s ease-out' : 'transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease',
          backgroundColor: bgColor,
          color: textColor,
          border: `1.5px solid ${borderColor}`,
          boxShadow: `0 0 ${isHovered ? '36px' : '20px'} ${shadowColor}`,
        }}
        className="group relative overflow-hidden px-8 py-3.5 rounded-[12px] font-display font-bold text-sm tracking-wide flex items-center gap-3 cursor-pointer outline-none transition-all duration-300"
      >
        {/* Tri-colour shimmer bar: saffron → white → green */}
        <div
          className="absolute inset-y-0 left-0 w-1 opacity-80"
          style={{ background: 'linear-gradient(to bottom, #FF9933 33%, #ffffff 33% 66%, #138808 66%)' }}
        />

        {/* Radial saffron glow following cursor */}
        {isHovered && (
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(circle 90px at ${mousePos.x}px ${mousePos.y}px, rgba(255,153,51,0.20), transparent 80%)` }} />
        )}

        {/* White shimmer sweep */}
        <div
          className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }}
        />

        {/* Content */}
        <span className="relative z-10 flex items-center gap-2 pl-3">
          <Sparkles className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" style={{ color: '#FF9933' }} />
          <span style={{ color: textColor }}>START BURNWATCH</span>
        </span>

        <ArrowRight className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:translate-x-1.5" style={{ color: textColor }} />
      </button>

      {/* Keyboard shortcut hint */}
      <span className="text-[10px] font-mono opacity-60 mt-2 select-none" style={{ color: isDark ? '#7a5c3a' : '#a05a20' }}>
        PRESS{' '}
        <kbd className="px-1 py-0.5 rounded text-[9px]"
          style={{ backgroundColor: isDark ? 'rgba(255,153,51,0.10)' : 'rgba(255,153,51,0.12)', border: '1px solid rgba(255,153,51,0.35)', color: '#FF9933' }}>
          ENTER
        </kbd>
        {' '}OR CLICK TO INITIALIZE
      </span>
    </div>
  );
};

export default IntroStartButton;
