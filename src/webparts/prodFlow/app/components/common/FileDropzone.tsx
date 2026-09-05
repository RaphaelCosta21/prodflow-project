import * as React from "react";
import { Button } from "@fluentui/react-components";
import { ArrowUpload24Regular, Dismiss16Regular } from "@fluentui/react-icons";
import {
  ACCEPTED_ATTACHMENT_ACCEPT,
  ACCEPTED_ATTACHMENT_EXTENSIONS,
  MAX_ATTACHMENT_BYTES,
  isAcceptedAttachment,
} from "../../config/attachments";
import styles from "./FileDropzone.module.scss";

export interface IFileDropzoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  onReject?: (message: string) => void;
  disabled?: boolean;
  inputId: string;
  ariaLabel: string;
}

function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1
    ? `${mb.toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export const FileDropzone: React.FC<IFileDropzoneProps> = ({
  files,
  onFilesChange,
  onReject,
  disabled,
  inputId,
  ariaLabel,
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const addFiles = (incoming: FileList | null): void => {
    if (!incoming || incoming.length === 0) return;
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(incoming)) {
      if (!isAcceptedAttachment(file.name)) {
        rejected.push(`${file.name} (formato não permitido)`);
      } else if (file.size > MAX_ATTACHMENT_BYTES) {
        rejected.push(`${file.name} (maior que 50 MB)`);
      } else if (
        files.some((f) => f.name === file.name && f.size === file.size) ||
        accepted.some((f) => f.name === file.name && f.size === file.size)
      ) {
        rejected.push(`${file.name} (já adicionado)`);
      } else {
        accepted.push(file);
      }
    }
    if (rejected.length > 0 && onReject) {
      onReject(`Arquivos ignorados: ${rejected.join(", ")}`);
    }
    if (accepted.length > 0) onFilesChange([...files, ...accepted]);
  };

  const open = (): void => {
    if (!disabled) inputRef.current?.click();
  };

  const onDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) addFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={ariaLabel}
        aria-disabled={disabled}
        className={`${styles.zone} ${dragging ? styles.dragging : ""} ${disabled ? styles.disabled : ""}`}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <ArrowUpload24Regular className={styles.icon} />
        <span className={styles.prompt}>
          Arraste os arquivos aqui ou clique para selecionar
        </span>
        <span className={styles.hint}>
          {ACCEPTED_ATTACHMENT_EXTENSIONS.join(" · ")} — até 50 MB por arquivo
        </span>
      </div>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_ATTACHMENT_ACCEPT}
        className={styles.hiddenInput}
        disabled={disabled}
        onChange={(e) => {
          addFiles(e.currentTarget.files);
          e.currentTarget.value = "";
        }}
      />
      {files.length > 0 && (
        <ul className={styles.list}>
          {files.map((file) => (
            <li key={`${file.name}-${file.size}`} className={styles.item}>
              <span className={styles.itemName}>{file.name}</span>
              <span className={styles.itemSize}>{formatSize(file.size)}</span>
              <Button
                appearance="subtle"
                size="small"
                icon={<Dismiss16Regular />}
                disabled={disabled}
                aria-label={`Remover ${file.name}`}
                onClick={() => onFilesChange(files.filter((f) => f !== file))}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FileDropzone;
