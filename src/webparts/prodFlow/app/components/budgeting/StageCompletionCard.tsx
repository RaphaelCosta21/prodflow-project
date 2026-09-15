import * as React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Tooltip,
} from "@fluentui/react-components";
import {
  ArrowSync20Regular,
  CheckmarkCircle20Regular,
  LockClosed16Filled,
} from "@fluentui/react-icons";
import { BudgetStageKey, IFabricationRequest } from "../../models";
import {
  useConcludeBudgetStage,
  useReopenBudgetStage,
} from "../../api/fids";
import { useAccessLevel } from "../../hooks/useAccessLevel";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useUIStore } from "../../stores/useUIStore";
import {
  BUDGET_STAGE_LABEL,
  canEditStage,
  canReopenStage,
  openRevisions,
  stageReadiness,
  stageState,
} from "../../utils/budgetApproval";
import { formatDate } from "../../utils/formatters";
import GlassCard from "../common/GlassCard";
import NoticeBar from "../common/NoticeBar";
import styles from "./StageCompletionCard.module.scss";

export interface IStageCompletionCardProps {
  fid: string;
  data: IFabricationRequest;
  stage: BudgetStageKey;
}

export const StageCompletionCard: React.FC<IStageCompletionCardProps> = ({
  fid,
  data,
  stage,
}) => {
  const { teams, isAdmin } = useAccessLevel();
  const user = useCurrentUser();
  const addToast = useUIStore((s) => s.addToast);
  const conclude = useConcludeBudgetStage(fid);
  const reopen = useReopenBudgetStage(fid);
  const [dialog, setDialog] = React.useState<null | "conclude" | "reopen">(
    null,
  );

  const actor = { teams, isAdmin };
  const state = stageState(data, stage);
  const revisoes = openRevisions(data, stage);
  const readiness = stageReadiness(data, stage);
  const mayEdit = canEditStage(stage, actor);
  const mayReopen = canReopenStage(data, stage, actor);
  const busy = conclude.isLoading || reopen.isLoading;

  const run = (kind: "conclude" | "reopen"): void => {
    setDialog(null);
    const mutation = kind === "conclude" ? conclude : reopen;
    mutation.mutate(
      { stage, by: user.displayName },
      {
        onSuccess: () =>
          addToast(
            kind === "conclude"
              ? `Etapa ${BUDGET_STAGE_LABEL[stage]} concluída.`
              : `Etapa ${BUDGET_STAGE_LABEL[stage]} reaberta.`,
            "success",
          ),
        onError: (e) => addToast(String((e as Error).message ?? e), "error"),
      },
    );
  };

  return (
    <>
      <GlassCard
        title={`Etapa ${BUDGET_STAGE_LABEL[stage]}`}
        subtitle="Concluir libera a conferência do time de Projects nos Relatórios de Orçamento."
        actions={
          state.concluido ? (
            <Tooltip
              content={
                mayReopen
                  ? "Reabrir para ajustes"
                  : "Já existe relatório aprovado — peça uma revisão ao time de Projects."
              }
              relationship="label"
            >
              <span>
                <Button
                  icon={<ArrowSync20Regular />}
                  disabled={!mayReopen || busy}
                  onClick={() => setDialog("reopen")}
                >
                  Reabrir
                </Button>
              </span>
            </Tooltip>
          ) : (
            <Tooltip
              content={
                !mayEdit
                  ? `Ação do time responsável por ${BUDGET_STAGE_LABEL[stage]}.`
                  : readiness.ok
                    ? "Concluir e travar a etapa"
                    : "Resolva as pendências abaixo para concluir."
              }
              relationship="label"
            >
              <span>
                <Button
                  appearance="primary"
                  icon={<CheckmarkCircle20Regular />}
                  disabled={!mayEdit || !readiness.ok || busy}
                  onClick={() => setDialog("conclude")}
                >
                  Concluir etapa
                </Button>
              </span>
            </Tooltip>
          )
        }
      >
        <div className={styles.body}>
          {revisoes.map(({ ref, revisao }) => (
            <NoticeBar
              key={ref.key}
              tone="warning"
              title={`Revisão solicitada — ${ref.label}`}
            >
              <span className={styles.motivo}>{revisao.motivo}</span>
              <span className={styles.meta}>
                {revisao.solicitadoPor} · {formatDate(revisao.solicitadoEm)}
              </span>
            </NoticeBar>
          ))}

          {state.concluido && revisoes.length === 0 && (
            <NoticeBar tone="success" title="Etapa concluída">
              <span className={styles.lockLine}>
                <LockClosed16Filled />
                Edição travada
                {state.concluidoPor ? ` · ${state.concluidoPor}` : ""}
                {state.concluidoEm
                  ? ` · ${formatDate(state.concluidoEm)}`
                  : ""}
              </span>
            </NoticeBar>
          )}

          {!state.concluido && !readiness.ok && (
            <NoticeBar tone="info" title="Pendências para concluir">
              <ul className={styles.pendencias}>
                {readiness.pendencias.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </NoticeBar>
          )}

          {!state.concluido && readiness.ok && revisoes.length === 0 && (
            <NoticeBar tone="info" title="Pronto para concluir">
              Nada pendente nesta etapa. Ao concluir, a aba fica somente leitura
              até o time de Projects aprovar ou pedir revisão.
            </NoticeBar>
          )}

          {state.revisionCount ? (
            <div className={styles.counter}>
              Esta etapa já voltou {state.revisionCount}× para revisão.
            </div>
          ) : null}
        </div>
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
              {dialog === "conclude"
                ? `Concluir ${BUDGET_STAGE_LABEL[stage]}?`
                : `Reabrir ${BUDGET_STAGE_LABEL[stage]}?`}
            </DialogTitle>
            <DialogContent>
              {dialog === "conclude"
                ? "A aba ficará somente leitura e os relatórios seguem para a aprovação do time de Projects. Só é possível reabrir enquanto nenhum relatório desta etapa for aprovado."
                : "A aba volta a aceitar edições e o check verde sai da navegação até a etapa ser concluída de novo."}
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setDialog(null)}>
                Cancelar
              </Button>
              <Button
                appearance="primary"
                onClick={() => run(dialog === "conclude" ? "conclude" : "reopen")}
              >
                Confirmar
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
};

export default StageCompletionCard;
