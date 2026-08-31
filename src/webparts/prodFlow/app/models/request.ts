import { Attendance, Complexity, Phase, RequestStatus } from "./enums";
import { IDrawing, ISubItem } from "./subItem";
import { IBudget } from "./budget";
import { IFinancials } from "./financials";

export interface IHistoryEvent {
  ts: string;
  by: string;
  type: string;
  message: string;
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

export interface IMedicao {
  milestone: string;
  status: string;
  date?: string;
}

export interface IAttachmentRef {
  name: string;
  url: string;
  kind: string;
}

// One item per FID in `prodflow-requests` (full JSON in `jsondata` + ~5 indexed columns).
export interface IFabricationRequest {
  fid: string; // FID0000001
  osNumber: string;
  osType?: "OS" | "OM";
  projeto: string;
  lote?: string;
  drawing: IDrawing;
  descricao: string;
  comentarios?: string;
  tipoOrcamento: string;
  complexidadeUsinagem: Complexity;
  complexidadeCaldeiraria: Complexity;
  complexidadeGeral: Complexity;
  atendimento: Attendance;
  phase: Phase;
  status: RequestStatus;
  dates: IRequestDates;
  budget: IBudget;
  financials: IFinancials;
  subItems: ISubItem[];
  approval?: IApproval;
  medicao?: IMedicao;
  semanaTermino?: string;
  mesPrevisto?: string;
  history: IHistoryEvent[];
  attachments: IAttachmentRef[];
}

// Lightweight header projected from the indexed columns (list views without parsing the full JSON).
export interface IFabricationRequestHeader {
  fid: string;
  osNumber: string;
  phase: Phase;
  status: RequestStatus;
  year: number;
}
