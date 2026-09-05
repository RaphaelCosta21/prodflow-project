import { SPService } from "./SPService";
import { SP_CONFIG } from "../config/sharepoint.config";
import {
  ATTACHMENT_CATEGORIES,
  MAX_ATTACHMENT_BYTES,
  isAcceptedAttachment,
} from "../config/attachments";
import { AttachmentCategory, IAttachmentRef } from "../models";
import "@pnp/sp/folders";
import "@pnp/sp/files";
import "@pnp/sp/items";

export interface IUploadOptions {
  category?: AttachmentCategory;
  refCode?: string;
}

// SharePoint rejects these in file names; strip them so an upload can't fail late.
function sanitizeFileName(name: string): string {
  return name.replace(/[~#%&*{}\\:<>?/+|"]/g, "-").trim();
}

// One folder per FID inside the ProdFlow library, with a sub-folder per attachment category.
export class AttachmentService {
  private static get libraryUrl(): string {
    return `${SP_CONFIG.libraries.attachments}`;
  }

  private static async ensureFidFolder(fid: string): Promise<string> {
    const web = SPService.sp.web;
    const list = web.lists.getByTitle(AttachmentService.libraryUrl);
    const rootFolder = await list.rootFolder();
    const serverRelative = `${rootFolder.ServerRelativeUrl}/${fid}`;
    try {
      await web.getFolderByServerRelativePath(serverRelative)();
    } catch {
      await list.rootFolder.folders.addUsingPath(fid);
    }
    return serverRelative;
  }

  private static async ensureCategoryFolder(
    fid: string,
    category?: AttachmentCategory,
  ): Promise<string> {
    const fidFolder = await AttachmentService.ensureFidFolder(fid);
    if (!category) return fidFolder;
    const web = SPService.sp.web;
    const name = ATTACHMENT_CATEGORIES[category].folder;
    const serverRelative = `${fidFolder}/${name}`;
    try {
      await web.getFolderByServerRelativePath(serverRelative)();
    } catch {
      await web
        .getFolderByServerRelativePath(fidFolder)
        .folders.addUsingPath(name);
    }
    return serverRelative;
  }

  public static async list(fid: string): Promise<IAttachmentRef[]> {
    try {
      const folderUrl = await AttachmentService.ensureFidFolder(fid);
      const files = await SPService.sp.web
        .getFolderByServerRelativePath(folderUrl)
        .files.select("Name", "ServerRelativeUrl", "TimeCreated")();
      return files.map((f) => ({
        name: f.Name,
        url: f.ServerRelativeUrl,
        kind: f.Name.split(".").pop() ?? "file",
      }));
    } catch {
      return [];
    }
  }

  public static async upload(
    fid: string,
    file: File,
    options?: IUploadOptions,
  ): Promise<IAttachmentRef> {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new Error("Arquivo maior que 50 MB.");
    }
    // Re-checked here because drag-and-drop bypasses the input's `accept` filter.
    if (!isAcceptedAttachment(file.name)) {
      throw new Error("Tipo de arquivo não permitido.");
    }
    const folderUrl = await AttachmentService.ensureCategoryFolder(
      fid,
      options?.category,
    );
    const name = sanitizeFileName(file.name);
    const added = await SPService.sp.web
      .getFolderByServerRelativePath(folderUrl)
      .files.addUsingPath(name, file, { Overwrite: true });
    const item = await added.file.select("Name", "ServerRelativeUrl")();
    const url = String(item.ServerRelativeUrl ?? `${folderUrl}/${name}`);
    await AttachmentService.tagFile(url, fid, options);
    return {
      name: String(item.Name ?? name),
      url,
      kind: name.split(".").pop() ?? "file",
      category: options?.category,
      refCode: options?.refCode,
    };
  }

  // Best-effort: the file is already stored, so an unprovisioned column must not fail the upload.
  private static async tagFile(
    url: string,
    fid: string,
    options?: IUploadOptions,
  ): Promise<void> {
    const lf = SP_CONFIG.libraryFields;
    try {
      const listItem = await SPService.sp.web
        .getFileByServerRelativePath(url)
        .getItem();
      await listItem.update({
        [lf.fid]: fid,
        [lf.docType]: options?.category ?? "",
        [lf.refCode]: options?.refCode ?? "",
      });
    } catch {
      /* library columns not provisioned yet — the upload itself already succeeded */
    }
  }

  public static async remove(url: string): Promise<void> {
    await SPService.sp.web.getFileByServerRelativePath(url).delete();
  }
}
