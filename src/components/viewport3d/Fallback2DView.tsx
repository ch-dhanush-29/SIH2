import React, { useState, useMemo } from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import { PARAMETER_CONFIGS } from '../../types/burnIn';
import { Search, Filter, AlertTriangle, XCircle, Clock, CheckCircle2 } from 'lucide-react';

export const Fallback2DView: React.FC = () => {
  const chips = useBurnInStore((state) => state.chips);
  const selectedChipId = useBurnInStore((state) => state.selectedChipId);
  const selectChip = useBurnInStore((state) => state.selectChip);
  const parameter = useBurnInStore((state) => state.parameter);
  const checkpoint = useBurnInStore((state) => state.checkpoint);
  const isColorblindMode = useBurnInStore((state) => state.isColorblindMode);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'SUSPECT' | 'REJECT' | 'PASS'>('ALL');

  const pcfg = PARAMETER_CONFIGS[parameter];

  const filteredChips = useMemo(() => {
    return chips.filter((c) => {
      const matchesSearch = c.part_id.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (filterType === 'SUSPECT') return c.verdict === 'LATENT_SUSPECT' || c.verdict === 'EARLY_REJECT';
      if (filterType === 'REJECT') return c.verdict === 'HARD_REJECT';
      if (filterType === 'PASS') return c.verdict === 'PASS';
      return true;
    });
  }, [chips, searchTerm, filterType]);

  const getChipColor = (chip: typeof chips[0]) => {
    if (chip.part_id === selectedChipId) return 'bg-cyan-500 ring-2 ring-cyan-300';
    if (chip.verdict === 'HARD_REJECT') return isColorblindMode ? 'bg-[#d55e00]' : 'bg-rose-500';
    if (chip.verdict === 'EARLY_REJECT') return isColorblindMode ? 'bg-[#cc79a7]' : 'bg-fuchsia-500';
    if (chip.verdict === 'LATENT_SUSPECT') return isColorblindMode ? 'bg-[#e69f00] animate-pulse' : 'bg-amber-500 animate-pulse';
    return isColorblindMode ? 'bg-[#0072b2]' : 'bg-emerald-600';
  };

  return (
    <div className="w-full h-full pt-24 pb-20 px-4 md:pl-80 md:pr-80 flex flex-col bg-slate-50 dark:bg-slate-950/90 overflow-hidden transition-colors duration-200">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-cyan-500/20">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-cyan-800 dark:text-cyan-400 font-semibold font-mono">
            2D Carrier Matrix View ({filteredChips.length} / {chips.length} ICs)
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Part ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md pl-8 pr-3 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-md border border-slate-300 dark:border-slate-800 text-xs">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-0.5 rounded ${filterType === 'ALL' ? 'bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 font-medium' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('SUSPECT')}
              className={`px-2.5 py-0.5 rounded ${filterType === 'SUSPECT' ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 font-medium' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              Suspects
            </button>
            <button
              onClick={() => setFilterType('REJECT')}
              className={`px-2.5 py-0.5 rounded ${filterType === 'REJECT' ? 'bg-rose-500/20 text-rose-800 dark:text-rose-300 font-medium' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              Rejects
            </button>
          </div>
        </div>
      </div>

      {/* Grid container */}
      <div className="flex-1 overflow-auto mt-3 pr-1">
        <div className="grid grid-cols-12 sm:grid-cols-20 md:grid-cols-25 lg:grid-cols-30 gap-1.5 p-2 bg-white/70 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800/80">
          {filteredChips.map((chip) => {
            const isSelected = chip.part_id === selectedChipId;
            return (
              <button
                key={chip.part_id}
                onClick={() => selectChip(chip.part_id)}
                title={`${chip.part_id}: ${chip.currentValue} ${pcfg.unit} (${chip.verdict})`}
                className={`relative aspect-square rounded transition-all duration-100 flex items-center justify-center text-[10px] font-mono text-white ${getChipColor(
                  chip
                )} hover:scale-125 hover:z-10 focus:outline-none`}
              >
                {isSelected && (
                  <div className="absolute inset-0 border-2 border-white rounded animate-ping pointer-events-none" />
                )}
                {isColorblindMode && (
                  <span className="text-[9px] font-bold">
                    {chip.verdict === 'HARD_REJECT' ? '✕' : chip.verdict === 'LATENT_SUSPECT' ? '▲' : '●'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Matrix Legend */}
      <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-mono">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded ${isColorblindMode ? 'bg-[#0072b2]' : 'bg-emerald-600'}`} /> Normal Pass
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded ${isColorblindMode ? 'bg-[#e69f00]' : 'bg-amber-500'}`} /> Latent Suspect
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded ${isColorblindMode ? 'bg-[#d55e00]' : 'bg-rose-500'}`} /> Hard Reject
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded ${isColorblindMode ? 'bg-[#cc79a7]' : 'bg-fuchsia-500'}`} /> Early Reject (24h)
          </span>
        </div>
        <span>Click any IC to inspect QA report</span>
      </div>
    </div>
  );
};
