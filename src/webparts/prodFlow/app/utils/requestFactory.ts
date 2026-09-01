import {
  Attendance,
  Complexity,
  IBudget,
  IBudgetLine,
  IFabricationRequest,
  IFinancials,
} from "../models";
import { SlaService } from "../services/SlaService";
import {
  CONTRACT_LABOR,
  CONTRACT_MATERIALS,
  CONTRACT_SERVICES,
} from "../config/contractWeights";

// Seeds every fixed contract row (qtd=0). The mask edits only QTD/HH; Peso stays fixed and the
// full catalog is always present so the Excel export matches the immutable template row-for-row.
export function seedBudgetFromContract(): IBudget {
  const materiais: IBudgetLine[] = CONTRACT_MATERIALS.map((m) => ({
    key: m.key,
    categoria: m.categoria,
    descricao: m.descricao,
    criterio: m.un,
    qtd: 0,
    peso: m.peso,
    pesoTotal: 0,
  }));
  const labor: IBudgetLine[] = CONTRACT_LABOR.map((l) => ({
    key: l.key,
    categoria: l.servico,
    descricao: l.servico,
    complexidade: l.complexidade,
    qtd: 0,
    peso: l.peso,
    pesoTotal: 0,
  }));
  const servicos: IBudgetLine[] = CONTRACT_SERVICES.map((s) => ({
    key: s.key,
    descricao: s.label,
    criterio: s.criterio,
    qtd: 0,
    peso: s.peso,
    pesoTotal: 0,
  }));
  return {
    contrato: "4600684130",
    numeroOrcamento: "",
    tabela1: servicos,
    tabela2Materiais: materiais,
    tabela2Labor: labor,
    tabela3: [],
    totalValor: 0,
  };
}

export function createEmptyBudget(): IBudget {
  return {
    contrato: "",
    numeroOrcamento: "",
    tabela1: [],
    tabela2Materiais: [],
    tabela2Labor: [],
    tabela3: [],
    totalValor: 0,
  };
}

// Guarantees the full fixed catalog is present, overlaying saved quantities by key. Keeps the mask
// and the immutable Excel template row-complete even for FIDs created before a catalog change.
export function ensureBudgetSeeded(budget: IBudget): IBudget {
  const seeded = seedBudgetFromContract();
  const overlay = (
    seededLines: IBudgetLine[],
    saved: IBudgetLine[],
  ): IBudgetLine[] => {
    const byKey: { [key: string]: IBudgetLine } = {};
    for (const l of saved) if (l.key) byKey[l.key] = l;
    return seededLines.map((s) => {
      const prev = s.key ? byKey[s.key] : undefined;
      const qtd = prev ? prev.qtd : 0;
      return { ...s, qtd, pesoTotal: qtd * (s.peso || 0) };
    });
  };
  return {
    contrato: budget.contrato || seeded.contrato,
    numeroOrcamento: budget.numeroOrcamento || "",
    dataEnvio: budget.dataEnvio,
    tabela1: overlay(seeded.tabela1, budget.tabela1 || []),
    tabela2Materiais: overlay(
      seeded.tabela2Materiais,
      budget.tabela2Materiais || [],
    ),
    tabela2Labor: overlay(seeded.tabela2Labor, budget.tabela2Labor || []),
    tabela3: budget.tabela3 || [],
    entregaDiasCorridos: budget.entregaDiasCorridos,
    observacoes: budget.observacoes,
    totalValor: budget.totalValor || 0,
  };
}

export function createEmptyFinancials(): IFinancials {
  return {
    custoTotal: 0,
    orcamentoOceaneering: 0,
    receita: 0,
    multaExposicao30: 0,
  };
}

export interface INewRequestInput {
  osNumber: string;
  osType?: "OS" | "OM";
  projeto: string;
  lote?: string;
  drawingCode: string;
  drawingRevision?: string;
  descricao: string;
  comentarios?: string;
  tipoOrcamento: string;
  complexidadeUsinagem: Complexity;
  complexidadeCaldeiraria: Complexity;
  atendimento: Attendance;
  solicitacaoOrcamento?: string;
  prazoDiasCorridos?: number;
  createdBy: string;
}

// Assembles a brand-new FID payload from the OS form. complexidadeGeral = max(usinagem, caldeiraria)
// and the SLA send-deadline is derived in business days (BR holidays). Status starts at Draft.
export function buildNewRequest(
  input: INewRequestInput,
): Omit<IFabricationRequest, "fid"> {
  const complexidadeGeral = SlaService.complexidadeGeral(
    input.complexidadeUsinagem,
    input.complexidadeCaldeiraria,
  );
  const prazoDiasUteis = SlaService.prazoDiasUteis(
    complexidadeGeral,
    input.atendimento,
  );
  const now = new Date().toISOString();
  const prazoEnvio = input.solicitacaoOrcamento
    ? SlaService.prazoEnvio(
        new Date(input.solicitacaoOrcamento),
        complexidadeGeral,
        input.atendimento,
      ).toISOString()
    : undefined;

  return {
    osNumber: input.osNumber,
    osType: input.osType,
    projeto: input.projeto,
    lote: input.lote,
    drawing: { code: input.drawingCode, revision: input.drawingRevision ?? "" },
    descricao: input.descricao,
    comentarios: input.comentarios,
    tipoOrcamento: input.tipoOrcamento,
    complexidadeUsinagem: input.complexidadeUsinagem,
    complexidadeCaldeiraria: input.complexidadeCaldeiraria,
    complexidadeGeral,
    atendimento: input.atendimento,
    phase: 1,
    status: "Draft",
    dates: {
      recebimentoDemanda: now,
      solicitacaoOrcamento: input.solicitacaoOrcamento,
      prazoEnvioPetrobras: prazoEnvio,
      prazoDiasUteis,
      prazoDiasCorridos: input.prazoDiasCorridos,
    },
    budget: seedBudgetFromContract(),
    financials: createEmptyFinancials(),
    subItems: [],
    history: [
      {
        ts: now,
        by: input.createdBy,
        type: "created",
        message: `FID criado a partir da OS ${input.osNumber}.`,
      },
    ],
    attachments: [],
  };
}
