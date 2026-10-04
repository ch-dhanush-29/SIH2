import React from 'react';

interface IntroSystemStatusProps {
  theme: 'dark' | 'light';
  startStep: number;
}

interface SystemItem { key: string; name: string; detail: string; }

const SYSTEMS: SystemItem[] = [
  { key: 'twin',   name: 'DIGITAL TWIN 3D',   detail: '1,000 ICs • CHAMBER 01-A'      },
  { key: 'telem',  name: 'TELEMETRY STREAM',   detail: '50 MHz • 0.8ms LATENCY'        },
  { key: 'vision', name: 'VISION INSPECTION',  detail: '4K OPTICAL / THERMAL'          },
  { key: 'ai',     name: 'AI ANOMALY CORE',    detail: 'ARRHENIUS + MAD ENSEMBLE'      },
  { key: 'screen', name: 'SCREENING ENGINE',   detail: 'ZERO-FN PROTOCOL READY'        },
];

export const IntroSystemStatus: React.FC<IntroSystemStatusProps> = ({ theme, startStep }) => {
  const isDark = theme === 'dark';

  return (
    <div className="w-full max-w-md mx-auto my-3 font-mono text-[11px] select-none">
      <div
        className="p-3 rounded-[10px] border transition-all duration-300"
        style={{
          backgroundColor: isDark ? 'rgba(18, 8, 0, 0.88)' : 'rgba(255,255,255,0.92)',
          borderColor: isDark ? 'rgba(255,153,51,0.30)' : 'rgba(255,153,51,0.40)',
          boxShadow: isDark ? '0 4px 20px rgba(255,153,51,0.12)' : '0 2px 12px rgba(204,102,0,0.08)',
        }}
      >
        {/* Header row */}
        <div className="flex items-center justify-between pb-2 mb-2" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,153,51,0.20)' : 'rgba(255,153,51,0.25)'}` }}>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: isDark ? '#7a5c3a' : '#a05a20' }}>
            SYSTEM INITIALIZATION
          </span>
          <span className="text-[10px] font-semibold" style={{ color: '#ff9933' }}>
            {startStep >= 5 ? '5/5 VERIFIED' : `${Math.min(startStep, 5)}/5 BOOTING`}
          </span>
        </div>

        {/* Status rows */}
        <div className="space-y-1.5">
          {SYSTEMS.map((sys, idx) => {
            const isReady   = startStep > idx;
            const isCurrent = startStep === idx;

            return (
              <div key={sys.key} className="flex items-center justify-between transition-opacity duration-200"
                style={{ opacity: startStep >= idx ? 1 : 0.28 }}>
                <div className="flex items-center gap-2">
                  {isReady ? (
                    /* India Green ready dot */
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#138808', boxShadow: '0 0 8px #138808' }} />
                  ) : isCurrent ? (
                    /* Saffron spinning boot indicator */
                    <span className="w-2 h-2 rounded-full border-t-transparent animate-spin"
                      style={{ borderWidth: '2px', borderStyle: 'solid', borderColor: '#ff9933' }} />
                  ) : (
                    /* Navy pending dot */
                    <span className="w-2 h-2 rounded-full opacity-40" style={{ backgroundColor: '#000080' }} />
                  )}
                  <span className="font-semibold tracking-tight"
                    style={{ color: isReady ? (isDark ? '#ffffff' : '#1a0d00') : (isDark ? '#7a5c3a' : '#a05a20') }}>
                    {sys.name}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline text-[9px]" style={{ color: isDark ? '#7a5c3a' : '#a05a20' }}>
                    {sys.detail}
                  </span>
                  <span className="text-[10px] font-bold"
                    style={{
                      color: isReady ? '#138808' : isCurrent ? '#ff9933' : (isDark ? '#4d2600' : '#cc9966'),
                    }}>
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
