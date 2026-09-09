import { create } from "zustand";
import { Attendance, Complexity } from "../models";

export interface ISlaMatrix {
  Baixa: Record<Attendance, number>;
  Média: Record<Attendance, number>;
  Alta: Record<Attendance, number>;
}

export type AccessArea =
  | "budgeting"
  | "production"
  | "quality"
  | "planning"
  | "settings"
  | "members";

export type AccessPermission = "none" | "view" | "edit";

export interface IAppConfig {
  slaMatrix: ISlaMatrix;
  holidays: string[]; // ISO dates (YYYY-MM-DD)
  budgetTypes: string[]; // opções de "Tipo de Orçamento" (as fixas sempre entram)
  /** Keys are namespaced: `request:<Status>`, `subitem:<Status>`, `phase:<flow>:<n>`. */
  statusColors: { [key: string]: string };
  teamColors: { [team: string]: string };
  kpiTargets: { [kpiKey: string]: number };
  defaultTheme: "light" | "dark";
  superAdminEmails: string[];
  accessLevels: {
    [role: string]: { [area in AccessArea]?: AccessPermission };
  };
  notifications: { [event: string]: string[] };
}

interface IConfigState {
  config?: IAppConfig;
  isLoaded: boolean;
  setConfig: (config: IAppConfig) => void;
  patchConfig: (patch: Partial<IAppConfig>) => void;
  clear: () => void;
}

// Cached app configuration (client-state only — fetching lives in api/).
export const useConfigStore = create<IConfigState>((set, get) => ({
  config: undefined,
  isLoaded: false,
  setConfig: (config) => set({ config, isLoaded: true }),
  patchConfig: (patch) => {
    const current = get().config;
    if (!current) return;
    set({ config: { ...current, ...patch } });
  },
  clear: () => set({ config: undefined, isLoaded: false }),
}));

export function slaFromMatrix(
  matrix: ISlaMatrix | undefined,
  complexity: Complexity,
  attendance: Attendance,
): number | undefined {
  if (!matrix) return undefined;
  const row = matrix[complexity as "Baixa" | "Média" | "Alta"];
  return row ? row[attendance] : undefined;
}
