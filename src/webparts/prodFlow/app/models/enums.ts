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

export type RequestStatus =
  | "Draft"
  | "Budgeting"
  | "BudgetReview"
  | "Submitted"
  | "Approved"
  | "Rejected"
  | "ReleasedForProduction"
  | "InProduction"
  | "FinalInspection"
  | "Delivered"
  | "Completed"
  | "Closed"
  | "OnHold"
  | "Cancelled";

export type SubItemStatus =
  // Phase 1
  | "NotStarted"
  | "Strategy"
  | "WaitingDelineation"
  | "WaitingQuotation"
  | "Costed"
  // Phase 2
  | "WaitingRelease"
  | "InProcurement"
  | "WaitingMaterial"
  | "InFabrication"
  | "Subcontracted"
  | "InInspection"
  | "ReadyInStock"
  | "InAssembly"
  | "Completed"
  | "OnHold"
  | "Cancelled";
