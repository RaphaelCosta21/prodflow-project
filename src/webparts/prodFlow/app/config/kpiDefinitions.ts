// The 5 dashboard KPIs (PRODFLOW-PROJECT-PLAN.md §14).
export interface IKpiDef {
  key: string;
  label: string;
  description: string;
}

export const KPI_DEFINITIONS: IKpiDef[] = [
  {
    key: "budgetSla",
    label: "Atendimento aos prazos de envio de orçamentos",
    description: "% com Data de envio ≤ Prazo p/ envio (SLA).",
  },
  {
    key: "fabricationDeadline",
    label: "Atendimento aos prazos de término das fabricações",
    description: "Data Término Real ≤ Prazo de Fabricação (aprovado).",
  },
  {
    key: "startInternalExternal",
    label: "Gestão de início das fabricações Internas × Externas",
    description: "Data de Início por Tipo de Fabricação (Workshop × Usinando).",
  },
  {
    key: "costRevenue",
    label: "Gestão de Custo × Receita de Fabricação",
    description: "Custo × Orçamento Oceaneering × Receita por FID e total.",
  },
  {
    key: "penaltyExposure",
    label: "Gestão de possibilidade de multa",
    description:
      "Exposição de 30% do Orçamento Oceaneering dos itens em atraso (indicador).",
  },
];
