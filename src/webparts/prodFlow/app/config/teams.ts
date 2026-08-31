// Teams that act along a sub-item's route (§4/§7.4). Colors are discreet legend colors.
export type TeamKey =
  | "projetos"
  | "planejamento"
  | "engIndustrial"
  | "scm"
  | "compras"
  | "workshop"
  | "qualidade"
  | "almoxarifado"
  | "serviceExcellence"
  | "usinando";

export interface ITeamDef {
  key: TeamKey;
  label: string;
  color: string;
}

export const TEAMS: Record<TeamKey, ITeamDef> = {
  projetos: { key: "projetos", label: "Projetos", color: "#0a58ca" },
  planejamento: {
    key: "planejamento",
    label: "Planejamento",
    color: "#7c3aed",
  },
  engIndustrial: {
    key: "engIndustrial",
    label: "Eng. Industrial",
    color: "#db2777",
  },
  scm: { key: "scm", label: "SCM", color: "#0891b2" },
  compras: { key: "compras", label: "Compras", color: "#0284c7" },
  workshop: { key: "workshop", label: "Workshop", color: "#f59e0b" },
  qualidade: { key: "qualidade", label: "Qualidade", color: "#8b5cf6" },
  almoxarifado: {
    key: "almoxarifado",
    label: "Almoxarifado",
    color: "#14b8a6",
  },
  serviceExcellence: {
    key: "serviceExcellence",
    label: "Service Excellence",
    color: "#10b981",
  },
  usinando: { key: "usinando", label: "Usinando", color: "#ea580c" },
};
