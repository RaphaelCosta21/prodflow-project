import {
  BuyType,
  Complexity,
  MakeSite,
  Strategy,
  SubItemAttendance,
  SubItemStatus,
} from "./enums";
import { TeamKey } from "../config/teams";
import { IAttachmentRef } from "./attachment";
import { IFabricationBudget } from "./budget";
import { ISubItemStatusHistoryEntry } from "./history";

export interface IDrawing {
  code: string;
  revision: string; // controle de revisão (D01, D02, Rev A/B...)
}

export interface IChecklistStep {
  key: string;
  label: string;
  done: boolean;
  date?: string;
  by?: string;
}

export interface IDelineationRevision {
  rev: string;
  by: string;
  date: string;
  note?: string;
}

// One raw-material line of a delineation; materialKey joins CONTRACT_MATERIALS.
export interface IDelineationMaterial {
  materialKey: string;
  categoria: string;
  descricao: string;
  kg: number;
}

// Make/In-House fabrication document (Eng. Industrial) with revision control + PDF/Word export.
export interface IDelineation {
  hh: number; // derived: usinagem + acabamento + montagem + inspeção
  horasUsinagem: number;
  horasAcabamento: number;
  horasMontagem: number;
  inspecaoDimensional: boolean;
  horasInspecao: number;
  materials: IDelineationMaterial[];
  inspections?: string[];
  rawMaterial?: string; // legado (texto livre) — substituído por `materials`
  notes?: string;
  revision: string;
  revisionHistory?: IDelineationRevision[];
  printableUrl?: string;
  concluido?: boolean;
  concluidoPor?: string;
  concluidoEm?: string;
  checklist: IChecklistStep[];
}

// Legado: resolvido a partir do pacote de cotação vencedor (ver models/quotation.ts).
export interface IQuotation {
  supplier: string;
  value: number;
  leadTimeDays: number;
  obs?: string;
}

export interface IMaterialCert {
  heatLot: string;
  spec: string;
  certUrl?: string;
}

export interface ISimultaneidade {
  flag: boolean;
  withLines?: string[];
}

// A BOM line (Part Number). Sub-items never get their own FID/OF.
// Hierarchy source of truth = level + parentId; `children` is derived in memory for tree render.
export interface ISubItem {
  id: string;
  level: number; // 1 = TOP LEVEL (product/FID); 2..5 = components
  parentId?: string; // last item of (level-1) in BOM order (undefined = root)
  children?: ISubItem[]; // derived, not persisted as source
  findNumber?: string; // F/N
  pn: string; // BOM "Name" (Part Number)
  pnBr?: string;
  qtd: number; // BOM "Qty"
  unit?: string; // EA/FT... (Unit Of Measure)
  descricao: string; // BOM "Description"
  drawing: IDrawing; // revision = BOM "Revision"
  qualityCode?: string;
  // OBRIGATÓRIO na UI (dropdown travado) — opcional no modelo pois o import deixa em branco p/ o Planejamento.
  strategy?: Strategy;
  buyType?: BuyType;
  makeSite?: MakeSite;
  attendance: SubItemAttendance;
  complexity: Complexity;
  status: SubItemStatus;
  /** Status to return to when leaving `OnHold`. */
  resumeStatus?: SubItemStatus;
  statusHistory?: ISubItemStatusHistoryEntry[];
  delineation?: IDelineation;
  quotation?: IQuotation;
  // Desenhos do sub-item (BR/OII) anexados pelo Planejamento na definição da estratégia.
  drawings?: IAttachmentRef[];
  // Roteamento disparado pelo Planejamento ("Iniciar")
  startedAt?: string;
  startedBy?: string;
  ownerTeam?: TeamKey;
  naReason?: string;
  // Pacote de cotação eleito vencedor para este sub-item
  selectedQuotationId?: string;
  // Máscara do Relatório de Orçamento de Fabricação (1 por sub-item Make)
  fabricationBudget?: IFabricationBudget;
  // Phase 2 — PeopleSoft references (manual)
  rcOrSr?: string;
  poOrWo?: string;
  prazoFabricacaoDias?: number;
  dataInicioFab?: string;
  dataFimFab?: string;
  dataTerminoReal?: string;
  fabChecklist: IChecklistStep[];
  serialNumber?: string; // = WO number
  certificates?: IMaterialCert[];
  docRso?: string;
  servico?: string;
  simultaneidade?: ISimultaneidade;
  // financeiro por sub-item
  orcamentoUsinando?: number;
  partesEPecas?: number;
  servicos?: number;
  custoTotal?: number;
  orcamentoOceaneering?: number;
  receita?: number;
}
