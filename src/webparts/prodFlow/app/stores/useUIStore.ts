import { create } from "zustand";

export type ThemePreference = "light" | "dark";
export type ToastIntent = "success" | "warning" | "error" | "info";

export interface IToast {
  id: string;
  message: string;
  intent: ToastIntent;
}

const THEME_STORAGE_KEY = "prodflow:theme";

// localStorage throws inside the SharePoint iframe when third-party storage is blocked.
function readStoredTheme(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "dark" || stored === "light" ? stored : "light";
  } catch {
    return "light";
  }
}

function writeStoredTheme(theme: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* preference stays in-memory for this session only */
  }
}

interface IUIState {
  theme: ThemePreference;
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  createFidOpen: boolean;
  toasts: IToast[];
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setCreateFidOpen: (open: boolean) => void;
  addToast: (message: string, intent?: ToastIntent) => void;
  removeToast: (id: string) => void;
}

// Client/UI state only — no data fetching lives here (that is TanStack Query in api/).
export const useUIStore = create<IUIState>((set) => ({
  theme: readStoredTheme(), // Light is the Oceaneering default; dark is per-user opt-in.
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  createFidOpen: false,
  toasts: [],
  setTheme: (theme) => {
    writeStoredTheme(theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((s) => {
      const theme: ThemePreference = s.theme === "light" ? "dark" : "light";
      writeStoredTheme(theme);
      return { theme };
    }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  setCreateFidOpen: (createFidOpen) => set({ createFidOpen }),
  addToast: (message, intent = "info") =>
    set((s) => ({
      toasts: [
        ...s.toasts,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          message,
          intent,
        },
      ],
    })),
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
