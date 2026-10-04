import React, { useState } from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import { ChipData, ParameterType } from '../../types/burnIn';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  EyeOff,
  Eye,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from 'lucide-react';

export const DataUploaderModal: React.FC = () => {
  const loadCustomLot = useBurnInStore((state) => state.loadCustomLot);
  const parameter = useBurnInStore((state) => state.parameter);
  const addToast = useBurnInStore((state) => state.addToast);

  const [isBlindMode, setIsBlindMode] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Template CSV Generator
  const downloadTemplateCsv = () => {
    const header = 'part_id,lot_id,param,v_0h,v_24h,v_96h,v_168h,ground_truth\n';
    const rows = [
      'IC-BLIND-001,LOT-EVAL,iddq,10.2,10.6,10.9,11.2,NORMAL',
      'IC-BLIND-002,LOT-EVAL,iddq,9.8,10.1,10.4,10.8,NORMAL',
      'IC-BLIND-003,LOT-EVAL,iddq,10.5,10.9,11.2,11.5,NORMAL',
      'IC-BLIND-004,LOT-EVAL,iddq,18.4,26.8,38.5,46.2,LATENT_DEFECT',
      'IC-BLIND-005,LOT-EVAL,iddq,54.2,68.5,82.1,99.4,HARD_FAIL',
      'IC-BLIND-006,LOT-EVAL,iddq,11.1,11.4,11.8,12.1,NORMAL',
      'IC-BLIND-007,LOT-EVAL,iddq,19.2,28.4,41.0,48.5,LATENT_DEFECT',
      'IC-BLIND-008,LOT-EVAL,iddq,10.0,10.3,10.7,11.0,NORMAL',
    ].join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'BurnWatch_Screening_Template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
        if (lines.length < 2) {
          setErrorMsg('CSV must contain a header row and at least one data row.');
          return;
        }

        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const partIdx = headers.indexOf('part_id');
        const lotIdx = headers.indexOf('lot_id');
        const v0Idx = headers.indexOf('v_0h');
        const v24Idx = headers.indexOf('v_24h');
        const v96Idx = headers.indexOf('v_96h');
        const v168Idx = headers.indexOf('v_168h');
        const gtIdx = headers.indexOf('ground_truth');

        if (partIdx === -1 || v0Idx === -1 || v24Idx === -1) {
          setErrorMsg('CSV header must contain part_id, v_0h, and v_24h columns.');
          return;
        }

        const newChips: ChipData[] = [];
        const cols = Math.min(25, Math.ceil(Math.sqrt(lines.length * 2)));

        for (let i = 1; i < lines.length; i++) {
          const colsData = lines[i].split(',').map((c) => c.trim());
          if (colsData.length < 3) continue;

          const part_id = colsData[partIdx];
          const lot_id = lotIdx !== -1 ? colsData[lotIdx] : 'LOT-CUSTOM';
          const v0 = parseFloat(colsData[v0Idx]) || 10.0;
          const v24 = parseFloat(colsData[v24Idx]) || v0 * 1.05;
          const v96 = v96Idx !== -1 ? parseFloat(colsData[v96Idx]) || v24 * 1.08 : v24 * 1.08;
          const v168 = v168Idx !== -1 ? parseFloat(colsData[v168Idx]) || v96 * 1.08 : v96 * 1.08;
          const gt = (gtIdx !== -1 ? colsData[gtIdx] : 'NORMAL').toUpperCase() as any;

          const idx = i - 1;
          const row = Math.floor(idx / cols);
          const col = idx % cols;

          const defaultMeas = { v_0h: v0, v_24h: v24, v_96h: v96, v_168h: v168 };

          newChips.push({
            part_id,
            lot_id,
            row,
            col,
            trayX: (col - cols / 2) * 0.6,
            trayY: 0,
            trayZ: (row - 10) * 0.6,
            groundTruth: isBlindMode && !isRevealed ? 'NORMAL' : gt === 'LATENT_DEFECT' || gt === 'HARD_FAIL' ? gt : 'NORMAL',
            isGroundTruthDefect: gt !== 'NORMAL',
            measurements: {
              iddq: defaultMeas,
              leakage: { v_0h: v0 * 2, v_24h: v24 * 2, v_96h: v96 * 2, v_168h: v168 * 2 },
              propDelay: { v_0h: v0 * 0.5, v_24h: v24 * 0.5, v_96h: v96 * 0.5, v_168h: v168 * 0.5 },
            },
            currentValue: v24,
            robustZScore: 0,
            iqrDistance: 0,
            isoForestScore: 0.5,
            ensembleScore: 20,
            predictedSlope: (v24 - v0) / 24,
            actualSlope: (v168 - v0) / 168,
            predicted168h: v0 + ((v24 - v0) / 24) * 168,
            predictionInterval: [v0, v168 * 1.2],
            earlyReject: false,
            timeSavedHours: 0,
            passesStaticLimit: true,
            passesDynamicThreshold: true,
            verdict: 'PASS',
            justification: 'Ingested from custom CSV upload.',
            shapAttributions: [],
          });
        }

        if (newChips.length > 0) {
          loadCustomLot(newChips, `CSV: ${file.name}`);
        } else {
          setErrorMsg('No valid component records found in CSV.');
        }
      } catch (err: any) {
        setErrorMsg(`Failed to parse CSV: ${err?.message || err}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-4 p-4 text-slate-800 dark:text-slate-200">
      <div className="pb-2 border-b border-slate-200 dark:border-cyan-500/20">
        <h2 className="text-sm font-bold font-mono text-cyan-800 dark:text-cyan-300 flex items-center gap-2 uppercase tracking-wide">
          <UploadCloud className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span>Lot Data Ingestion & Blind Scoring Engine</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Upload measured burn-in datasets from production ATE test floors or run blind screening evaluations.
        </p>
      </div>

      {/* Hidden Ground Truth Blind Mode Toggle */}
      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {isBlindMode ? (
            <EyeOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          ) : (
            <Eye className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          )}
          <div>
            <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
              Hidden Ground-Truth (Blind Scoring Mode)
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Hides ground-truth labels for jury / blind screening evaluation until revealed.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setIsBlindMode(!isBlindMode);
            setIsRevealed(false);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono border transition-all ${
            isBlindMode
              ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          {isBlindMode ? 'BLIND MODE ACTIVE' : 'OPEN AUDIT MODE'}
        </button>
      </div>

      {/* Upload Dropzone */}
      <div className="border-2 border-dashed border-cyan-400/50 dark:border-cyan-500/30 rounded-xl p-6 flex flex-col items-center justify-center gap-3 bg-cyan-50/30 dark:bg-slate-950/60 hover:bg-cyan-50/70 dark:hover:bg-slate-900/40 transition-colors cursor-pointer text-center relative">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
        <div className="p-3 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
          <FileSpreadsheet className="w-7 h-7" />
        </div>
        <div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
            {fileName ? `Loaded: ${fileName}` : 'Drag & Drop Screening CSV or Click to Browse'}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 block">
            Expected columns: part_id, lot_id, param, v_0h, v_24h, v_96h, v_168h
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-500/60 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2 font-mono">
          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* CSV Template Download */}
      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span className="text-xs text-slate-700 dark:text-slate-300 font-mono">
            Standard Aerospace CSV Template
          </span>
        </div>

        <button
          onClick={downloadTemplateCsv}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-medium transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Template CSV</span>
        </button>
      </div>
    </div>
  );
};
