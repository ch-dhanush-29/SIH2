import React, { useEffect, useState } from 'react';
import { fetchAuditLogs, AuditLogEntry } from '../../services/apiClient';
import { ShieldCheck, X, RefreshCw, Filter, Clock, User, Terminal } from 'lucide-react';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLogs();
      setLogs(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter(
    (l) => filterAction === 'ALL' || l.action.toLowerCase().includes(filterAction.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono tracking-tight flex items-center gap-2">
                System Audit Trail & QA Compliance Log
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Immutable
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Aerospace Traceability — All screening runs, threshold changes, and inspector overrides recorded
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadLogs}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
              title="Refresh Logs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-2.5 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Event:</span>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1 outline-none text-xs"
            >
              <option value="ALL">All Actions</option>
              <option value="SCREENING">Screening Runs</option>
              <option value="OVERRIDE">QA Overrides</option>
              <option value="LOGIN">User Logins</option>
              <option value="INGESTION">Data Ingestions</option>
            </select>
          </div>
          <div className="text-slate-500">
            Showing {filteredLogs.length} events
          </div>
        </div>

        {/* Logs Table */}
        <div className="flex-1 overflow-y-auto font-mono text-xs divide-y divide-slate-800/60 p-4 space-y-2">
          {filteredLogs.map((log) => {
            const isOverride = log.action.includes('OVERRIDE');
            const isScreening = log.action.includes('SCREENING');
            return (
              <div
                key={log.id}
                className="p-3 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-800/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isOverride
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : isScreening
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {log.action}
                    </span>
                    <span className="text-slate-300 font-bold">{log.resource_type}</span>
                    {log.resource_id && (
                      <span className="text-cyan-400">[{log.resource_id}]</span>
                    )}
                  </div>
                  {log.details_json && (
                    <div className="text-slate-400 text-[11px] truncate max-w-xl">
                      {log.details_json}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-slate-400 text-[11px] shrink-0">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3 text-slate-500" />
                    <span>{log.username}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-mono rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
