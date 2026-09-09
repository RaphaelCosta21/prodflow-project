// Teams that act along a sub-item's route (§4/§7.4). Colors are discreet legend colors.
// Keys/labels are English so they double as the member role names.
export type TeamKey =
  | "projects"
  | "planning"
  | "industrialEngineering"
  | "scm"
  | "purchasing"
  | "workshop"
  | "quality"
  | "warehouse"
  | "serviceExcellence"
  | "machining";

export interface ITeamDef {
  key: TeamKey;
  label: string;
  color: string;
}

export const TEAMS: Record<TeamKey, ITeamDef> = {
  projects: { key: "projects", label: "Projects", color: "#0a58ca" },
  planning: { key: "planning", label: "Planejamento", color: "#7c3aed" },
  industrialEngineering: {
    key: "industrialEngineering",
    label: "Industrial Engineering",
    color: "#db2777",
  },
  scm: { key: "scm", label: "SCM", color: "#0891b2" },
  purchasing: { key: "purchasing", label: "Purchasing", color: "#0284c7" },
  workshop: { key: "workshop", label: "Workshop", color: "#f59e0b" },
  quality: { key: "quality", label: "Quality", color: "#8b5cf6" },
  warehouse: { key: "warehouse", label: "Warehouse", color: "#14b8a6" },
  serviceExcellence: {
    key: "serviceExcellence",
    label: "Service Excellence",
    color: "#10b981",
  },
  machining: { key: "machining", label: "Machining", color: "#ea580c" },
};

export const TEAM_KEYS: TeamKey[] = Object.keys(TEAMS) as TeamKey[];
