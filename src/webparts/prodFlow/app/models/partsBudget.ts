// Mirrors "Cálculo de Orçamento de Partes e Peças": every money column below the
// supplier price is derived — see utils/partsBudgetCalc.ts for the constants.
export interface IPartsBudgetLine {
  subItemId: string;
  item: number;
  descricao: string;
  pn?: string;
  material?: string;
  qtd: number;
  unidade: string;
  fornecedor?: string;
  quotationId?: string;
  valorUnit: number; // valor cotado pelo fornecedor (entrada)
  pisCofinsUnit: number;
  issUnit: number;
  impostosUnit: number;
  custoTotalUnit: number;
  total: number;
  prazoEntrega?: string;
}

export interface IPartsBudget {
  contrato: string;
  numeroOrcamento: string;
  revisao?: string;
  data?: string;
  validadeDias?: number;
  observacoes?: string;
  lines: IPartsBudgetLine[];
  total: number;
}
