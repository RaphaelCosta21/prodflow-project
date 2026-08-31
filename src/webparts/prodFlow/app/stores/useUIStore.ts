import { create } from "zustand";

export type ThemePreference = "light" | "dark";
export type ToastIntent = "success" | "warning" | "error" | "info";

export interface IToast {
  id: string;
  message: string;
  intent: ToastIntent;
}

interface IUIState {
  theme: ThemePreference;
  sidebarCollapsed: boolean;
  toasts: IToast[];
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  addToast: (message: string, intent?: ToastIntent) => void;
  removeToast: (id: string) => void;
}

// Client/UI state only — no data fetching lives here (that is TanStack Query in api/).
export const useUIStore = create<IUIState>((set) => ({
  theme: "light", // Light is the Oceaneering default; dark is per-user opt-in.
  sidebarCollapsed: false,
  toasts: [],
  setTheme: (theme) => set({ theme }),
  toggleTheme: () =>
    set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
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
