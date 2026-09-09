import {
  Attendance,
  Complexity,
  IBudget,
  IBudgetLine,
  IDelineation,
  IFabricationRequest,
  IFinancials,
} from "../models";
import { SlaService } from "../services/SlaService";
import {
  CONTRACT_LABOR,
  CONTRACT_MATERIALS,
  CONTRACT_SERVICES,
} from "../config/contractWeights";

// Single-project system (CIDEQ), so the form no longer asks for it.
export const PROJECT_NAME = "CIDEQ";

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
    entregaDiasCorridos: budget.entregaDiasCorridos,
    observacoes: budget.observacoes,
    totalValor: budget.totalValor || 0,
  };
}

export function createEmptyDelineation(): IDelineation {
  return {
    hh: 0,
    horasUsinagem: 0,
    horasAcabamento: 0,
    horasMontagem: 0,
    inspecaoDimensional: false,
    horasInspecao: 0,
    materials: [],
    revision: "A",
    checklist: [],
  };
}

/** `hh` is the single source of truth for rollups — always the sum of the typed hours. */
export function withDerivedHh(d: IDelineation): IDelineation {
  return {
    ...d,
    hh:
      (d.horasUsinagem || 0) +
      (d.horasAcabamento || 0) +
      (d.horasMontagem || 0) +
      (d.inspecaoDimensional ? d.horasInspecao || 0 : 0),
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
  drawingCode: string;
  partNumberOii?: string;
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
  // No complexity deadline (N/A) means no budget SLA — don't fabricate a due date.
  const prazoEnvio =
    input.solicitacaoOrcamento && prazoDiasUteis > 0
      ? SlaService.prazoEnvio(
          new Date(input.solicitacaoOrcamento),
          complexidadeGeral,
          input.atendimento,
        ).toISOString()
      : undefined;

  return {
    osNumber: input.osNumber,
    projeto: PROJECT_NAME,
    drawing: { code: input.drawingCode, revision: "" },
    partNumberOii: input.partNumberOii,
    descricao: input.descricao,
    comentarios: input.comentarios,
    tipoOrcamento: input.tipoOrcamento,
    complexidadeUsinagem: input.complexidadeUsinagem,
    complexidadeCaldeiraria: input.complexidadeCaldeiraria,
    complexidadeGeral,
    atendimento: input.atendimento,
    phase: 1,
    status: "InDelineation",
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
