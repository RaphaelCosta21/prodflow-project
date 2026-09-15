import * as React from "react";
import { Badge, Button, Spinner } from "@fluentui/react-components";
import {
  ArrowUpload20Regular,
  Delete16Regular,
  Open16Regular,
} from "@fluentui/react-icons";
import { IAttachmentRef, IFabricationRequest } from "../../models";
import { ACCEPTED_ATTACHMENT_ACCEPT } from "../../config/attachments";
import {
  useRemoveAttachment,
  useUploadAttachment,
} from "../../api/attachments";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useUIStore } from "../../stores/useUIStore";
import GlassCard from "./GlassCard";
import styles from "./FidDrawingCard.module.scss";

export interface IFidDrawingCardProps {
  data: IFabricationRequest;
  compact?: boolean;
  canEdit?: boolean;
}

function isMainDrawingAttachment(
  attachment: IAttachmentRef,
  drawingCode: string,
): boolean {
  return (
    attachment.category === "CRD" ||
    (!!drawingCode && attachment.refCode === drawingCode)
  );
}

export const FidDrawingCard: React.FC<IFidDrawingCardProps> = ({
  data,
  compact,
  canEdit = false,
}) => {
  const user = useCurrentUser();
  const addToast = useUIStore((s) => s.addToast);
  const upload = useUploadAttachment();
  const remove = useRemoveAttachment();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const drawingRef = `${data.drawing.code} ${data.drawing.revision}`.trim();
  const files = React.useMemo(
    () =>
      data.attachments.filter((a) =>
        isMainDrawingAttachment(a, data.drawing.code),
      ),
    [data.attachments, data.drawing.code],
  );

  const onFiles = (selected: FileList | null): void => {
    if (!selected || selected.length === 0) return;
    Array.from(selected).forEach((file) =>
      upload.mutate(
        {
          fid: data.fid,
          file,
          by: user.displayName,
          category: "CRD",
          refCode: data.drawing.code,
        },
        {
          onSuccess: () => addToast(`${file.name} anexado.`, "success"),
          onError: (e) =>
            addToast((e as Error).message || "Falha no upload.", "error"),
        },
      ),
    );
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(false);
    if (!canEdit || upload.isLoading) return;
    onFiles(event.dataTransfer.files);
  };

  const openPicker = (): void => {
    if (!upload.isLoading) inputRef.current?.click();
  };

  return (
    <GlassCard
      title="Desenho Top-Level"
      subtitle={
        drawingRef ||
        "Anexo enviado no modal de Novo FID e compartilhado entre as abas."
      }
    >
      {canEdit && (
        <>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            accept={ACCEPTED_ATTACHMENT_ACCEPT}
            onChange={(e) => onFiles(e.currentTarget.files)}
          />
          <div
            role="button"
            tabIndex={upload.isLoading ? -1 : 0}
            aria-label="Anexar o Desenho Top-Level"
            aria-disabled={upload.isLoading}
            className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ""} ${upload.isLoading ? styles.dropzoneBusy : ""}`}
            onClick={openPicker}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openPicker();
              }
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragging(false);
            }}
            onDrop={onDrop}
          >
            {upload.isLoading ? (
              <Spinner size="tiny" />
            ) : (
              <ArrowUpload20Regular className={styles.dropIcon} />
            )}
            <span>Arraste aqui ou clique para anexar o Desenho Top-Level.</span>
          </div>
        </>
      )}
      {files.length === 0 ? (
        <p className={styles.emptyNote}>
          Sem arquivo do Desenho Top-Level. Quando anexado no Novo FID ou nesta
          aba, o desenho aparece aqui destacado.
        </p>
      ) : (
        <ul className={compact ? styles.compactList : styles.list}>
          {files.map((file) => (
            <li key={file.url} className={styles.item}>
              <Badge appearance="tint" color="brand">
                Top-Level
              </Badge>
              <a
                className={styles.link}
                href={file.url}
                target="_blank"
                rel="noreferrer noopener"
              >
                <span>{file.name}</span>
                <Open16Regular />
              </a>
              {file.uploadedBy && (
                <span className={styles.meta}>{file.uploadedBy}</span>
              )}
              {canEdit && (
                <Button
                  size="small"
                  appearance="subtle"
                  icon={<Delete16Regular />}
                  disabled={remove.isLoading}
                  onClick={() =>
                    remove.mutate(
                      {
                        fid: data.fid,
                        attachment: file,
                        by: user.displayName,
                      },
                      {
                        onSuccess: () => addToast("Anexo removido.", "success"),
                        onError: (e) => addToast(String(e), "error"),
                      },
                    )
                  }
                  aria-label={`Remover ${file.name}`}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
};

export default FidDrawingCard;
