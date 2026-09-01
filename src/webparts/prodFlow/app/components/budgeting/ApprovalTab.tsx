import * as React from "react";
import {
  Button,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Field,
  Input,
  Textarea,
} from "@fluentui/react-components";
import { IFabricationRequest, RequestStatus } from "../../models";
import { useUpdateStatus } from "../../api/fids";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useStatusNotifier } from "../../hooks/useStatusNotifier";
import { useUIStore } from "../../stores/useUIStore";
import { canTransition } from "../../utils/statusHelpers";
import { REQUEST_STATUS_MAP } from "../../config/statuses";
import { formatDate } from "../../utils/formatters";
import GlassCard from "../common/GlassCard";
import HistoryTimeline from "../common/HistoryTimeline";
import styles from "./ApprovalTab.module.scss";

const PHASE1_FLOW: RequestStatus[] = [
  "Budgeting",
  "BudgetReview",
  "Submitted",
  "Approved",
];

export interface IApprovalTabProps {
  fid: string;
  data: IFabricationRequest;
}

export const ApprovalTab: React.FC<IApprovalTabProps> = ({ fid, data }) => {
  const user = useCurrentUser();
  const addToast = useUIStore((s) => s.addToast);
  const updateStatus = useUpdateStatus(fid);
  const { notifyStatus } = useStatusNotifier();
  const [dialog, setDialog] = React.useState<null | "approve" | "reject">(null);
  const [signatureRef, setSignatureRef] = React.useState("");
  const [reason, setReason] = React.useState("");

  const go = (
    to: RequestStatus,
    message?: string,
    extra?: { signatureRef?: string },
  ): void =>
    updateStatus.mutate(
      { to, by: user.displayName, message, signatureRef: extra?.signatureRef },
      {
        onSuccess: () => {
          addToast(`Status: ${REQUEST_STATUS_MAP[to].label}.`, "success");
          notifyStatus(fid, to, message ?? `Status → ${to}`).catch(
            () => undefined,
          );
        },
        onError: (e) =>
          addToast((e as Error).message || "Falha na transição.", "error"),
      },
    );

  const confirmDialog = (): void => {
    if (dialog === "approve") {
      go("Approved", "Orçamento aprovado pela Petrobras.", {
        signatureRef: signatureRef || undefined,
      });
    } else if (dialog === "reject") {
      go("Rejected", reason ? `Reprovado: ${reason}` : "Orçamento reprovado.");
    }
    setDialog(null);
    setSignatureRef("");
    setReason("");
  };

  const currentIndex = PHASE1_FLOW.indexOf(data.status);

  return (
    <div className={styles.wrap}>
      <GlassCard title="Fluxo de Aprovação">
        <div className={styles.stepper}>
          {PHASE1_FLOW.map((s, i) => (
            <React.Fragment key={s}>
              <div
                className={[
                  styles.step,
                  currentIndex >= 0 && i < currentIndex ? styles.done : "",
                  s === data.status ? styles.current : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className={styles.stepDot}>{i + 1}</span>
                <span className={styles.stepLabel}>
                  {REQUEST_STATUS_MAP[s].label}
                </span>
              </div>
              {i < PHASE1_FLOW.length - 1 && (
                <span className={styles.stepLine} />
              )}
            </React.Fragment>
          ))}
        </div>
        {data.status === "Rejected" && (
          <div className={styles.rejected}>
            Orçamento reprovado — revise e reenvie.
          </div>
        )}
      </GlassCard>

      <GlassCard title="Ações">
        <div className={styles.actions}>
          {canTransition(data.status, "BudgetReview") && (
            <Button
              onClick={() =>
                go("BudgetReview", "Orçamento consolidado para revisão.")
              }
            >
              Consolidar (revisão)
            </Button>
          )}
          {canTransition(data.status, "Submitted") && (
            <Button
              appearance="primary"
              onClick={() => go("Submitted", "Orçamento enviado à Petrobras.")}
            >
              Enviar à Petrobras
            </Button>
          )}
          {data.status === "Submitted" && (
            <>
              <Button appearance="primary" onClick={() => setDialog("approve")}>
                Registrar aprovação
              </Button>
              <Button onClick={() => setDialog("reject")}>
                Registrar reprovação
              </Button>
            </>
          )}
          {data.status === "Rejected" && (
            <Button
              onClick={() => go("Budgeting", "Revisão do orçamento iniciada.")}
            >
              Revisar orçamento
            </Button>
          )}
          {canTransition(data.status, "ReleasedForProduction") && (
            <Button
              appearance="primary"
              onClick={() =>
                go("ReleasedForProduction", "Liberado para produção (Go Live).")
              }
            >
              Liberar para produção
            </Button>
          )}
          {canTransition(data.status, "OnHold") && (
            <Button onClick={() => go("OnHold", "FID paralisado.")}>
              Paralisar
            </Button>
          )}
          {canTransition(data.status, "Cancelled") && (
            <Button onClick={() => go("Cancelled", "FID cancelado.")}>
              Cancelar
            </Button>
          )}
        </div>
        {data.approval && (
          <div className={styles.approvalInfo}>
            Aprovado por <b>{data.approval.by}</b> em{" "}
            {formatDate(data.approval.date)}
            {data.approval.signatureRef
              ? ` · Ref.: ${data.approval.signatureRef}`
              : ""}
          </div>
        )}
      </GlassCard>

      <GlassCard title="Histórico">
        <HistoryTimeline events={data.history} />
      </GlassCard>

      <Dialog
        open={dialog !== null}
        modalType="alert"
        onOpenChange={(_, d) => {
          if (!d.open) setDialog(null);
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>
              {dialog === "approve"
                ? "Registrar aprovação"
                : "Registrar reprovação"}
            </DialogTitle>
            <DialogContent>
              {dialog === "approve" ? (
                <Field label="Referência da assinatura (opcional)">
                  <Input
                    value={signatureRef}
                    onChange={(_, d) => setSignatureRef(d.value)}
                  />
                </Field>
              ) : (
                <Field label="Motivo da reprovação">
                  <Textarea
                    value={reason}
                    onChange={(_, d) => setReason(d.value)}
                  />
                </Field>
              )}
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setDialog(null)}>
                Cancelar
              </Button>
              <Button appearance="primary" onClick={confirmDialog}>
                Confirmar
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};

export default ApprovalTab;
