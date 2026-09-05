import { IAppConfig } from "../stores/useConfigStore";

// Owners that always keep admin rights, even if prodflow-config is emptied or misconfigured.
// This is the lockout guard — the stored superAdminEmails are merged on top of it.
export const BUILT_IN_SUPER_ADMINS: string[] = ["rcosta1@oceaneering.com"];

// "Partes e Peças" skips the complexity SLA entirely (Oceaneering sets its own deadline).
export const PARTS_BUDGET_TYPE = "Partes e Peças";
export const FABRICATION_BUDGET_TYPE = "Fabricação";

// Always offered in the wizard and never removable in the settings page.
export const FIXED_BUDGET_TYPES: string[] = [
  FABRICATION_BUDGET_TYPE,
  PARTS_BUDGET_TYPE,
];

// Fixed options first, then the admin-defined extras (deduplicated).
export function budgetTypeOptions(configured?: string[]): string[] {
  const extras = (configured ?? []).filter(
    (t) => t.trim() && FIXED_BUDGET_TYPES.indexOf(t) < 0,
  );
  return FIXED_BUDGET_TYPES.concat(extras);
}

// Seed used until an admin saves the config to prodflow-config.
// SLA numbers mirror §10.1 (business days by complexity × attendance).
export const DEFAULT_APP_CONFIG: IAppConfig = {
  slaMatrix: {
    Baixa: { Interna: 1, Externa: 5 },
    Média: { Interna: 3, Externa: 10 },
    Alta: { Interna: 5, Externa: 15 },
  },
  holidays: [],
  budgetTypes: FIXED_BUDGET_TYPES,
  statusColors: {},
  teamColors: {},
  defaultTheme: "light",
  superAdminEmails: BUILT_IN_SUPER_ADMINS,
  accessLevels: {
    member: {
      budgeting: "view",
      production: "view",
      quality: "view",
      planning: "view",
      settings: "none",
      members: "none",
    },
    lead: {
      budgeting: "edit",
      production: "edit",
      quality: "edit",
      planning: "view",
      settings: "none",
      members: "none",
    },
    manager: {
      budgeting: "edit",
      production: "edit",
      quality: "edit",
      planning: "edit",
      settings: "view",
      members: "view",
    },
    admin: {
      budgeting: "edit",
      production: "edit",
      quality: "edit",
      planning: "edit",
      settings: "edit",
      members: "edit",
    },
  },
  notifications: {
    BudgetSubmitted: ["manager", "admin"],
    BudgetApproved: ["manager", "admin"],
    BudgetRejected: ["manager", "admin"],
    SlaOverdue: ["manager", "admin"],
    ReleasedForProduction: ["lead", "manager", "admin"],
    SubItemCompleted: ["lead"],
    FidCompleted: ["manager", "admin"],
  },
};

export const ACCESS_AREAS: { key: string; label: string }[] = [
  { key: "budgeting", label: "Orçamentação" },
  { key: "production", label: "Produção" },
  { key: "quality", label: "Qualidade" },
  { key: "planning", label: "Planejamento" },
  { key: "settings", label: "Configuração" },
  { key: "members", label: "Membros" },
];

export const ACCESS_ROLES = ["member", "lead", "manager", "admin"];

export const NOTIFICATION_EVENTS: { key: string; label: string }[] = [
  { key: "BudgetSubmitted", label: "Orçamento enviado" },
  { key: "BudgetApproved", label: "Orçamento aprovado" },
  { key: "BudgetRejected", label: "Orçamento reprovado" },
  { key: "SlaOverdue", label: "SLA estourado" },
  { key: "ReleasedForProduction", label: "Liberado p/ produção" },
  { key: "SubItemCompleted", label: "Sub-item concluído" },
  { key: "FidCompleted", label: "FID concluído" },
];
