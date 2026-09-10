// Domain enums / union types for the FID model (see PRODFLOW-PROJECT-PLAN.md §11).

export type Complexity = "Baixa" | "Média" | "Alta" | "N/A" | "A definir";
// Interna = na base · Externa = fora da base · Híbrido = os dois (Make·IH + Make·SUB na mesma BOM).
export type Attendance = "Interna" | "Externa" | "Híbrido" | "A definir";
// A BOM line is always executed on one side only, and the SLA matrix has one column per side.
export type SubItemAttendance = "Interna" | "Externa";
export type SlaAttendance = SubItemAttendance;
// "NA" = linha pai delineada pelos próprios filhos; não gera custo nem relatório.
export type Strategy = "Make" | "Buy" | "NA";
export type BuyType = "RawMaterial" | "CommercialItem"; // COTS
export type MakeSite = "InHouse" | "Subcon";
export type Phase = 1 | 2;

// CRD/OII identify header attachments; BR/OII also tag the per-sub-item drawings.
// DEL = documento de delineamento de fabricação interna (único por FID).
export type AttachmentCategory = "CRD" | "OII" | "BR" | "DEL";

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
