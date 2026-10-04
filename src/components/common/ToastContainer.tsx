import React from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const toasts = useBurnInStore((state) => state.toasts);
  const dismissToast = useBurnInStore((state) => state.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let style = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-cyan-500/40 text-slate-900 dark:text-slate-100';
        let icon = <Info className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />;

        if (toast.type === 'ALERT') {
          style = 'bg-rose-50 dark:bg-rose-950/90 border-rose-300 dark:border-rose-500/80 text-rose-900 dark:text-rose-100 animate-radar';
          icon = <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
        } else if (toast.type === 'WARNING') {
          style = 'bg-amber-50 dark:bg-amber-950/90 border-amber-300 dark:border-amber-500/80 text-amber-900 dark:text-amber-100';
          icon = <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
        } else if (toast.type === 'SUCCESS') {
          style = 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-500/80 text-emerald-900 dark:text-emerald-100';
          icon = <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-2.5 rounded-[8px] border shadow-[var(--shadow-floating)] backdrop-blur-md flex items-start gap-2.5 transition-all ${style}`}
          >
            <div className="shrink-0 mt-0.5">{icon}</div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-display tracking-tight">
                  {toast.title}
                </span>
                <span className="text-[10px] opacity-60 font-mono">{toast.timestamp}</span>
              </div>
              <p className="text-xs font-sans opacity-90 mt-0.5 leading-snug">{toast.message}</p>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-slate-400 hover:text-slate-900 dark:hover:text-white shrink-0 mt-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
