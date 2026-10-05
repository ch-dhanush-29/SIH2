import React, { useEffect, useState } from 'react';
import { X, Activity, Server, Radio, Database, Cpu, Wifi, Play, Square } from 'lucide-react';
import { useRealtimeStore } from '../../state/useRealtimeStore';

interface SystemDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemDiagnosticsModal: React.FC<SystemDiagnosticsModalProps> = ({ isOpen, onClose }) => {
  const {
    connectionStatus,
    latencyMs,
    eventsPerSecond,
    lastSequence,
    activeSubscriptions,
    isSimulatorActive,
    startSimulator,
    stopSimulator,
    startGoldenDemo,
    isGoldenDemoActive,
  } = useRealtimeStore();

  const [backendHealth, setBackendHealth] = useState<any>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchHealth = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/v1/health/');
        if (res.ok) {
          const data = await res.json();
          setBackendHealth(data);
        }
      } catch (e) {
        setBackendHealth(null);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="relative w-full max-w-2xl bg-[var(--surface-elevated)] border border-[var(--border-accent)] rounded-xl shadow-2xl p-6 font-sans text-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-[var(--accent)]" />
            <div>
              <h2 className="font-display font-bold text-base text-[var(--text-primary)]">
                REAL-TIME DISTRIBUTED SYSTEM DIAGNOSTICS
              </h2>
              <div className="font-mono text-[10px] text-[var(--text-muted)]">
                ISRO MIL-STD-883H DIGITAL-TWIN TELEMETRY PIPELINE
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real-Time Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
          {/* Connection Status */}
          <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            <div className="flex items-center gap-1.5 text-[var(--text-muted)] font-mono text-[10px] uppercase">
              <Wifi className="w-3.5 h-3.5" />
              <span>LIVE GATEWAY</span>
            </div>
            <div className="mt-1.5 font-display font-bold text-sm flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  connectionStatus === 'CONNECTED'
                    ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                    : connectionStatus === 'RECONNECTING'
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-rose-500'
                }`}
              />
              <span className="text-[var(--text-primary)]">{connectionStatus}</span>
            </div>
          </div>

          {/* Latency */}
          <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            <div className="flex items-center gap-1.5 text-[var(--text-muted)] font-mono text-[10px] uppercase">
              <Radio className="w-3.5 h-3.5" />
              <span>RTT LATENCY</span>
            </div>
            <div className="mt-1.5 font-display font-bold text-sm text-[var(--accent)]">
              {latencyMs > 0 ? `${latencyMs} ms` : '< 1 ms'}
            </div>
          </div>

          {/* Event Rate */}
          <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            <div className="flex items-center gap-1.5 text-[var(--text-muted)] font-mono text-[10px] uppercase">
              <Activity className="w-3.5 h-3.5" />
              <span>EVENT RATE</span>
            </div>
            <div className="mt-1.5 font-display font-bold text-sm text-[var(--warning)]">
              {eventsPerSecond} / sec
            </div>
          </div>

          {/* Monotonic Sequence */}
          <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            <div className="flex items-center gap-1.5 text-[var(--text-muted)] font-mono text-[10px] uppercase">
              <Server className="w-3.5 h-3.5" />
              <span>SEQUENCE #</span>
            </div>
            <div className="mt-1.5 font-mono font-bold text-sm text-[var(--text-primary)]">
              {lastSequence.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Infrastructure Topology */}
        <div className="space-y-2 mb-5 font-mono text-[11px]">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[var(--accent)]" />
              <span>DURABLE DATABASE</span>
            </div>
            <span className="font-semibold text-emerald-400">
              {backendHealth?.database === 'HEALTHY' ? 'POSTGRES / SQLITE READY' : 'OFFLINE'}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[var(--warning)]" />
              <span>EVENT BUS (REDIS PUB/SUB)</span>
            </div>
            <span className="font-semibold text-[var(--accent)]">
              {backendHealth?.redis_event_bus || 'FALLBACK_IN_MEMORY (ACTIVE)'}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[var(--text-secondary)]" />
              <span>TOPIC SUBSCRIPTIONS</span>
            </div>
            <span className="text-[var(--text-muted)]">{activeSubscriptions.join(' • ')}</span>
          </div>
        </div>

        {/* Simulator & Real-Time Controls */}
        <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => (isSimulatorActive ? stopSimulator() : startSimulator())}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold font-display transition-all ${
                isSimulatorActive
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border-accent)] hover:bg-[var(--accent)] hover:text-black'
              }`}
            >
              {isSimulatorActive ? <Square className="w-3.5 h-3.5 fill-rose-400" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isSimulatorActive ? 'STOP SIMULATOR' : 'START SIMULATOR'}</span>
            </button>

            <button
              onClick={startGoldenDemo}
              disabled={isGoldenDemoActive}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold font-display bg-amber-500 hover:bg-amber-400 text-black shadow-md disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>BACKEND GOLDEN DEMO</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] font-medium text-[var(--text-secondary)]"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
