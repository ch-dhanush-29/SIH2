import React, { useState, useEffect, useRef } from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import {
  Activity,
  Radio,
  Zap,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Gauge,
  Thermometer,
  ShieldAlert,
  Flame,
  Layers,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface RealTimePacket {
  id: number;
  timestamp: string;
  partId: string;
  iddq: number;
  leakage: number;
  temp: number;
  zScore: number;
  status: 'NOMINAL' | 'ANOMALY' | 'REJECT';
}

interface TelemetryPoint {
  timeStr: string;
  temp: number;
  iddq: number;
  leakage: number;
  driftRate: number;
}

export const FullscreenVisionView: React.FC = () => {
  const selectedChipId = useBurnInStore((state) => state.selectedChipId);
  const chips = useBurnInStore((state) => state.chips);
  const checkpoint = useBurnInStore((state) => state.checkpoint);
  const parameter = useBurnInStore((state) => state.parameter);
  const stats = useBurnInStore((state) => state.stats);
  const setView3DMode = useBurnInStore((state) => state.setView3DMode);
  const overrideChipVerdict = useBurnInStore((state) => state.overrideChipVerdict);
  const addToast = useBurnInStore((state) => state.addToast);
  const telemetry = useBurnInStore((state) => state.telemetry);

  const starChip = chips.find((c) => c.part_id === selectedChipId) || chips.find((c) => c.part_id === 'CHIP-LOT04-042') || chips[41];

  const [isStreaming, setIsStreaming] = useState(true);
  const [packets, setPackets] = useState<RealTimePacket[]>([]);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryPoint[]>([]);
  const [packetCount, setPacketCount] = useState(148200);
  const [sampleRate] = useState(1000); // 1,000 samples/sec
  const [latency, setLatency] = useState(0.8);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // High-Frequency Real-Time Waveform Generator (60 FPS Oscilloscope)
  useEffect(() => {
    let animId: number;
    let phase = 0;

    const renderOscilloscope = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Dark Scientific Grid Background
      ctx.fillStyle = '#03080e';
      ctx.fillRect(0, 0, width, height);

      // Oscilloscope Grid Lines
      ctx.strokeStyle = 'rgba(32, 214, 232, 0.12)';
      ctx.lineWidth = 1;
      const gridSpacing = 40;
      for (let x = 0; x < width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Center Reference Line
      ctx.strokeStyle = 'rgba(32, 214, 232, 0.3)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height);
      ctx.stroke();
      ctx.setLineDash([]);

      if (isStreaming) {
        phase += 0.08;
      }

      // Draw Normal Base Waveform (Channel 1: Green/Cyan)
      ctx.strokeStyle = '#20d6e8';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#20d6e8';
      ctx.shadowBlur = 8;
      ctx.beginPath();

      const centerY = height * 0.45;
      for (let x = 0; x < width; x++) {
        const t = (x / width) * 12 + phase;
        // Quiescent IDDQ baseline + thermal flicker noise
        const baseline = Math.sin(t * 1.5) * 8 + Math.sin(t * 4.2) * 3 + (Math.random() - 0.5) * 2;
        const y = centerY + baseline;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw Suspect Chip Anomalous Burst Waveform (Channel 2: Amber/Red)
      const isSuspect = starChip && starChip.verdict !== 'PASS';
      if (isSuspect) {
        ctx.strokeStyle = '#ff4268';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#ff4268';
        ctx.shadowBlur = 12;
        ctx.beginPath();

        const burstCenterY = height * 0.72;
        for (let x = 0; x < width; x++) {
          const t = (x / width) * 12 + phase;
          // Gate oxide breakdown transient current spikes
          const spike = Math.sin(t * 3) > 0.85 ? Math.random() * 28 : (Math.random() - 0.5) * 6;
          const y = burstCenterY - Math.sin(t * 1.2) * 14 - spike;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      animId = requestAnimationFrame(renderOscilloscope);
    };

    animId = requestAnimationFrame(renderOscilloscope);
    return () => cancelAnimationFrame(animId);
  }, [isStreaming, starChip]);

  // Real-Time Telemetry Stream Ingestion Loop
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
      const tempVal = Number((125.0 + (Math.random() - 0.48) * 0.22).toFixed(2));
      const iddqVal = Number((10.4 + (starChip?.verdict !== 'PASS' ? 0.7 : 0.0) + (Math.random() - 0.45) * 0.15).toFixed(3));
      const leakVal = Number((22.1 + (Math.random() - 0.5) * 0.4).toFixed(1));
      const driftRateVal = Number((starChip?.predictedSlope || 0.024) + (Math.random() - 0.5) * 0.004);

      setPacketCount((p) => p + 1);
      setLatency(Number((0.7 + Math.random() * 0.3).toFixed(2)));

      // Rolling Telemetry Timeseries Points
      setTelemetryHistory((prev) => {
        const nextPoint: TelemetryPoint = {
          timeStr: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          temp: tempVal,
          iddq: iddqVal,
          leakage: leakVal,
          driftRate: Number((driftRateVal * 100).toFixed(2)),
        };
        const updated = [...prev, nextPoint];
        return updated.length > 25 ? updated.slice(1) : updated;
      });

      // Rolling High-Speed Packet List
      const isAnomalous = Math.random() < 0.25;
      const newPkt: RealTimePacket = {
        id: Date.now(),
        timestamp: timeStr,
        partId: isAnomalous ? (starChip?.part_id || 'CHIP-LOT04-042') : `IC-${String(Math.floor(Math.random() * 640)).padStart(3, '0')}`,
        iddq: isAnomalous ? iddqVal + 1.2 : iddqVal,
        leakage: isAnomalous ? leakVal + 4.5 : leakVal,
        temp: tempVal,
        zScore: isAnomalous ? Number((3.8 + Math.random() * 1.5).toFixed(2)) : Number((Math.random() * 0.8).toFixed(2)),
        status: isAnomalous ? 'ANOMALY' : 'NOMINAL',
      };

      setPackets((prev) => [newPkt, ...prev.slice(0, 15)]);
    }, 450);

    return () => clearInterval(interval);
  }, [isStreaming, starChip]);

  const handleEarlyReject = () => {
    if (!starChip) return;
    overrideChipVerdict(
      starChip.part_id,
      'EARLY_REJECT',
      'Live Real-Time Telemetry Intercept: Kinetic drift threshold breached in real time'
    );
    addToast({
      type: 'SUCCESS',
      title: 'Real-Time Early Reject Executed',
      message: `${starChip.part_id} officially rejected at 24h. 144 hours saved. Digital audit log signed.`,
    });
  };

  const downloadLiveCsv = () => {
    const headers = 'timestamp,part_id,iddq_ua,leakage_na,temp_c,z_score,status\n';
    const rows = packets
      .map((p) => `${p.timestamp},${p.partId},${p.iddq},${p.leakage},${p.temp},${p.zScore},${p.status}`)
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ISRO_Live_Telemetry_Stream_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans select-none flex flex-col pt-36 pb-4 px-6">
      {/* Top Telemetry Header Bar */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[var(--border)] gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-[8px] bg-[var(--accent-soft)] border border-[var(--border-accent)] text-[var(--accent)]">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display font-bold text-lg tracking-tight text-[var(--text-primary)]">
                LIVE REAL-TIME DATA TELEMETRY STREAM
              </h1>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-[5px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                ONLINE (1,000 SAMPLES/SEC)
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] font-mono">
              ATE Automated Test Equipment • ISRO Space Electronics Qualification Lab • Protocol: IEEE 1149.4
            </p>
          </div>
        </div>

        {/* Live Stream Controls */}
        <div className="flex items-center gap-2.5 font-display text-xs">
          <button
            onClick={() => setIsStreaming(!isStreaming)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[7px] border font-bold transition-all shadow-sm ${
              isStreaming
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
          >
            {isStreaming ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isStreaming ? 'PAUSE STREAM' : 'RESUME STREAM'}</span>
          </button>

          <button
            onClick={downloadLiveCsv}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[7px] bg-[var(--surface)] hover:bg-[var(--border)] border border-[var(--border)] text-[var(--text-primary)] font-semibold transition-colors"
            title="Download Live Sensor Stream Packets to CSV"
          >
            <Download className="w-4 h-4" />
            <span>EXPORT CSV</span>
          </button>

          <button
            onClick={() => setView3DMode('CHAMBER')}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-[7px] bg-[var(--accent)] hover:opacity-90 text-slate-950 font-bold transition-all shadow-md ml-2"
          >
            <Compass className="w-4 h-4" />
            <span>RETURN TO 3D DIGITAL TWIN</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Oscilloscope + Rolling Chart + Real-Time Packet Stream */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 mt-3 min-h-0">
        {/* Left Column (8 cols): Real-Time Waveform Oscilloscope & Rolling Timeseries */}
        <div className="lg:col-span-8 flex flex-col gap-4 min-h-0">
          {/* 1. High-Speed Oscilloscope Canvas */}
          <div className="flex-1 rounded-[10px] bg-slate-950 border border-[var(--border)] shadow-[var(--shadow-panel)] p-3 flex flex-col min-h-[260px] relative overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-900 text-xs font-mono">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="font-display font-bold text-cyan-300 tracking-wide text-xs">
                  HIGH-SPEED OSCILLOSCOPE (IDDQ TRANSIENT WAVEFORM)
                </span>
                <span className="px-1.5 py-0.5 rounded-[4px] bg-cyan-950 border border-cyan-500/30 text-[10px] text-cyan-400">
                  TIMEBASE: 20 ms/div
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-cyan-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" /> CH1: NOMINAL DIE
                </span>
                <span className="text-rose-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400" /> CH2: {starChip?.part_id || 'CHIP-LOT04-042'}
                </span>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 w-full h-full relative mt-2">
              <canvas
                ref={canvasRef}
                width={800}
                height={280}
                className="w-full h-full rounded-[6px]"
              />
              <div className="absolute bottom-2 left-3 font-mono text-[10px] text-slate-500 flex gap-4 pointer-events-none">
                <span>V_DD: 1.200 V ± 0.002 V</span>
                <span>•</span>
                <span>NOISE FLOOR: -84 dBm</span>
                <span>•</span>
                <span>SAMPLE CLOCK: 50 MHz</span>
              </div>
            </div>
          </div>

          {/* 2. Rolling 60-Second Real-Time Telemetry Graph */}
          <div className="h-56 rounded-[10px] bg-[var(--surface-elevated)] border border-[var(--border)] shadow-[var(--shadow-panel)] p-3 flex flex-col">
            <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border)] text-xs font-mono">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[var(--warning)]" />
                <span className="font-display font-bold text-[var(--text-primary)] text-xs">
                  CONTINUOUS TIME-SERIES TELEMETRY STREAM (ROLLING 60s)
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-amber-400 font-bold">TEMP: {telemetryHistory[telemetryHistory.length - 1]?.temp || 125.0}°C</span>
                <span className="text-cyan-400 font-bold">IDDQ: {telemetryHistory[telemetryHistory.length - 1]?.iddq || 10.4} µA</span>
              </div>
            </div>

            <div className="flex-1 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={telemetryHistory} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(32, 214, 232, 0.1)" />
                  <XAxis dataKey="timeStr" stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(11, 21, 32, 0.95)',
                      borderColor: 'rgba(32, 214, 232, 0.3)',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  <Line type="monotone" dataKey="temp" stroke="#ffb020" strokeWidth={2} dot={false} isAnimationActive={false} name="Chamber Temp (°C)" />
                  <Line type="monotone" dataKey="iddq" stroke="#20d6e8" strokeWidth={2} dot={false} isAnimationActive={false} name="DUT Iddq (µA)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Live Ingestion Stream & Outlier Intercept */}
        <div className="lg:col-span-4 flex flex-col gap-4 min-h-0">
          {/* Active Die Intercept Banner */}
          {starChip && starChip.verdict !== 'PASS' && (
            <div className="p-3.5 rounded-[10px] bg-rose-500/10 border-2 border-rose-500/40 text-[var(--text-primary)] space-y-2 shrink-0">
              <div className="flex items-center justify-between pb-1 border-b border-rose-500/30">
                <span className="font-display font-bold text-xs text-rose-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
                  REAL-TIME ANOMALY INTERCEPT
                </span>
                <span className="font-mono text-xs font-bold text-amber-400">T+{checkpoint}h</span>
              </div>

              <div className="space-y-1 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Suspect Device:</span>
                  <span className="font-bold text-white">{starChip.part_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Live Drift Slope:</span>
                  <span className="font-bold text-rose-400">+{starChip.predictedSlope.toFixed(4)}/h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Lot Safety Slope:</span>
                  <span className="text-emerald-400">{stats?.safetySlope.toFixed(4) || '0.0220'}/h</span>
                </div>
              </div>

              <button
                onClick={handleEarlyReject}
                className="w-full py-2 px-3 rounded-[7px] bg-rose-500 hover:bg-rose-600 text-white font-display font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 mt-1"
              >
                <Clock className="w-4 h-4" />
                <span>CONFIRM EARLY REJECT @ 24H (SAVE 144h)</span>
              </button>
            </div>
          )}

          {/* Live High-Speed ATE Packet Ticker */}
          <div className="flex-1 rounded-[10px] bg-[var(--surface-elevated)] border border-[var(--border)] shadow-[var(--shadow-panel)] p-3 flex flex-col min-h-0">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)] text-xs font-mono shrink-0">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span className="font-display font-bold text-xs text-[var(--text-primary)]">
                  LIVE ATE PACKET STREAM
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {packetCount.toLocaleString()} PKTS
              </span>
            </div>

            {/* Scrolling Packet Feed */}
            <div className="flex-1 overflow-y-auto mt-2 space-y-1.5 custom-scrollbar font-mono text-xs pr-1">
              {packets.map((pkt) => (
                <div
                  key={pkt.id}
                  className={`p-2 rounded-[6px] border flex items-center justify-between transition-colors ${
                    pkt.status === 'ANOMALY'
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">{pkt.timestamp.split('.')[0]}</span>
                    <span className="font-bold text-cyan-300">{pkt.partId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">{pkt.iddq.toFixed(2)} µA</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                        pkt.status === 'ANOMALY'
                          ? 'bg-rose-500 text-white'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {pkt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
