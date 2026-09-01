import { SPService } from "./SPService";
import { SP_CONFIG } from "../config/sharepoint.config";
import { IAttachmentRef } from "../models";
import "@pnp/sp/folders";
import "@pnp/sp/files";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

// SharePoint rejects these in file names; strip them so an upload can't fail late.
function sanitizeFileName(name: string): string {
  return name.replace(/[~#%&*{}\\:<>?/+|"]/g, "-").trim();
}

// One folder per FID inside the ProdFlow document library.
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

  public static async upload(fid: string, file: File): Promise<IAttachmentRef> {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error("Arquivo maior que 50 MB.");
    }
    const folderUrl = await AttachmentService.ensureFidFolder(fid);
    const name = sanitizeFileName(file.name);
    const added = await SPService.sp.web
      .getFolderByServerRelativePath(folderUrl)
      .files.addUsingPath(name, file, { Overwrite: true });
    const item = await added.file.select("Name", "ServerRelativeUrl")();
    return {
      name: String(item.Name ?? name),
      url: String(item.ServerRelativeUrl ?? `${folderUrl}/${name}`),
      kind: name.split(".").pop() ?? "file",
    };
  }

  public static async remove(url: string): Promise<void> {
    await SPService.sp.web.getFileByServerRelativePath(url).delete();
  }
}
