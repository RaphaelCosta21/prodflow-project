import { Attendance, Complexity, Phase, RequestStatus } from "./enums";
import { IDrawing, ISubItem } from "./subItem";
import { IAttachmentRef } from "./attachment";
import { IBudget } from "./budget";
import { IPartsBudget } from "./partsBudget";
import { IQuotationPackage } from "./quotation";
import { IComment } from "./comment";
import { IPhaseHistoryEntry, IStatusHistoryEntry } from "./history";
import { IFinancials } from "./financials";

export interface IHistoryEvent {
  ts: string;
  by: string;
  type: string;
  message: string;
}

export interface INoteMeta {
  by: string;
  at: string;
}

export interface IRequestDates {
  recebimentoDemanda?: string;
  solicitacaoOrcamento?: string;
  prazoEnvioPetrobras?: string;
  retornoOrcamento?: string;
  dataEnvioPetrobras?: string;
  dataAprovacaoPetrobras?: string;
  prazoDiasUteis?: number;
  prazoDiasCorridos?: number;
}

export interface IApproval {
  by: string;
  date: string;
  signatureRef?: string;
}

// KPI de SLA congelado no momento do envio do orçamento à Petrobras.
export interface IBudgetSlaResult {
  prazo: string;
  envio: string;
  onTime: boolean;
  atrasoDiasUteis: number;
  atrasoDiasCorridos: number;
  registradoEm: string;
  registradoPor: string;
}

export interface IMedicao {
  milestone: string;
  status: string;
  date?: string;
}

// One item per FID in `prodflow-requests` (full JSON in `jsondata` + ~5 indexed columns).
export interface IFabricationRequest {
  fid: string; // FID0000001
  osNumber: string;
  projeto: string;
  lote?: string;
  drawing: IDrawing;
  partNumberOii?: string;
  descricao: string;
  comentarios?: string;
  tipoOrcamento: string;
  complexidadeUsinagem: Complexity;
  complexidadeCaldeiraria: Complexity;
  complexidadeGeral: Complexity;
  atendimento: Attendance;
  phase: Phase;
  status: RequestStatus;
  /** Status to return to when leaving `OnHold`. */
  resumeStatus?: RequestStatus;
  dates: IRequestDates;
  slaOrcamento?: IBudgetSlaResult;
  /** @deprecated Orçamento migrou para `subItems[].fabricationBudget` + `partsBudget`. */
  budget: IBudget;
  partsBudget?: IPartsBudget;
  quotationPackages?: IQuotationPackage[];
  financials: IFinancials;
  subItems: ISubItem[];
  approval?: IApproval;
  medicao?: IMedicao;
  semanaTermino?: string;
  mesPrevisto?: string;
  history: IHistoryEvent[];
  phaseHistory?: IPhaseHistoryEntry[];
  statusHistory?: IStatusHistoryEntry[];
  notes?: Record<string, string>;
  /** Who last saved each note section and when (same keys as `notes`). */
  notesMeta?: Record<string, INoteMeta>;
  comments?: IComment[];
  attachments: IAttachmentRef[];
}

// Lightweight header projected from the indexed columns (list views without parsing the full JSON).
export interface IFabricationRequestHeader {
  fid: string;
  osNumber: string;
  phase: Phase;
  status: RequestStatus;
  year: number;
  tipoOrcamento: string;
}
