import { AttachmentCategory } from "../models/enums";

// Upload limit of AttachmentService.upload (no chunked upload yet).
export const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;

export const ACCEPTED_ATTACHMENT_EXTENSIONS: string[] = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".zip",
];

export const ACCEPTED_ATTACHMENT_ACCEPT =
  ACCEPTED_ATTACHMENT_EXTENSIONS.join(",");

interface IAttachmentCategoryDef {
  label: string;
  folder: string;
}

// Sub-folder per category inside the FID folder, so a CRD and an OII file can share a file name.
export const ATTACHMENT_CATEGORIES: Record<
  AttachmentCategory,
  IAttachmentCategoryDef
> = {
  CRD: { label: "Desenho (CRD)", folder: "CRD" },
  OII: { label: "Part Number OII", folder: "OII" },
  BR: { label: "Desenho BR", folder: "BR" },
  DEL: { label: "Delineamento de Fab.", folder: "Delineamento" },
};

export function attachmentExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot < 0 ? "" : fileName.slice(dot).toLowerCase();
}

export function isAcceptedAttachment(fileName: string): boolean {
  return (
    ACCEPTED_ATTACHMENT_EXTENSIONS.indexOf(attachmentExtension(fileName)) >= 0
  );
}
