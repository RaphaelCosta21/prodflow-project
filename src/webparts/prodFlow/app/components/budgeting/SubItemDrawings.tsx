import * as React from "react";
import {
  Button,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Dropdown,
  Option,
  Spinner,
} from "@fluentui/react-components";
import { Delete16Regular, Open16Regular } from "@fluentui/react-icons";
import { AttachmentCategory, IAttachmentRef, ISubItem } from "../../models";
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

const DRAWING_CATEGORIES: { key: AttachmentCategory; label: string }[] = [
  { key: "BR", label: "Desenho BR" },
  { key: "OII", label: "Desenho OII" },
];

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
  const [category, setCategory] = React.useState<AttachmentCategory>("BR");
  const [busy, setBusy] = React.useState(false);

  if (!subItem) return null;

  const drawings = subItem.drawings ?? [];

  const persist = (next: IAttachmentRef[]): void => {
    update.mutate({ subItemId: subItem.id, changes: { drawings: next } });
  };

  const onPick = async (files: FileList | null): Promise<void> => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const uploaded: IAttachmentRef[] = [];
      for (let i = 0; i < files.length; i++) {
        const ref = await AttachmentService.upload(fid, files[i], {
          category,
          refCode: subItem.pn,
        });
        uploaded.push({
          ...ref,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user.displayName,
        });
      }
      persist(drawings.concat(uploaded));
      addToast(`${uploaded.length} desenho(s) anexado(s).`, "success");
    } catch (e) {
      addToast(String(e), "error");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onRemove = async (ref: IAttachmentRef): Promise<void> => {
    setBusy(true);
    try {
      await AttachmentService.remove(ref.url);
      persist(drawings.filter((d) => d.url !== ref.url));
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
              <div className={styles.uploadRow}>
                <Dropdown
                  size="small"
                  value={
                    DRAWING_CATEGORIES.filter((c) => c.key === category)[0]
                      ?.label
                  }
                  selectedOptions={[category]}
                  onOptionSelect={(_, d) =>
                    setCategory(d.optionValue as AttachmentCategory)
                  }
                >
                  {DRAWING_CATEGORIES.map((c) => (
                    <Option key={c.key} value={c.key} text={c.label}>
                      {c.label}
                    </Option>
                  ))}
                </Dropdown>
                <Button
                  appearance="primary"
                  size="small"
                  disabled={busy}
                  onClick={() => inputRef.current?.click()}
                >
                  Anexar desenho
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
                description="Anexe o desenho BR ou OII deste sub-item."
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
