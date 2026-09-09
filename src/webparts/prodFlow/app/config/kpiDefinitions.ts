// The 5 dashboard KPIs (PRODFLOW-PROJECT-PLAN.md §14).
export type KpiUnit = "%" | "dias" | "BRL";

export interface IKpiDef {
  key: string;
  label: string;
  description: string;
  unit: KpiUnit;
  defaultTarget: number;
  /** Lower is better — the dashboard flips the pass/fail comparison. */
  lowerIsBetter?: boolean;
}

export const KPI_DEFINITIONS: IKpiDef[] = [
  {
    key: "budgetSla",
    label: "Atendimento aos prazos de envio de orçamentos",
    description: "% com Data de envio ≤ Prazo p/ envio do Orçamento.",
    unit: "%",
    defaultTarget: 90,
  },
  {
    key: "fabricationDeadline",
    label: "Atendimento aos prazos de término das fabricações",
    description: "Data Término Real ≤ Prazo de Fabricação (aprovado).",
    unit: "%",
    defaultTarget: 90,
  },
  {
    key: "startInternalExternal",
    label: "Gestão de início das fabricações Internas × Externas",
    description: "Data de Início por Tipo de Fabricação (Workshop × Usinando).",
    unit: "dias",
    defaultTarget: 5,
    lowerIsBetter: true,
  },
  {
    key: "costRevenue",
    label: "Gestão de Custo × Receita de Fabricação",
    description: "Custo × Orçamento Oceaneering × Receita por FID e total.",
    unit: "%",
    defaultTarget: 20,
  },
  {
    key: "penaltyExposure",
    label: "Gestão de possibilidade de multa",
    description:
      "Exposição de 30% do Orçamento Oceaneering dos itens em atraso (indicador).",
    unit: "BRL",
    defaultTarget: 0,
    lowerIsBetter: true,
  },
];

export const DEFAULT_KPI_TARGETS: { [key: string]: number } =
  KPI_DEFINITIONS.reduce(
    (acc, k) => {
      acc[k.key] = k.defaultTarget;
      return acc;
    },
    {} as { [key: string]: number },
  );
