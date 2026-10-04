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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl mission-hud border border-cyan-500/40 shadow-2xl overflow-hidden bg-slate-900/95 text-slate-100">
        {/* Top Header with Tab Switcher */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-mono text-cyan-400 tracking-wider uppercase">
                Engineering Diagnostics & Reliability Lab
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                ISRO Space-Grade Environmental Stress Screening (SIH26170)
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs">
            <button
              onClick={() => onTabChange('UPLOAD')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'UPLOAD'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>CSV INGESTION</span>
            </button>

            <button
              onClick={() => onTabChange('EVALUATION')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'EVALUATION'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>RELIABILITY & F2</span>
            </button>

            <button
              onClick={() => onTabChange('COMPARISON')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'COMPARISON'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>METHOD BENCHMARK</span>
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all"
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
