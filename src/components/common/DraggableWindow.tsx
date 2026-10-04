import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  useWindowManagerStore,
  getDefaultWindowPosition,
  WindowPosition,
} from '../../state/useWindowManagerStore';
import {
  GripHorizontal,
  Minus,
  Maximize2,
  RotateCcw,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface DraggableWindowProps {
  id: string;
  title: string;
  icon?: React.ReactNode;
  headerRight?: React.ReactNode;
  minimizedContent?: React.ReactNode;
  className?: string;
  width?: string;
  maxHeight?: string;
  closable?: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}

export const DraggableWindow: React.FC<DraggableWindowProps> = ({
  id,
  title,
  icon,
  headerRight,
  minimizedContent,
  className = '',
  width = 'w-96 sm:w-[440px]',
  maxHeight = 'max-h-[calc(100vh-165px)]',
  closable = false,
  onClose,
  children,
}) => {
  const winConfig = useWindowManagerStore((state) => state.windows[id]);
  const updatePosition = useWindowManagerStore((state) => state.updatePosition);
  const toggleMinimize = useWindowManagerStore((state) => state.toggleMinimize);
  const bringToFront = useWindowManagerStore((state) => state.bringToFront);
  const resetPosition = useWindowManagerStore((state) => state.resetPosition);
  const setOpen = useWindowManagerStore((state) => state.setOpen);

  const windowRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initLeft: number; initTop: number }>({
    startX: 0,
    startY: 0,
    initLeft: 0,
    initTop: 0,
  });

  const [isDragging, setIsDragging] = useState(false);

  // If window is not in store yet or is closed, don't render
  const isOpen = winConfig ? winConfig.isOpen : true;
  const isMinimized = winConfig ? winConfig.isMinimized : false;
  const zIndex = winConfig ? winConfig.zIndex : 30;

  // Determine current position (custom position or default home position)
  const currentPos: WindowPosition = winConfig?.position || getDefaultWindowPosition(id);

  // Handle pointer down on drag header
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Prevent dragging if user clicked an interactive control (button, input, select, link)
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, textarea, a, [role="button"]')) {
      return;
    }

    bringToFront(id);

    const el = windowRef.current;
    if (!el) return;

    // Capture pointer to track dragging seamlessly across the screen
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const rect = el.getBoundingClientRect();
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initLeft: rect.left,
      initTop: rect.top,
    };
    isDraggingRef.current = true;
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;

    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    const el = windowRef.current;
    const elWidth = el ? el.offsetWidth : 380;
    const elHeight = el ? el.offsetHeight : 200;

    // Viewport boundary clamping: topNav is ~145px, bottom is window.innerHeight
    const minX = 8;
    const maxX = Math.max(minX, window.innerWidth - elWidth - 8);
    const minY = 145;
    const maxY = Math.max(minY, window.innerHeight - Math.min(elHeight, 60) - 8);

    const rawX = dragStartRef.current.initLeft + dx;
    const rawY = dragStartRef.current.initTop + dy;

    const clampedX = Math.min(Math.max(minX, rawX), maxX);
    const clampedY = Math.min(Math.max(minY, rawY), maxY);

    updatePosition(id, { x: Math.round(clampedX), y: Math.round(clampedY) });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore if not captured
      }
    }
  };

  const handleResetPosition = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetPosition(id);
  };

  const handleToggleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleMinimize(id);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClose) {
      onClose();
    } else {
      setOpen(id, false);
    }
  };

  if (!isOpen) return null;

  // Render MINIMIZED floating pill
  if (isMinimized) {
    return (
      <div
        ref={windowRef}
        onPointerDown={() => bringToFront(id)}
        style={{
          position: 'fixed',
          left: `${currentPos.x}px`,
          top: `${currentPos.y}px`,
          zIndex: zIndex,
        }}
        className={`pointer-events-auto select-none transition-shadow ${
          isDragging ? 'shadow-2xl ring-2 ring-[var(--accent)] cursor-grabbing' : 'shadow-lg'
        }`}
      >
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={handleToggleMinimize}
          className="mission-hud flex items-center gap-2.5 px-3 py-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface-elevated)]/96 backdrop-blur-2xl text-[var(--text-primary)] cursor-grab hover:border-[var(--accent)]/50 transition-colors"
          title="Drag with mouse pointer to relocate. Double-click to expand."
        >
          {/* Drag Grip Indicator */}
          <GripHorizontal className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />

          {/* Window Icon */}
          {icon && <div className="text-[var(--accent)] shrink-0">{icon}</div>}

          {/* Title */}
          <span className="font-display font-bold text-xs tracking-tight uppercase whitespace-nowrap">
            {title}
          </span>

          {/* Minimized Content Preview */}
          {minimizedContent && (
            <div className="hidden sm:flex items-center text-xs font-mono text-[var(--accent)] bg-[var(--surface)] px-2 py-0.5 rounded-[5px] border border-[var(--border)] shrink-0">
              {minimizedContent}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-1 ml-auto shrink-0 pl-1">
            <button
              onClick={handleResetPosition}
              className="p-1 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors"
              title="Reset to default position"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
            <button
              onClick={handleToggleMinimize}
              className="p-1 rounded-[4px] text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors"
              title="Expand Window"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            {closable && (
              <button
                onClick={handleClose}
                className="p-1 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-rose-500/10 transition-colors"
                title="Close"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render EXPANDED Draggable Window
  return (
    <div
      ref={windowRef}
      onPointerDown={() => bringToFront(id)}
      style={{
        position: 'fixed',
        left: `${currentPos.x}px`,
        top: `${currentPos.y}px`,
        zIndex: zIndex,
      }}
      className={`pointer-events-auto select-none flex flex-col ${width} ${className} ${
        isDragging ? 'shadow-2xl ring-2 ring-[var(--accent)]' : ''
      }`}
    >
      <div
        className={`mission-hud rounded-[10px] border border-[var(--border)] shadow-[var(--shadow-panel)] flex flex-col overflow-hidden ${maxHeight} bg-[var(--surface-elevated)]/96 backdrop-blur-2xl transition-all duration-150`}
      >
        {/* AEROSPACE DRAGGABLE WINDOW HEADER */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={handleToggleMinimize}
          className={`flex items-center justify-between px-3 py-2 bg-[var(--surface)]/80 border-b border-[var(--border)] shrink-0 transition-colors select-none ${
            isDragging ? 'cursor-grabbing bg-[var(--surface)]' : 'cursor-grab hover:bg-[var(--surface)]/95'
          }`}
          title="Drag by header with mouse pointer to relocate. Double-click to minimize."
        >
          {/* Left: Drag Handle, Icon, and Title */}
          <div className="flex items-center gap-2 min-w-0 pointer-events-none">
            <GripHorizontal className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
            {icon && <div className="text-[var(--accent)] shrink-0">{icon}</div>}
            <span className="font-display font-semibold text-xs tracking-tight text-[var(--text-primary)] truncate uppercase">
              {title}
            </span>
          </div>

          {/* Right: Custom header content + Window controls */}
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {headerRight}

            {/* Reset to Default Position Button */}
            <button
              onClick={handleResetPosition}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-[5px] hover:bg-[var(--surface)] transition-colors"
              title="Reset position to default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Minimize Button */}
            <button
              onClick={handleToggleMinimize}
              className="text-[var(--text-muted)] hover:text-[var(--accent)] p-1 rounded-[5px] hover:bg-[var(--surface)] transition-colors"
              title="Minimize to compact dock pill"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            {/* Optional Close Button */}
            {closable && (
              <button
                onClick={handleClose}
                className="text-[var(--text-muted)] hover:text-[var(--danger)] p-1 rounded-[5px] hover:bg-rose-500/10 transition-colors"
                title="Close Window"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* WINDOW BODY / CONTENT */}
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 select-text">
          {children}
        </div>
      </div>
    </div>
  );
};
