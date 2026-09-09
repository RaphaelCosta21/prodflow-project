// Domain enums / union types for the FID model (see PRODFLOW-PROJECT-PLAN.md §11).

export type Complexity = "Baixa" | "Média" | "Alta" | "N/A" | "A definir";
export type Attendance = "Interna" | "Externa"; // na base / fora da base
// "NA" = linha pai delineada pelos próprios filhos; não gera custo nem relatório.
export type Strategy = "Make" | "Buy" | "NA";
export type BuyType = "RawMaterial" | "CommercialItem"; // COTS
export type MakeSite = "InHouse" | "Subcon";
export type Phase = 1 | 2;

// CRD/OII identify header attachments; BR/OII also tag the per-sub-item drawings.
export type AttachmentCategory = "CRD" | "OII" | "BR";

// Which of the two workflows a FID follows — decided by `tipoOrcamento` at creation.
export type WorkflowKind = "fabrication" | "parts";

export type RequestStatus =
  // Phase 1 — both workflows
  | "InDelineation"
  | "Submitted"
  | "Approved"
  | "Rejected"
  // Phase 1 — release gate (one per workflow)
  | "ReleasedForFabrication"
  | "ReleasedForProcurement"
  // Phase 2 — execution (one per workflow)
  | "InFabrication"
  | "InProcurement"
  // Phase 2 — both workflows
  | "ExternalService"
  | "Delivered"
  // Transversal
  | "OnHold"
  | "Cancelled";

export type SubItemStatus =
  // Phase 1 — Buy
  | "NotStarted"
  | "InQuotation"
  | "Quoted"
  // Phase 1 — Make
  | "FabDelineation"
  | "Delineated"
  // Phase 2 — Buy
  | "WaitingMaterial"
  | "InStock"
  // Phase 2 — Make
  | "InFabrication"
  | "ExternalService"
  // Phase 2 — both
  | "InInspection"
  | "Completed"
  | "OnHold";
