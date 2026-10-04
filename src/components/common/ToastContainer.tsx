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
        let style = 'bg-slate-900 border-cyan-500/40 text-slate-100';
        let icon = <Info className="w-4 h-4 text-cyan-400" />;

        if (toast.type === 'ALERT') {
          style = 'bg-rose-950/90 border-rose-500/80 text-rose-100 animate-radar';
          icon = <AlertCircle className="w-4 h-4 text-rose-400" />;
        } else if (toast.type === 'WARNING') {
          style = 'bg-amber-950/90 border-amber-500/80 text-amber-100';
          icon = <AlertTriangle className="w-4 h-4 text-amber-400" />;
        } else if (toast.type === 'SUCCESS') {
          style = 'bg-emerald-950/90 border-emerald-500/80 text-emerald-100';
          icon = <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3 rounded-xl border shadow-2xl backdrop-blur-md flex items-start gap-3 transition-all ${style}`}
          >
            <div className="shrink-0 mt-0.5">{icon}</div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono tracking-wide">
                  {toast.title}
                </span>
                <span className="text-[10px] opacity-60 font-mono">{toast.timestamp}</span>
              </div>
              <p className="text-xs opacity-90 mt-0.5 leading-snug">{toast.message}</p>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-slate-400 hover:text-white shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
