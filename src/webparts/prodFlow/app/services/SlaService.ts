import {
  Attendance,
  Complexity,
  IFinancials,
  ISubItem,
  SlaAttendance,
} from "../models";
import { addBusinessDays, isOverdue } from "../utils/businessDays";
import { slaFromRow } from "../utils/slaMatrix";

// SLA de resposta do orçamento (§10.1) — dias ÚTEIS por complexidade × atendimento.
const SLA_MATRIX: Record<
  "Baixa" | "Média" | "Alta",
  Record<SlaAttendance, number>
> = {
  Baixa: { Interna: 1, Externa: 5 },
  Média: { Interna: 3, Externa: 10 },
  Alta: { Interna: 5, Externa: 15 },
};

const COMPLEXITY_RANK: Record<Complexity, number> = {
  "N/A": 0,
  "A definir": 0,
  Baixa: 1,
  Média: 2,
  Alta: 3,
};

export class SlaService {
  // complexidadeGeral = a maior entre Usinagem e Caldeiraria.
  public static complexidadeGeral(
    usinagem: Complexity,
    caldeiraria: Complexity,
  ): Complexity {
    return COMPLEXITY_RANK[usinagem] >= COMPLEXITY_RANK[caldeiraria]
      ? usinagem
      : caldeiraria;
  }

  public static prazoDiasUteis(
    complexity: Complexity,
    attendance: Attendance,
  ): number {
    const row = SLA_MATRIX[complexity as "Baixa" | "Média" | "Alta"];
    return row ? slaFromRow(row, attendance) : 0;
  }

  // Prazo p/ envio à Petrobras = Solicitação de Orçamento + Prazo(dias úteis, feriados BR).
  public static prazoEnvio(
    solicitacao: Date,
    complexity: Complexity,
    attendance: Attendance,
  ): Date {
    return addBusinessDays(
      solicitacao,
      SlaService.prazoDiasUteis(complexity, attendance),
    );
  }

  public static isEnvioAtrasado(prazoEnvio: Date, dataEnvio?: Date): boolean {
    return isOverdue(prazoEnvio, dataEnvio);
  }

  // Rollup financeiro bottom-up a partir das folhas (§13). When orcamentoOverride is provided
  // (the budget mask total), it becomes orcamentoOceaneering while custoTotal stays the sub-item sum.
  public static computeFinancials(
    subItems: ISubItem[],
    orcamentoOverride?: number,
  ): IFinancials {
    const leaves = SlaService.leaves(subItems);
    let custoTotal = 0;
    let orcamentoLeaves = 0;
    for (const leaf of leaves) {
      const custo =
        leaf.custoTotal ??
        (leaf.orcamentoUsinando || 0) +
          (leaf.partesEPecas || 0) +
          (leaf.servicos || 0);
      custoTotal += custo;
      orcamentoLeaves += leaf.orcamentoOceaneering || 0;
    }
    const orcamentoOceaneering =
      orcamentoOverride !== undefined ? orcamentoOverride : orcamentoLeaves;
    return {
      custoTotal,
      orcamentoOceaneering,
      receita: orcamentoOceaneering - custoTotal,
      multaExposicao30: 0.3 * orcamentoOceaneering,
    };
  }

  // Folhas = sub-itens que não são pai de nenhum outro (a fonte da verdade é level + parentId).
  private static leaves(subItems: ISubItem[]): ISubItem[] {
    const parentIds = new Set<string>();
    for (const s of subItems) {
      if (s.parentId) parentIds.add(s.parentId);
    }
    return subItems.filter((s) => !parentIds.has(s.id));
  }
}
