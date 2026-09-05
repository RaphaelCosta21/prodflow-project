import { AttachmentCategory } from "./enums";

export interface IAttachmentRef {
  name: string;
  url: string;
  kind: string;
  // Optional: attachments uploaded before the CRD/OII split have neither.
  category?: AttachmentCategory;
  refCode?: string;
  uploadedAt?: string;
  uploadedBy?: string;
}
