import {
  useMutation,
  useQueryClient,
  UseMutationResult,
} from "@tanstack/react-query";
import { IAttachmentRef, IFabricationRequest } from "../models";
import { AttachmentService } from "../services/AttachmentService";
import { RequestService } from "../services/RequestService";
import { queryKeys } from "./queryKeys";

interface IUploadVars {
  fid: string;
  file: File;
  by: string;
}

interface IRemoveVars {
  fid: string;
  attachment: IAttachmentRef;
  by: string;
}

// Uploads to the ProdFlow library, then records the reference + history on the FID.
export function useUploadAttachment(): UseMutationResult<
  IFabricationRequest,
  unknown,
  IUploadVars
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: IUploadVars) => {
      const ref = await AttachmentService.upload(vars.fid, vars.file);
      return RequestService.updateSection(vars.fid, (draft) => {
        const exists = draft.attachments.some((a) => a.url === ref.url);
        if (!exists) draft.attachments.push(ref);
        draft.history.push({
          ts: new Date().toISOString(),
          by: vars.by,
          type: "attachment-added",
          message: `Anexo adicionado: ${ref.name}`,
        });
      });
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: queryKeys.fid(vars.fid) }),
  });
}

export function useRemoveAttachment(): UseMutationResult<
  IFabricationRequest,
  unknown,
  IRemoveVars
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: IRemoveVars) => {
      await AttachmentService.remove(vars.attachment.url);
      return RequestService.updateSection(vars.fid, (draft) => {
        draft.attachments = draft.attachments.filter(
          (a) => a.url !== vars.attachment.url,
        );
        draft.history.push({
          ts: new Date().toISOString(),
          by: vars.by,
          type: "attachment-removed",
          message: `Anexo removido: ${vars.attachment.name}`,
        });
      });
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: queryKeys.fid(vars.fid) }),
  });
}
