import React, { useState, useEffect } from 'react';

interface IntroSystemStatusProps {
  theme: 'dark' | 'light';
  startStep: number; // 0 = idle, 1..5 = steps
}

interface SystemItem {
  key: string;
  name: string;
  detail: string;
}

const SYSTEMS: SystemItem[] = [
  { key: 'twin', name: 'DIGITAL TWIN 3D', detail: '1,000 ICs • CHAMBER 01-A' },
  { key: 'telem', name: 'TELEMETRY STREAM', detail: '50 MHz • 0.8ms LATENCY' },
  { key: 'vision', name: 'VISION INSPECTION', detail: '4K OPTICAL / THERMAL' },
  { key: 'ai', name: 'AI ANOMALY CORE', detail: 'ARRHENIUS + MAD ENSEMBLE' },
  { key: 'screen', name: 'SCREENING ENGINE', detail: 'ZERO-FN PROTOCOL READY' },
];

export const IntroSystemStatus: React.FC<IntroSystemStatusProps> = ({
  theme,
  startStep,
}) => {
  const isDark = theme === 'dark';

  return (
    <div className="w-full max-w-md mx-auto my-3 font-mono text-[11px] select-none">
      <div
        className={`p-3 rounded-[10px] border transition-all duration-300 ${
          isDark
            ? 'bg-slate-950/70 border-cyan-500/25 shadow-lg'
            : 'bg-white/80 border-slate-200 shadow-md'
        }`}
      >
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
          <span>SYSTEM INITIALIZATION</span>
          <span className="text-[var(--accent)] font-semibold">
            {startStep >= 5 ? '5/5 VERIFIED' : `${Math.min(startStep, 5)}/5 BOOTING`}
          </span>
        </div>

        <div className="space-y-1.5 pt-2">
          {SYSTEMS.map((sys, idx) => {
            const isReady = startStep > idx;
            const isCurrent = startStep === idx;

            return (
              <div
                key={sys.key}
                className="flex items-center justify-between transition-opacity duration-200"
                style={{ opacity: startStep >= idx ? 1 : 0.3 }}
              >
                <div className="flex items-center gap-2">
                  {/* Status Indicator */}
                  {isReady ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                  ) : isCurrent ? (
                    <span className="w-2 h-2 rounded-full border border-[var(--accent)] border-t-transparent animate-spin" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-600 opacity-50" />
                  )}

                  <span
                    className={`font-semibold tracking-tight ${
                      isReady
                        ? isDark ? 'text-slate-200' : 'text-slate-800'
                        : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {sys.name}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline text-[9px] text-[var(--text-muted)]">
                    {sys.detail}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${
                      isReady
                        ? 'text-emerald-500 dark:text-emerald-400'
                        : isCurrent
                        ? 'text-[var(--accent)] animate-pulse'
                        : 'text-slate-600'
                    }`}
                  >
                    {isReady ? 'READY' : isCurrent ? 'BOOTING' : 'WAIT'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default IntroSystemStatus;
