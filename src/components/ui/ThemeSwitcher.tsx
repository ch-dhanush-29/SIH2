import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useBurnInStore } from '../../state/useBurnInStore';

export const ThemeSwitcher: React.FC = () => {
  const theme = useBurnInStore((state) => state.theme);
  const setTheme = useBurnInStore((state) => state.setTheme);

  return (
    <div
      role="radiogroup"
      aria-label="Interface Theme Mode"
      className="relative flex items-center p-0.5 rounded-xl mission-hud border border-cyan-500/25 dark:border-cyan-500/25 shadow-lg select-none font-mono text-[11px]"
    >
      {/* Light Option Button */}
      <button
        role="radio"
        aria-checked={theme === 'light'}
        onClick={() => setTheme('light')}
        className={`relative z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors duration-200 ${
          theme === 'light'
            ? 'text-sky-900 font-bold'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
        title="Switch to ISRO Engineering Control Room (Light Theme)"
      >
        <motion.div
          animate={{
            rotate: theme === 'light' ? [0, 90, 0] : 0,
            scale: theme === 'light' ? 1.05 : 0.9,
          }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
        >
          <Sun className="w-3.5 h-3.5 text-amber-500" />
        </motion.div>
        <span className="tracking-wider">LIGHT</span>

        {theme === 'light' && (
          <motion.div
            layoutId="activeThemePill"
            className="absolute inset-0 -z-10 rounded-lg bg-sky-500/20 border border-sky-500/40 shadow-sm"
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          />
        )}
      </button>

      {/* Dark Option Button */}
      <button
        role="radio"
        aria-checked={theme === 'dark'}
        onClick={() => setTheme('dark')}
        className={`relative z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors duration-200 ${
          theme === 'dark'
            ? 'text-cyan-300 font-bold'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
        title="Switch to Mission Control Digital Twin (Dark Theme)"
      >
        <motion.div
          animate={{
            rotate: theme === 'dark' ? [0, -45, 0] : 0,
            scale: theme === 'dark' ? 1.05 : 0.9,
          }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
        >
          <Moon className="w-3.5 h-3.5 text-cyan-400" />
        </motion.div>
        <span className="tracking-wider">DARK</span>

        {theme === 'dark' && (
          <motion.div
            layoutId="activeThemePill"
            className="absolute inset-0 -z-10 rounded-lg bg-cyan-500/25 border border-cyan-400/50 shadow-[0_0_10px_rgba(0,240,255,0.25)]"
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          />
        )}
      </button>
    </div>
  );
};
