import { create } from 'zustand';

export interface WindowPosition {
  x: number;
  y: number;
}

export interface WindowConfig {
  id: string;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  position: WindowPosition | null; // null = use default computed position
  zIndex: number;
}

interface WindowManagerState {
  windows: Record<string, WindowConfig>;
  activeTopZ: number;

  // Actions
  registerWindow: (id: string, title: string, defaultOpen?: boolean) => void;
  updatePosition: (id: string, pos: WindowPosition) => void;
  toggleMinimize: (id: string) => void;
  setMinimized: (id: string, minimized: boolean) => void;
  toggleOpen: (id: string) => void;
  setOpen: (id: string, isOpen: boolean) => void;
  bringToFront: (id: string) => void;
  resetPosition: (id: string) => void;
  resetAllPositions: () => void;
}

const STORAGE_KEY = 'burnwatch-window-positions-v1';

// Initial default positions calculation helper
export const getDefaultWindowPosition = (id: string): WindowPosition => {
  if (typeof window === 'undefined') return { x: 20, y: 160 };

  const winW = window.innerWidth;
  const winH = window.innerHeight;

  switch (id) {
    case 'chamber-instrumentation':
      return { x: 16, y: 156 };
    case 'checkpoint-timeline':
      // Centered at bottom
      return { x: Math.max(16, Math.floor((winW - 740) / 2)), y: Math.max(160, winH - 120) };
    case 'lot-outlier':
      // Next to chamber dock or upper center-left
      return { x: Math.min(winW - 460, 480), y: 156 };
    case 'vision-monitor':
      return { x: Math.max(16, winW - 460), y: 156 };
    case 'inspection-hud':
      return { x: Math.max(16, winW - 460), y: 156 };
    case 'hero-explanation':
      return { x: Math.max(16, winW - 500), y: 156 };
    default:
      return { x: 60, y: 180 };
  }
};

// Load saved config from localStorage
const loadSavedWindowConfigs = (): Record<string, Partial<WindowConfig>> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to load window positions from storage', err);
  }
  return {};
};

const saveWindowConfigs = (windows: Record<string, WindowConfig>) => {
  if (typeof window === 'undefined') return;
  try {
    const toSave: Record<string, { position: WindowPosition | null; isMinimized: boolean; isOpen: boolean }> = {};
    Object.keys(windows).forEach((id) => {
      toSave[id] = {
        position: windows[id].position,
        isMinimized: windows[id].isMinimized,
        isOpen: windows[id].isOpen,
      };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (err) {
    console.warn('Failed to save window positions', err);
  }
};

const defaultWindows: Record<string, WindowConfig> = {
  'chamber-instrumentation': {
    id: 'chamber-instrumentation',
    title: 'Chamber Instrumentation',
    isOpen: true,
    isMinimized: false,
    position: null,
    zIndex: 31,
  },
  'checkpoint-timeline': {
    id: 'checkpoint-timeline',
    title: 'Checkpoint & Timeline',
    isOpen: true,
    isMinimized: false,
    position: null,
    zIndex: 32,
  },
  'lot-outlier': {
    id: 'lot-outlier',
    title: 'LOT Outlier Matrix',
    isOpen: true,
    isMinimized: false,
    position: null,
    zIndex: 33,
  },
  'vision-monitor': {
    id: 'vision-monitor',
    title: 'Live Optical Inspection',
    isOpen: true,
    isMinimized: false,
    position: null,
    zIndex: 30,
  },
  'inspection-hud': {
    id: 'inspection-hud',
    title: 'Die Inspection HUD',
    isOpen: true,
    isMinimized: false,
    position: null,
    zIndex: 34,
  },
  'hero-explanation': {
    id: 'hero-explanation',
    title: 'Glass-Box AI Diagnosis',
    isOpen: true,
    isMinimized: false,
    position: null,
    zIndex: 35,
  },
};

// Merge saved preferences if any
const saved = loadSavedWindowConfigs();
Object.keys(saved).forEach((id) => {
  if (defaultWindows[id]) {
    if (saved[id].position !== undefined) defaultWindows[id].position = saved[id].position!;
    if (saved[id].isMinimized !== undefined) defaultWindows[id].isMinimized = saved[id].isMinimized!;
    if (saved[id].isOpen !== undefined) defaultWindows[id].isOpen = saved[id].isOpen!;
  }
});

export const useWindowManagerStore = create<WindowManagerState>((set, get) => ({
  windows: defaultWindows,
  activeTopZ: 40,

  registerWindow: (id, title, defaultOpen = true) => {
    set((state) => {
      if (state.windows[id]) return state;
      const newWin: WindowConfig = {
        id,
        title,
        isOpen: defaultOpen,
        isMinimized: false,
        position: null,
        zIndex: state.activeTopZ + 1,
      };
      const updated = { ...state.windows, [id]: newWin };
      saveWindowConfigs(updated);
      return {
        windows: updated,
        activeTopZ: state.activeTopZ + 1,
      };
    });
  },

  updatePosition: (id, pos) => {
    set((state) => {
      const win = state.windows[id];
      if (!win) return state;
      const updated = {
        ...state.windows,
        [id]: {
          ...win,
          position: pos,
        },
      };
      saveWindowConfigs(updated);
      return { windows: updated };
    });
  },

  toggleMinimize: (id) => {
    set((state) => {
      const win = state.windows[id];
      if (!win) return state;
      const updated = {
        ...state.windows,
        [id]: {
          ...win,
          isMinimized: !win.isMinimized,
        },
      };
      saveWindowConfigs(updated);
      return { windows: updated };
    });
  },

  setMinimized: (id, minimized) => {
    set((state) => {
      const win = state.windows[id];
      if (!win || win.isMinimized === minimized) return state;
      const updated = {
        ...state.windows,
        [id]: {
          ...win,
          isMinimized: minimized,
        },
      };
      saveWindowConfigs(updated);
      return { windows: updated };
    });
  },

  toggleOpen: (id) => {
    set((state) => {
      const win = state.windows[id];
      if (!win) return state;
      const updated = {
        ...state.windows,
        [id]: {
          ...win,
          isOpen: !win.isOpen,
        },
      };
      saveWindowConfigs(updated);
      return { windows: updated };
    });
  },

  setOpen: (id, isOpen) => {
    set((state) => {
      const win = state.windows[id];
      if (!win || win.isOpen === isOpen) return state;
      const updated = {
        ...state.windows,
        [id]: {
          ...win,
          isOpen,
        },
      };
      saveWindowConfigs(updated);
      return { windows: updated };
    });
  },

  bringToFront: (id) => {
    set((state) => {
      const win = state.windows[id];
      if (!win) return state;
      const nextZ = state.activeTopZ + 1;
      return {
        windows: {
          ...state.windows,
          [id]: {
            ...win,
            zIndex: nextZ,
          },
        },
        activeTopZ: nextZ,
      };
    });
  },

  resetPosition: (id) => {
    set((state) => {
      const win = state.windows[id];
      if (!win) return state;
      const updated = {
        ...state.windows,
        [id]: {
          ...win,
          position: null, // resets to default position
        },
      };
      saveWindowConfigs(updated);
      return { windows: updated };
    });
  },

  resetAllPositions: () => {
    set((state) => {
      const updated: Record<string, WindowConfig> = {};
      Object.keys(state.windows).forEach((id) => {
        updated[id] = {
          ...state.windows[id],
          position: null,
          isMinimized: false,
          isOpen: true,
        };
      });
      saveWindowConfigs(updated);
      return { windows: updated };
    });
  },
}));
