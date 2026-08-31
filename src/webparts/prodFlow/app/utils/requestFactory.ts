import {
  Attendance,
  Complexity,
  IBudget,
  IFabricationRequest,
  IFinancials,
} from "../models";
import { SlaService } from "../services/SlaService";

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
    budget: createEmptyBudget(),
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
