import * as React from "react";
import { Button, Spinner } from "@fluentui/react-components";
import { ArrowUpload20Regular, Delete16Regular } from "@fluentui/react-icons";
import { IAttachmentRef, IFabricationRequest } from "../../models";
import {
  useUploadAttachment,
  useRemoveAttachment,
} from "../../api/attachments";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useUIStore } from "../../stores/useUIStore";
import { distinctAttachments } from "../../utils/quotationHelpers";
import { formatDate } from "../../utils/formatters";
import GlassCard from "./GlassCard";
import EmptyState from "./EmptyState";
import styles from "./DocumentsTab.module.scss";

export interface IDocumentsTabProps {
  data: IFabricationRequest;
}

const FileRow: React.FC<{
  file: IAttachmentRef;
  onRemove?: () => void;
  disabled?: boolean;
}> = ({ file, onRemove, disabled }) => (
  <li className={styles.item}>
    <a
      className={styles.name}
      href={file.url}
      target="_blank"
      rel="noreferrer noopener"
    >
      {file.name}
    </a>
    {file.category && <span className={styles.badge}>{file.category}</span>}
    <span className={styles.kind}>{file.kind}</span>
    {file.uploadedAt && (
      <span className={styles.meta}>{formatDate(file.uploadedAt)}</span>
    )}
    {onRemove && (
      <Button
        size="small"
        appearance="subtle"
        icon={<Delete16Regular />}
        aria-label={`Remover ${file.name}`}
        disabled={disabled}
        onClick={onRemove}
      />
    )}
  </li>
);

export const DocumentsTab: React.FC<IDocumentsTabProps> = ({ data }) => {
  const user = useCurrentUser();
  const addToast = useUIStore((s) => s.addToast);
  const upload = useUploadAttachment();
  const remove = useRemoveAttachment();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const drawings = React.useMemo(
    () =>
      data.subItems.reduce<{ pn: string; file: IAttachmentRef }[]>(
        (acc, s) =>
          acc.concat((s.drawings ?? []).map((f) => ({ pn: s.pn, file: f }))),
        [],
      ),
    [data.subItems],
  );
  const quotes = React.useMemo(
    () => distinctAttachments(data.quotationPackages ?? []),
    [data.quotationPackages],
  );

  const onFiles = (files: FileList | null): void => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) =>
      upload.mutate(
        { fid: data.fid, file, by: user.displayName },
        {
          onSuccess: () => addToast(`${file.name} anexado.`, "success"),
          onError: (e) =>
            addToast((e as Error).message || "Falha no upload.", "error"),
        },
      ),
    );
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={styles.wrap}>
      <GlassCard
        title="Documentos do FID"
        subtitle="Desenho CRD, BOM, NF, databook e o Excel do orçamento."
        actions={
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              className={styles.hiddenInput}
              onChange={(e) => onFiles(e.currentTarget.files)}
            />
            <Button
              icon={
                upload.isLoading ? (
                  <Spinner size="tiny" />
                ) : (
                  <ArrowUpload20Regular />
                )
              }
              disabled={upload.isLoading}
              onClick={() => inputRef.current?.click()}
            >
              {upload.isLoading ? "Enviando…" : "Anexar arquivo"}
            </Button>
          </>
        }
      >
        {data.attachments.length === 0 ? (
          <EmptyState
            title="Nenhum documento"
            description="Os arquivos ficam na biblioteca ProdFlow, numa pasta por FID."
          />
        ) : (
          <ul className={styles.list}>
            {data.attachments.map((a, i) => (
              <FileRow
                key={`${a.url}-${i}`}
                file={a}
                disabled={remove.isLoading}
                onRemove={() =>
                  remove.mutate({
                    fid: data.fid,
                    attachment: a,
                    by: user.displayName,
                  })
                }
              />
            ))}
          </ul>
        )}
      </GlassCard>

      <GlassCard
        title="Desenhos dos sub-itens"
        subtitle="Anexados na página Sub-itens & Estratégia (BR/OII)."
      >
        {drawings.length === 0 ? (
          <EmptyState
            title="Nenhum desenho de sub-item"
            description="Anexe os desenhos BR/OII na definição da estratégia."
          />
        ) : (
          <ul className={styles.list}>
            {drawings.map(({ pn, file }) => (
              <li key={file.url} className={styles.item}>
                <span className={styles.pn}>{pn}</span>
                <a
                  className={styles.name}
                  href={file.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {file.name}
                </a>
                {file.category && (
                  <span className={styles.badge}>{file.category}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      <GlassCard
        title="Cotações anexadas"
        subtitle="PDFs enviados pelo SCM — um arquivo pode cobrir vários sub-itens."
      >
        {quotes.length === 0 ? (
          <EmptyState
            title="Nenhuma cotação anexada"
            description="Os PDFs entram junto com o pacote de cotação."
          />
        ) : (
          <ul className={styles.list}>
            {quotes.map((f) => (
              <FileRow key={f.url} file={f} />
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
};

export default DocumentsTab;
