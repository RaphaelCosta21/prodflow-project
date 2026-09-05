import { IAttachmentRef } from "./attachment";

export interface IQuotationLine {
  subItemId: string;
  qtd: number;
  valorUnit: number;
  valorTotal: number;
  leadTimeDays?: number;
  prazoEntrega?: string; // texto livre do fornecedor ("Imediato", "10 dias")
  obs?: string;
}

// SCM normally asks one supplier to quote several BOM lines at once, so a quotation
// is a package: one supplier, one PDF, N covered sub-items.
export interface IQuotationPackage {
  id: string;
  supplier: string;
  reference?: string;
  date?: string;
  validade?: string;
  moeda: string;
  leadTimeDays?: number;
  attachments: IAttachmentRef[];
  coveredSubItemIds: string[];
  lines: IQuotationLine[];
  obs?: string;
  by?: string;
  concluido?: boolean;
}
