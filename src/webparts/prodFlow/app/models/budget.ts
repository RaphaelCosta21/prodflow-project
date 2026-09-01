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

export interface IBudgetTable3Line {
  categoria: string;
  valor: number;
  obs?: string;
}

// Máscara do Relatório de Orçamento (Tabelas 1/2/3).
export interface IBudget {
  contrato: string;
  numeroOrcamento: string;
  dataEnvio?: string;
  tabela1: IBudgetLine[]; // serviços adicionais
  tabela2Materiais: IBudgetLine[]; // matéria prima
  tabela2Labor: IBudgetLine[]; // usinagem/caldeiraria/engenharia (HH)
  tabela3: IBudgetTable3Line[]; // aquisição de partes e peças (COTS)
  entregaDiasCorridos?: number;
  observacoes?: string;
  totalValor: number;
}
