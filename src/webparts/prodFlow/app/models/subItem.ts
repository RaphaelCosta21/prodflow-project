import {
  Attendance,
  BuyType,
  Complexity,
  MakeSite,
  Strategy,
  SubItemStatus,
} from "./enums";

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

// Make/In-House fabrication document (Eng. Industrial) with revision control + PDF/Word export.
export interface IDelineation {
  hh: number;
  eps?: string;
  inspections?: string[];
  consumables?: string;
  rawMaterial?: string;
  notes?: string;
  revision: string;
  revisionHistory?: IDelineationRevision[];
  printableUrl?: string;
  checklist: IChecklistStep[];
}

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
  attendance: Attendance;
  complexity: Complexity;
  status: SubItemStatus;
  delineation?: IDelineation;
  quotation?: IQuotation;
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
