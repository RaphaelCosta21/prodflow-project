import { Complexity } from "./enums";

export type BudgetCriterio = "HH" | "UN" | "M2" | "KG";

// pesoTotal = qtd * peso (auto). Peso is fixed from CONTRACT_WEIGHTS; only qtd/HH is user-editable.
export interface IBudgetLine {
  key?: string; // stable catalog id (CONTRACT_WEIGHTS) — joins the line to its template cell
  categoria?: string;
  descricao: string;
  criterio?: BudgetCriterio;
  complexidade?: Complexity;
  qtd: number;
  peso: number;
  pesoTotal: number;
}

export interface IBudgetTables {
  tabela1: IBudgetLine[]; // serviços adicionais
  tabela2Materiais: IBudgetLine[]; // matéria prima
  tabela2Labor: IBudgetLine[]; // usinagem/caldeiraria/engenharia (HH)
}

// Máscara do Relatório de Orçamento de Fabricação — uma por sub-item Make.
export interface IFabricationBudget extends IBudgetTables {
  subItemId: string;
  contrato: string;
  numeroOrcamento: string;
  dataEnvio?: string;
  entregaDiasCorridos?: number;
  observacoes?: string;
  totalValor: number;
}

/** @deprecated Orçamento agora é por sub-item (`ISubItem.fabricationBudget`) + `IPartsBudget`. */
export interface IBudget extends IBudgetTables {
  contrato: string;
  numeroOrcamento: string;
  dataEnvio?: string;
  entregaDiasCorridos?: number;
  observacoes?: string;
  totalValor: number;
}
