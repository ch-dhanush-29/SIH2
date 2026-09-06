/**
 * E-Waste Saathi Light / Dark Theme Manager
 * Provides universal theme toggling, system preference detection,
 * and high-contrast styling for outdoor field usability.
 */

const ThemeManager = {
  currentTheme: localStorage.getItem('saathi_theme') || 'dark',

  init() {
    this.applyTheme(this.currentTheme);
  },

  toggleTheme() {
    const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(nextTheme);
  },

  applyTheme(theme) {
    this.currentTheme = theme;
    localStorage.setItem('saathi_theme', theme);
    const root = document.documentElement;

    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      document.body.classList.remove('bg-slate-950', 'bg-slate-900', 'text-slate-100');
      document.body.classList.add('bg-slate-100', 'text-slate-900');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      document.body.classList.remove('bg-slate-100', 'text-slate-900');
      document.body.classList.add('bg-slate-950', 'text-slate-100');
    }

    // Update icons
    document.querySelectorAll('.theme-toggle-icon').forEach(icon => {
      icon.className = theme === 'light' 
        ? 'fa-solid fa-moon text-slate-700 theme-toggle-icon' 
        : 'fa-solid fa-sun text-amber-400 theme-toggle-icon';
    });
  }
};

window.ThemeManager = ThemeManager;
document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
