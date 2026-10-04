import React, { useState, useMemo, useRef } from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import { PARAMETER_CONFIGS } from '../../types/burnIn';
import {
  Search,
  Filter,
  AlertTriangle,
  XCircle,
  Clock,
  CheckCircle2,
  Crosshair,
  Cpu,
  RotateCcw,
  ZoomIn,
} from 'lucide-react';

export const Fallback2DView: React.FC = () => {
  const chips = useBurnInStore((state) => state.chips);
  const selectedChipId = useBurnInStore((state) => state.selectedChipId);
  const selectChip = useBurnInStore((state) => state.selectChip);
  const parameter = useBurnInStore((state) => state.parameter);
  const checkpoint = useBurnInStore((state) => state.checkpoint);
  const isColorblindMode = useBurnInStore((state) => state.isColorblindMode);
  const theme = useBurnInStore((state) => state.theme);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'SUSPECT' | 'REJECT' | 'PASS'>('ALL');

  // Pointer-Anchored Zoom & Pan State
  const [zoomScale, setZoomScale] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ startX: number; startY: number; initPanX: number; initPanY: number }>({
    startX: 0,
    startY: 0,
    initPanX: 0,
    initPanY: 0,
  });
  const viewportRef = useRef<HTMLDivElement>(null);

  const pcfg = PARAMETER_CONFIGS[parameter];
  const selectedChip = chips.find((c) => c.part_id === selectedChipId);

  const filteredChips = useMemo(() => {
    return chips.filter((c) => {
      const matchesSearch = c.part_id.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (filterType === 'SUSPECT') return c.verdict === 'LATENT_SUSPECT' || c.verdict === 'EARLY_REJECT';
      if (filterType === 'REJECT') return c.verdict === 'HARD_REJECT';
      if (filterType === 'PASS') return c.verdict === 'PASS';
      return true;
    });
  }, [chips, searchTerm, filterType]);

  // Pointer-Anchored Wheel Zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const container = viewportRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    const zoomSpeed = 0.0026;
    const clampedDelta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 140);
    const factor = Math.exp(-clampedDelta * zoomSpeed);
    const newScale = Math.min(Math.max(1.0, zoomScale * factor), 8.0);

    if (newScale === zoomScale) return;

    if (newScale <= 1.02) {
      setZoomScale(1.0);
      setPanOffset({ x: 0, y: 0 });
      return;
    }

    // Anchor zoom at pointer location:
    const newPanX = pointerX - (pointerX - panOffset.x) * (newScale / zoomScale);
    const newPanY = pointerY - (pointerY - panOffset.y) * (newScale / zoomScale);

    setZoomScale(newScale);
    setPanOffset({ x: newPanX, y: newPanY });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoomScale <= 1.0) return;
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    panStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initPanX: panOffset.x,
      initPanY: panOffset.y,
    };
    setIsPanning(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    const dx = e.clientX - panStartRef.current.startX;
    const dy = e.clientY - panStartRef.current.startY;
    setPanOffset({
      x: panStartRef.current.initPanX + dx,
      y: panStartRef.current.initPanY + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanning) {
      setIsPanning(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleResetZoom = () => {
    setZoomScale(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  const getChipStyle = (chip: typeof chips[0]) => {
    const isSelected = chip.part_id === selectedChipId;

    if (isSelected) {
      return {
        bg: theme === 'dark' ? 'bg-[#20D6E8]' : 'bg-[#087EA4]',
        border: 'border-white dark:border-white shadow-[0_0_12px_var(--accent)] ring-2 ring-cyan-400',
        textColor: theme === 'dark' ? 'text-slate-950 font-bold' : 'text-white font-bold',
      };
    }

    if (chip.verdict === 'HARD_REJECT') {
      return {
        bg: isColorblindMode ? 'bg-[#D55E00]' : 'bg-[#FF4268]',
        border: 'border-red-400/40',
        textColor: 'text-white',
      };
    }

    if (chip.verdict === 'EARLY_REJECT') {
      return {
        bg: isColorblindMode ? 'bg-[#CC79A7]' : 'bg-[#FF00AA]',
        border: 'border-fuchsia-400/40',
        textColor: 'text-white',
      };
    }

    if (chip.verdict === 'LATENT_SUSPECT') {
      return {
        bg: isColorblindMode ? 'bg-[#E69F00]' : 'bg-[#FFB020]',
        border: 'border-amber-400/50 shadow-[0_0_8px_rgba(255,176,32,0.4)] animate-pulse',
        textColor: 'text-slate-950 font-bold',
      };
    }

    // Nominal Pass
    return {
      bg: isColorblindMode
        ? 'bg-[#0072B2]'
        : theme === 'dark'
        ? 'bg-[#0C2433] hover:bg-[#133A52]'
        : 'bg-[#D1E5F2] hover:bg-[#B8DCF2]',
      border: theme === 'dark' ? 'border-cyan-500/25' : 'border-sky-500/30',
      textColor: theme === 'dark' ? 'text-cyan-300' : 'text-sky-900',
    };
  };

  return (
    <div className="w-full h-full pt-[154px] pb-16 px-4 md:pl-96 md:pr-96 flex flex-col bg-[var(--bg-primary)] overflow-hidden transition-colors duration-300 font-sans">
      {/* Carrier Map Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-[5px] bg-[var(--accent-soft)] border border-[var(--border-accent)] text-[var(--accent)]">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <h2 className="font-display font-bold text-sm tracking-tight text-[var(--text-primary)]">
                CARRIER MATRIX
              </h2>
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">
                TRAY ESS-04A • 1,000 COMPONENTS ({filteredChips.length} MATCHES)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Readout & Reset */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] bg-[var(--surface)] border border-[var(--border)] font-mono text-[10px]">
            <ZoomIn className="w-3 h-3 text-[var(--accent)]" />
            <span className="text-[var(--text-muted)]">ZOOM:</span>
            <span className="text-[var(--accent)] font-bold">{zoomScale.toFixed(1)}X</span>
            {zoomScale > 1.05 && (
              <button
                onClick={handleResetZoom}
                className="ml-1 p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                title="Reset Zoom to 1.0X"
              >
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search IC ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-[6px] pl-7 pr-2.5 py-1 text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)] font-mono w-36 transition-colors"
            />
          </div>

          {/* Verdict Filter Controls */}
          <div className="flex items-center gap-0.5 bg-[var(--surface)] p-0.5 rounded-[6px] border border-[var(--border)] text-[10px] font-display">
            {(['ALL', 'SUSPECT', 'REJECT', 'PASS'] as const).map((ft) => (
              <button
                key={ft}
                onClick={() => setFilterType(ft)}
                className={`px-2 py-0.5 rounded-[4px] transition-colors ${
                  filterType === ft
                    ? 'bg-[var(--accent)] text-slate-950 font-bold shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {ft === 'ALL' ? 'ALL' : ft === 'SUSPECT' ? 'SUSPECTS' : ft === 'REJECT' ? 'REJECTS' : 'PASS'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Wafer Carrier Grid Viewport with Pointer-Anchored Zoom & Pan */}
      <div
        ref={viewportRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`flex-1 overflow-hidden my-2.5 p-3 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] relative shadow-[var(--shadow-panel)] select-none ${
          zoomScale > 1.0 ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
        title="Point mouse pointer and scroll to zoom into that location. Drag to pan."
      >
        {/* Subtle Tray Quadrant Division Crosshairs */}
        <div className="absolute inset-0 pointer-events-none grid grid-cols-2 grid-rows-2">
          <div className="border-r border-b border-[var(--border)] opacity-30" />
          <div className="border-b border-[var(--border)] opacity-30" />
          <div className="border-r border-[var(--border)] opacity-30" />
          <div className="opacity-30" />
        </div>

        {/* 1,000 Component Micro-Package Grid with Pointer-Anchored Transform */}
        <div
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
            transformOrigin: '0 0',
            transition: isPanning ? 'none' : 'transform 0.08s ease-out',
          }}
          className="grid grid-cols-10 sm:grid-cols-20 md:grid-cols-25 lg:grid-cols-40 gap-1 relative z-10 w-full h-full"
        >
          {filteredChips.map((chip) => {
            const isSelected = chip.part_id === selectedChipId;
            const style = getChipStyle(chip);
            const val = chip.measurements[parameter][`v_${checkpoint}h`];

            return (
              <button
                key={chip.part_id}
                onClick={() => selectChip(chip.part_id)}
                title={`${chip.part_id} (R${chip.row}:C${chip.col})\nMeasured: ${val.toFixed(2)} ${pcfg.unit}\nStatus: ${chip.verdict}\nZ-Score: +${chip.robustZScore.toFixed(1)}σ`}
                className={`relative aspect-square rounded-[3px] border transition-all duration-150 flex items-center justify-center text-[8px] font-mono group cursor-pointer ${
                  style.bg
                } ${style.border} ${style.textColor} hover:scale-125 hover:z-20 hover:shadow-lg focus:outline-hidden`}
              >
                {/* Micro Silicon Die Corner Notch */}
                <span className="absolute top-[1.5px] left-[1.5px] w-[2px] h-[2px] rounded-full bg-white/40 pointer-events-none" />

                {/* Animated Crosshair Pulse for Selected IC */}
                {isSelected && (
                  <>
                    <span className="absolute inset-0 border-2 border-white rounded-[3px] animate-ping pointer-events-none" />
                    <Crosshair className="w-3.5 h-3.5 text-white animate-spin-slow pointer-events-none" />
                  </>
                )}

                {/* Colorblind symbol fallback */}
                {isColorblindMode && !isSelected && (
                  <span className="text-[7px] font-bold">
                    {chip.verdict === 'HARD_REJECT' ? '✕' : chip.verdict === 'LATENT_SUSPECT' ? '▲' : '●'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scientific Legend & Coordinate Readout Bar */}
      <div className="pt-2 border-t border-[var(--border)] flex flex-wrap items-center justify-between text-xs text-[var(--text-secondary)] font-mono shrink-0">
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-sky-600 border border-sky-400/40" />
            <span className="text-[var(--text-muted)]">Pass</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-amber-500 border border-amber-300 animate-pulse" />
            <span className="text-amber-600 dark:text-amber-400 font-semibold">Latent Suspect</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-rose-500 border border-rose-300" />
            <span className="text-rose-600 dark:text-rose-400 font-semibold">Hard Reject</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-[#FF00AA] border border-fuchsia-300" />
            <span className="text-fuchsia-500 font-semibold">Early Reject (24h)</span>
          </span>
        </div>

        {selectedChip ? (
          <div className="flex items-center gap-2 text-[11px] text-[var(--accent)] font-semibold">
            <span>ACTIVE: {selectedChip.part_id}</span>
            <span>•</span>
            <span>R{selectedChip.row}:C{selectedChip.col}</span>
            <span>•</span>
            <span>{selectedChip.currentValue.toFixed(2)} {pcfg.unit}</span>
          </div>
        ) : (
          <span className="text-[10px] text-[var(--text-muted)]">
            Point pointer & scroll to zoom into any semiconductor package
          </span>
        )}
      </div>
    </div>
  );
};
export default Fallback2DView;
