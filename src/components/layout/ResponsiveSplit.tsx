import React, { useState } from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import { BurnInCanvas } from '../viewport3d/BurnInCanvas';
import { TimeScrubber } from '../controls/TimeScrubber';
import { DetectionControls } from '../controls/DetectionControls';
import { QAInspectorReport } from '../panels/QAInspectorReport';
import { EvaluationDashboard } from '../panels/EvaluationDashboard';
import { MethodComparison } from '../panels/MethodComparison';
import { DataUploaderModal } from '../panels/DataUploaderModal';
import {
  FileText,
  Activity,
  Layers,
  UploadCloud,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

export const ResponsiveSplit: React.FC = () => {
  const activePanelTab = useBurnInStore((state) => state.activePanelTab);
  const setActivePanelTab = useBurnInStore((state) => state.setActivePanelTab);
  const isComputing = useBurnInStore((state) => state.isComputing);

  // Mobile Bottom Sheet expanded state
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  const tabs: {
    id: 'EXPLAIN' | 'EVALUATION' | 'COMPARISON' | 'UPLOAD';
    label: string;
    icon: React.ReactNode;
  }[] = [
    { id: 'EXPLAIN', label: 'QA Inspector', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'EVALUATION', label: 'Evaluation & Metrics', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'COMPARISON', label: 'Method Bench', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'UPLOAD', label: 'Data Ingestion', icon: <UploadCloud className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex-1 flex flex-col md:flex-row w-full h-[calc(100vh-50px)] overflow-hidden relative">
      {/* LEFT / CENTER VIEWPORT (3D Canvas + Controls) */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-black">
        {/* 3D R3F Viewport */}
        <div className="flex-1 w-full h-full relative">
          <BurnInCanvas />

          {/* Loading indicator overlay during batch computation */}
          {isComputing && (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-30 flex items-center justify-center pointer-events-none">
              <div className="mission-card px-4 py-2.5 rounded-xl border border-cyan-400/40 text-xs font-mono text-cyan-300 flex items-center gap-2.5 shadow-2xl">
                <span className="w-3 h-3 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                <span>Computing AI screening & drift projections...</span>
              </div>
            </div>
          )}
        </div>

        {/* Floating Bottom Time Scrubber & Quick Controls */}
        <div className="absolute bottom-3 left-4 right-4 md:right-auto md:w-[480px] z-20 pointer-events-auto">
          <TimeScrubber />
        </div>
      </div>

      {/* RIGHT SIDEBAR (Desktop) / BOTTOM SHEET (Mobile) */}
      <div
        className={`w-full md:w-[460px] lg:w-[500px] xl:w-[540px] bg-slate-50 dark:bg-[#090c14] border-l border-slate-200 dark:border-cyan-500/20 flex flex-col h-full z-20 transition-transform duration-300 ${
          isMobileSheetOpen
            ? 'fixed inset-x-0 bottom-0 h-[82vh] md:relative md:h-full shadow-2xl md:shadow-none'
            : 'hidden md:flex'
        }`}
      >
        {/* Mobile Drag Handle */}
        <div className="md:hidden flex items-center justify-between px-4 py-2 bg-slate-200 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-800">
          <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300 font-mono">
            BurnWatch Telemetry & QA Panels
          </span>
          <button
            onClick={() => setIsMobileSheetOpen(false)}
            className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Upper Segment: Dynamic Outlier & Detection Controls */}
        <div className="p-3 border-b border-slate-200 dark:border-cyan-500/20 bg-white/60 dark:bg-slate-950/40 shrink-0">
          <DetectionControls />
        </div>

        {/* Panel Navigation Tabs */}
        <div className="flex items-center gap-1 px-3 pt-2.5 bg-slate-100 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 shrink-0">
          {tabs.map((tab) => {
            const isActive = activePanelTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActivePanelTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-medium rounded-t-lg transition-all border-t border-x -mb-[1px] ${
                  isActive
                    ? 'bg-slate-50 dark:bg-[#090c14] text-cyan-700 dark:text-cyan-300 border-slate-300 dark:border-cyan-500/30 border-b-slate-50 dark:border-b-[#090c14] shadow-sm font-semibold'
                    : 'bg-transparent text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Panel Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {activePanelTab === 'EXPLAIN' && <QAInspectorReport />}
          {activePanelTab === 'EVALUATION' && <EvaluationDashboard />}
          {activePanelTab === 'COMPARISON' && <MethodComparison />}
          {activePanelTab === 'UPLOAD' && <DataUploaderModal />}
        </div>
      </div>

      {/* Mobile Floating Action Button to open bottom sheet */}
      {!isMobileSheetOpen && (
        <button
          onClick={() => setIsMobileSheetOpen(true)}
          className="md:hidden fixed bottom-24 right-4 z-40 p-3 rounded-full bg-cyan-500 text-slate-950 font-bold shadow-2xl flex items-center gap-2 border border-cyan-300"
        >
          <FileText className="w-4 h-4" />
          <span className="text-xs font-mono">QA Inspector</span>
          <ChevronUp className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
