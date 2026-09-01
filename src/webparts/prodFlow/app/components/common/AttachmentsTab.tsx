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
import { formatDate } from "../../utils/formatters";
import GlassCard from "../common/GlassCard";
import EmptyState from "../common/EmptyState";
import HistoryTimeline from "../common/HistoryTimeline";
import styles from "./AttachmentsTab.module.scss";

export interface IAttachmentsTabProps {
  data: IFabricationRequest;
}

export const AttachmentsTab: React.FC<IAttachmentsTabProps> = ({ data }) => {
  const user = useCurrentUser();
  const addToast = useUIStore((s) => s.addToast);
  const upload = useUploadAttachment();
  const remove = useRemoveAttachment();
  const inputRef = React.useRef<HTMLInputElement>(null);

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

  const onRemove = (attachment: IAttachmentRef): void =>
    remove.mutate(
      { fid: data.fid, attachment, by: user.displayName },
      {
        onSuccess: () => addToast(`${attachment.name} removido.`, "success"),
        onError: () => addToast("Falha ao remover o anexo.", "error"),
      },
    );

  return (
    <div className={styles.wrap}>
      <GlassCard
        title="Anexos"
        subtitle="Desenhos CRD, cotações, NF, databook e o Excel do orçamento."
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
            title="Nenhum anexo"
            description="Os arquivos ficam na biblioteca ProdFlow, numa pasta por FID."
          />
        ) : (
          <ul className={styles.list}>
            {data.attachments.map((a, i) => (
              <li key={`${a.url}-${i}`} className={styles.item}>
                <a
                  className={styles.name}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {a.name}
                </a>
                <span className={styles.kind}>{a.kind}</span>
                <Button
                  size="small"
                  appearance="subtle"
                  icon={<Delete16Regular />}
                  aria-label={`Remover ${a.name}`}
                  disabled={remove.isLoading}
                  onClick={() => onRemove(a)}
                />
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      <GlassCard title="Datas do FID">
        <div className={styles.dates}>
          <div>
            <span>Recebimento da demanda</span>
            <b>{formatDate(data.dates.recebimentoDemanda)}</b>
          </div>
          <div>
            <span>Solicitação de orçamento</span>
            <b>{formatDate(data.dates.solicitacaoOrcamento)}</b>
          </div>
          <div>
            <span>Prazo p/ envio</span>
            <b>{formatDate(data.dates.prazoEnvioPetrobras)}</b>
          </div>
          <div>
            <span>Envio à Petrobras</span>
            <b>{formatDate(data.dates.dataEnvioPetrobras)}</b>
          </div>
          <div>
            <span>Aprovação Petrobras</span>
            <b>{formatDate(data.dates.dataAprovacaoPetrobras)}</b>
          </div>
        </div>
      </GlassCard>

      <GlassCard title="Timeline">
        <HistoryTimeline events={data.history} />
      </GlassCard>
    </div>
  );
};

export default AttachmentsTab;
