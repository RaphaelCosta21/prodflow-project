import * as React from "react";
import {
  Button,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Spinner,
} from "@fluentui/react-components";
import {
  ArrowUpload20Regular,
  Delete16Regular,
  Open16Regular,
} from "@fluentui/react-icons";
import { IAttachmentRef, ISubItem } from "../../models";
import { ACCEPTED_ATTACHMENT_ACCEPT } from "../../config/attachments";
import { AttachmentService } from "../../services/AttachmentService";
import { useUpdateSubItem } from "../../api/fids";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useUIStore } from "../../stores/useUIStore";
import EmptyState from "../common/EmptyState";
import styles from "./SubItemDrawings.module.scss";

export interface ISubItemDrawingsProps {
  fid: string;
  subItem?: ISubItem;
  canEdit: boolean;
  onClose: () => void;
}

export const SubItemDrawings: React.FC<ISubItemDrawingsProps> = ({
  fid,
  subItem,
  canEdit,
  onClose,
}) => {
  const user = useCurrentUser();
  const addToast = useUIStore((s) => s.addToast);
  const update = useUpdateSubItem(fid);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  if (!subItem) return null;

  const drawings = subItem.drawings ?? [];

  const persist = (
    next: IAttachmentRef[],
    log?: { type: string; message: string },
  ): void => {
    update.mutate({
      subItemId: subItem.id,
      changes: { drawings: next },
      by: user.displayName,
      log,
    });
  };

  const onPick = async (files: FileList | null): Promise<void> => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const uploaded: IAttachmentRef[] = [];
      for (let i = 0; i < files.length; i++) {
        const ref = await AttachmentService.upload(fid, files[i], {
          category: "BR",
          refCode: subItem.pn,
        });
        uploaded.push({
          ...ref,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user.displayName,
        });
      }
      persist(drawings.concat(uploaded), {
        type: "subitem:attachment-added",
        message: `${subItem.pn}: desenho(s) anexado(s) — ${uploaded
          .map((r) => r.name)
          .join(", ")}`,
      });
      addToast(`${uploaded.length} desenho(s) anexado(s).`, "success");
    } catch (e) {
      addToast(String(e), "error");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(false);
    if (!canEdit || busy) return;
    onPick(event.dataTransfer.files).catch(() => undefined);
  };
  const onRemove = async (ref: IAttachmentRef): Promise<void> => {
    setBusy(true);
    try {
      await AttachmentService.remove(ref.url);
      persist(
        drawings.filter((d) => d.url !== ref.url),
        {
          type: "subitem:attachment-removed",
          message: `${subItem.pn}: desenho removido — ${ref.name}`,
        },
      );
    } catch (e) {
      addToast(String(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(_, d) => !d.open && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>
            Desenhos — {subItem.pn}
            <span className={styles.subtitle}>{subItem.descricao}</span>
          </DialogTitle>
          <DialogContent>
            {canEdit && (
              <div
                className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ""}`}
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
                <ArrowUpload20Regular className={styles.dropIcon} />
                <div className={styles.dropText}>
                  <strong>Arraste os desenhos aqui</strong>
                  <span>ou selecione arquivos do computador</span>
                </div>
                <Button
                  appearance="primary"
                  size="small"
                  disabled={busy}
                  onClick={() => inputRef.current?.click()}
                >
                  Selecionar arquivos
                </Button>
                {busy && <Spinner size="tiny" />}
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  hidden
                  accept={ACCEPTED_ATTACHMENT_ACCEPT}
                  onChange={(e) => {
                    onPick(e.target.files).catch(() => undefined);
                  }}
                />
              </div>
            )}

            {drawings.length === 0 ? (
              <EmptyState
                title="Sem desenhos"
                description="Arraste ou selecione os desenhos deste sub-item."
              />
            ) : (
              <ul className={styles.list}>
                {drawings.map((d) => (
                  <li key={d.url} className={styles.item}>
                    <span className={styles.badge}>{d.category ?? "—"}</span>
                    <a
                      className={styles.name}
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {d.name}
                      <Open16Regular />
                    </a>
                    {canEdit && (
                      <Button
                        size="small"
                        appearance="subtle"
                        icon={<Delete16Regular />}
                        disabled={busy}
                        onClick={() => {
                          onRemove(d).catch(() => undefined);
                        }}
                        aria-label={`Remover ${d.name}`}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>
              Fechar
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default SubItemDrawings;
