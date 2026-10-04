import React, { useEffect, useState } from 'react';
import { fetchAuditLogs, AuditLogEntry } from '../../services/apiClient';
import { ShieldCheck, X, RefreshCw, Filter, Clock, User } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-[var(--surface-elevated)] border border-[var(--border)] rounded-[10px] shadow-[var(--shadow-floating)] overflow-hidden flex flex-col max-h-[85vh] text-[var(--text-primary)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] bg-slate-100/90 dark:bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[7px] bg-[var(--accent-soft)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--accent)]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-display font-bold tracking-tight flex items-center gap-2">
                System Audit Trail & QA Compliance Log
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                  Immutable
                </span>
              </h2>
              <p className="text-xs font-sans text-[var(--text-muted)]">
                Aerospace Traceability — All screening runs, threshold changes, and inspector overrides recorded
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={loadLogs}
              disabled={loading}
              className="p-1.5 rounded-[7px] text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="Refresh Logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-[7px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-950/40 border-b border-[var(--border)] flex items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Event:</span>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-white dark:bg-slate-800 text-[var(--text-primary)] border border-[var(--border)] rounded px-2 py-1 outline-none text-xs"
            >
              <option value="ALL">All Actions</option>
              <option value="SCREENING">Screening Runs</option>
              <option value="OVERRIDE">QA Overrides</option>
              <option value="LOGIN">User Logins</option>
              <option value="INGESTION">Data Ingestions</option>
            </select>
          </div>
          <div className="text-[var(--text-muted)]">
            Showing {filteredLogs.length} events
          </div>
        </div>

        {/* Logs Table */}
        <div className="flex-1 overflow-y-auto font-mono text-xs p-4 space-y-2">
          {filteredLogs.map((log) => {
            const isOverride = log.action.includes('OVERRIDE');
            const isScreening = log.action.includes('SCREENING');
            return (
              <div
                key={log.id}
                className="p-3 rounded-xl border border-[var(--border)] bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-2 shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isOverride
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                          : isScreening
                          ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border-accent)]'
                          : 'bg-slate-200 dark:bg-slate-800 text-[var(--text-secondary)]'
                      }`}
                    >
                      {log.action}
                    </span>
                    <span className="font-bold text-[var(--text-primary)]">{log.resource_type}</span>
                    {log.resource_id && (
                      <span className="text-[var(--accent)]">[{log.resource_id}]</span>
                    )}
                  </div>
                  {log.details_json && (
                    <div className="text-[var(--text-secondary)] text-[11px] truncate max-w-xl">
                      {log.details_json}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-[var(--text-muted)] text-[11px] shrink-0">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3 text-[var(--text-muted)]" />
                    <span>{log.username}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--border)] bg-slate-100/90 dark:bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-mono rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-[var(--text-primary)] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
