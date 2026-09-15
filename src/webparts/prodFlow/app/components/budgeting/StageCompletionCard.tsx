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
import { useConcludeBudgetStage, useReopenBudgetStage } from "../../api/fids";
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

type StageDialog = "conclude" | "reopen" | "prompt";

// Lembretes já dispensados nesta sessão — evita reabrir o modal a cada troca de aba.
const dismissedPrompts = new Set<string>();

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
  const [dialog, setDialog] = React.useState<StageDialog | undefined>();

  const actor = { teams, isAdmin };
  const state = stageState(data, stage);
  const revisoes = openRevisions(data, stage);
  const readiness = stageReadiness(data, stage);
  const mayEdit = canEditStage(stage, actor);
  const mayReopen = canReopenStage(data, stage, actor);
  const busy = conclude.isLoading || reopen.isLoading;

  const promptKey = `${fid}:${stage}`;
  const readyToConclude = mayEdit && readiness.ok && !state.concluido;

  React.useEffect(() => {
    if (!readyToConclude || dismissedPrompts.has(promptKey)) return;
    setDialog("prompt");
  }, [readyToConclude, promptKey]);

  const closeDialog = (): void => {
    if (dialog === "prompt") dismissedPrompts.add(promptKey);
    setDialog(undefined);
  };

  const run = (kind: "conclude" | "reopen"): void => {
    if (kind === "conclude") dismissedPrompts.add(promptKey);
    setDialog(undefined);
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
                {state.concluidoEm ? ` · ${formatDate(state.concluidoEm)}` : ""}
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
        open={dialog !== undefined}
        modalType="alert"
        onOpenChange={(_, d) => {
          if (!d.open) closeDialog();
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>
              {dialog === "reopen"
                ? `Reabrir ${BUDGET_STAGE_LABEL[stage]}?`
                : dialog === "prompt"
                  ? `${BUDGET_STAGE_LABEL[stage]} está pronta para conclusão`
                  : `Concluir ${BUDGET_STAGE_LABEL[stage]}?`}
            </DialogTitle>
            <DialogContent>
              {dialog === "reopen"
                ? "A aba volta a aceitar edições e o check verde sai da navegação até a etapa ser concluída de novo."
                : dialog === "prompt"
                  ? "Não há mais pendências nesta etapa. Concluir agora envia os relatórios para a conferência do time de Projects e deixa a aba somente leitura — ela só volta a aceitar edições se Projects pedir uma revisão."
                  : "A aba ficará somente leitura e os relatórios seguem para a aprovação do time de Projects. Só é possível reabrir enquanto nenhum relatório desta etapa for aprovado."}
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={closeDialog}>
                {dialog === "prompt" ? "Agora não" : "Cancelar"}
              </Button>
              <Button
                appearance="primary"
                onClick={() => run(dialog === "reopen" ? "reopen" : "conclude")}
              >
                {dialog === "reopen" ? "Confirmar" : "Concluir etapa"}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
};

export default StageCompletionCard;
