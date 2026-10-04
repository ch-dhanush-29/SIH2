import React from 'react';
import { DataUploaderModal } from './DataUploaderModal';
import { EvaluationDashboard } from './EvaluationDashboard';
import { MethodComparison } from './MethodComparison';
import { UploadCloud, BarChart2, GitCompare, X, ShieldAlert } from 'lucide-react';

interface EngineeringModalProps {
  isOpen: boolean;
  activeTab: 'UPLOAD' | 'EVALUATION' | 'COMPARISON';
  onTabChange: (tab: 'UPLOAD' | 'EVALUATION' | 'COMPARISON') => void;
  onClose: () => void;
}

export const EngineeringModal: React.FC<EngineeringModalProps> = ({
  isOpen,
  activeTab,
  onTabChange,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl mission-hud border border-[var(--border)] shadow-2xl overflow-hidden bg-[var(--surface-elevated)] text-[var(--text-primary)]">
        {/* Top Header with Tab Switcher */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-slate-100/80 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--accent-soft)] border border-[var(--border-accent)] text-[var(--accent)]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-mono text-[var(--accent)] tracking-wider uppercase">
                Engineering Diagnostics & Reliability Lab
              </h2>
              <p className="text-xs text-[var(--text-muted)] font-mono">
                ISRO Space-Grade Environmental Stress Screening (SIH26170)
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900 border border-[var(--border)] font-mono text-xs">
            <button
              onClick={() => onTabChange('UPLOAD')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'UPLOAD'
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border-accent)] font-bold shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-300/40 dark:hover:bg-slate-800/50'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>CSV INGESTION</span>
            </button>

            <button
              onClick={() => onTabChange('EVALUATION')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'EVALUATION'
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border-accent)] font-bold shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-300/40 dark:hover:bg-slate-800/50'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>RELIABILITY & F2</span>
            </button>

            <button
              onClick={() => onTabChange('COMPARISON')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'COMPARISON'
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border-accent)] font-bold shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-300/40 dark:hover:bg-slate-800/50'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>METHOD BENCHMARK</span>
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all"
            title="Close dialog (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {activeTab === 'UPLOAD' && <DataUploaderModal />}
          {activeTab === 'EVALUATION' && <EvaluationDashboard />}
          {activeTab === 'COMPARISON' && <MethodComparison />}
        </div>
      </div>
    </div>
  );
};
