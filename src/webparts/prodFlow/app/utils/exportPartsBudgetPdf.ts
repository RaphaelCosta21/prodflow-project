import { IFabricationRequest, IPartsBudget } from "../models";
import { AttachmentService } from "../services/AttachmentService";
import { winningAttachments } from "./quotationHelpers";
import type { IQuotationSource } from "./partsReportPdf";

export interface IPartsBudgetPdfResult {
  /** Quotation PDFs appended after the report table. */
  attached: number;
  /** Attachments that could not be appended (not a PDF, unreadable, protected). */
  skipped: string[];
}

function isPdf(name: string): boolean {
  return /\.pdf$/i.test(name);
}

function triggerDownload(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * "Relatório Orçamento Tabela 3" as a single PDF: the controlled table followed by the
 * quotes of the winning suppliers, copied page for page (no rasterisation).
 */
export async function exportPartsBudgetPdf(
  request: IFabricationRequest,
  budget: IPartsBudget,
): Promise<IPartsBudgetPdfResult> {
  const attachments = winningAttachments(request);
  const skipped = attachments.filter((a) => !isPdf(a.name)).map((a) => a.name);

  const quotations: IQuotationSource[] = [];
  for (const attachment of attachments.filter((a) => isPdf(a.name))) {
    try {
      quotations.push({
        name: attachment.name,
        bytes: await AttachmentService.getBuffer(attachment.url),
      });
    } catch {
      skipped.push(attachment.name);
    }
  }

  const { buildPartsBudgetPdf } = await import(
    /* webpackChunkName: 'parts-report-pdf' */ "./partsReportPdf"
  );
  const result = await buildPartsBudgetPdf(request, budget, quotations);

  triggerDownload(
    result.bytes,
    `Relatório de Orçamento de Partes e Peças ${request.fid}.pdf`,
  );

  return { attached: result.attached, skipped: skipped.concat(result.skipped) };
}
