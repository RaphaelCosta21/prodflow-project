import * as React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Textarea,
  Tooltip,
} from "@fluentui/react-components";
import {
  ArrowSync16Filled,
  CheckmarkCircle16Filled,
  Clock16Regular,
} from "@fluentui/react-icons";
import { IFabricationRequest } from "../../models";
import {
  useApproveBudgetReports,
  useRequestBudgetReportRevision,
} from "../../api/fids";
import { useAccessLevel } from "../../hooks/useAccessLevel";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useUIStore } from "../../stores/useUIStore";
import {
  BUDGET_STAGE_LABEL,
  IBudgetReportRef,
  canApproveReports,
  reviewFor,
  stageState,
} from "../../utils/budgetApproval";
import { formatDate } from "../../utils/formatters";
import ReportRevisionNote from "./ReportRevisionNote";
import styles from "./ReportReviewBar.module.scss";

export interface IReportReviewBarProps {
  fid: string;
  data: IFabricationRequest;
  report: IBudgetReportRef;
}

export const ReportReviewBar: React.FC<IReportReviewBarProps> = ({
  fid,
  data,
  report,
}) => {
  const { teams, isAdmin } = useAccessLevel();
  const user = useCurrentUser();
  const addToast = useUIStore((s) => s.addToast);
  const approve = useApproveBudgetReports(fid);
  const requestRevision = useRequestBudgetReportRevision(fid);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [motivo, setMotivo] = React.useState("");

  const review = reviewFor(data, report);
  const mayReview = canApproveReports({ teams, isAdmin });
  const stageReady = stageState(data, report.stage).concluido;
  const busy = approve.isLoading || requestRevision.isLoading;

  const onApprove = (): void =>
    approve.mutate(
      { keys: [report.key], by: user.displayName },
      {
        onSuccess: () => addToast(`${report.label} aprovado.`, "success"),
        onError: (e) => addToast(String((e as Error).message ?? e), "error"),
      },
    );

  const onRequestRevision = (): void => {
    requestRevision.mutate(
      { key: report.key, motivo, by: user.displayName },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setMotivo("");
          addToast(
            `Revisão enviada para ${BUDGET_STAGE_LABEL[report.stage]}.`,
            "success",
          );
        },
        onError: (e) => addToast(String((e as Error).message ?? e), "error"),
      },
    );
  };

  const statusChip =
    review.status === "approved" ? (
      <span className={`${styles.chip} ${styles.approved}`}>
        <CheckmarkCircle16Filled />
        Aprovado
      </span>
    ) : review.status === "revision" ? (
      <span className={`${styles.chip} ${styles.revision}`}>
        <ArrowSync16Filled />
        Em revisão
      </span>
    ) : (
      <span className={`${styles.chip} ${styles.pending}`}>
        <Clock16Regular />
        Aguardando aprovação
      </span>
    );

  return (
    <>
      <div className={styles.bar}>
        {statusChip}
        {review.status === "approved" && review.aprovadoPor && (
          <span className={styles.meta}>
            {review.aprovadoPor}
            {review.aprovadoEm ? ` · ${formatDate(review.aprovadoEm)}` : ""}
          </span>
        )}
        {review.status !== "approved" && !stageReady && (
          <span className={styles.meta}>
            Etapa {BUDGET_STAGE_LABEL[report.stage]} ainda em aberto.
          </span>
        )}
        {mayReview && (
          <div className={styles.actions}>
            {review.status !== "approved" && (
              <Tooltip
                content={
                  stageReady
                    ? "Aprovar este relatório"
                    : `Aguarde a conclusão da etapa ${BUDGET_STAGE_LABEL[report.stage]}.`
                }
                relationship="label"
              >
                <span>
                  <Button
                    size="small"
                    appearance="primary"
                    disabled={!stageReady || busy}
                    onClick={onApprove}
                  >
                    Aprovar
                  </Button>
                </span>
              </Tooltip>
            )}
            {review.status !== "revision" && (
              <Tooltip
                content={
                  stageReady
                    ? "Devolver este relatório para correção"
                    : `Aguarde a conclusão da etapa ${BUDGET_STAGE_LABEL[report.stage]}.`
                }
                relationship="label"
              >
                <span>
                  <Button
                    size="small"
                    disabled={!stageReady || busy}
                    onClick={() => setDialogOpen(true)}
                  >
                    Solicitar revisão
                  </Button>
                </span>
              </Tooltip>
            )}
          </div>
        )}
      </div>

      {review.status === "revision" && review.revisaoAtual && (
        <ReportRevisionNote
          revisao={review.revisaoAtual}
          className={styles.revisionNote}
        />
      )}

      <Dialog
        open={dialogOpen}
        modalType="alert"
        onOpenChange={(_, d) => {
          if (!d.open) setDialogOpen(false);
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Solicitar revisão — {report.label}</DialogTitle>
            <DialogContent>
              <p className={styles.dialogHint}>
                A aba <b>{BUDGET_STAGE_LABEL[report.stage]}</b> volta a aceitar
                edições e o motivo abaixo aparece lá para o time responsável.
              </p>
              <Field label="Motivo da revisão" required>
                <Textarea
                  resize="vertical"
                  value={motivo}
                  onChange={(_, d) => setMotivo(d.value)}
                />
              </Field>
            </DialogContent>
            <DialogActions>
              <Button
                appearance="secondary"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                appearance="primary"
                disabled={!motivo.trim() || busy}
                onClick={onRequestRevision}
              >
                Solicitar revisão
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
};

export default ReportReviewBar;
