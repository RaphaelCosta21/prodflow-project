import * as React from "react";
import {
  Button,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Textarea,
  Tooltip,
} from "@fluentui/react-components";
import { CheckmarkCircle20Filled } from "@fluentui/react-icons";
import { IFabricationRequest, RequestStatus } from "../../models";
import { phasesFor } from "../../config/phases";
import { REQUEST_STATUSES } from "../../config/statuses";
import { isSubItemCosted, workflowOf } from "../../config/workflows";
import { useUpdateStatus } from "../../api/fids";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useStatusColors } from "../../hooks/useStatusColors";
import { useStatusPermissions } from "../../hooks/useStatusPermissions";
import { useLiveElapsed } from "../../hooks/useLiveElapsed";
import { useUIStore } from "../../stores/useUIStore";
import {
  currentPhaseStart,
  currentStatusStart,
  entryDurationHours,
  requestStart,
  timelineFreezeTime,
} from "../../utils/historyHelpers";
import { formatDurationFromHours } from "../../utils/durationHelpers";
import { formatDateTime } from "../../utils/formatters";
import GlassCard from "../common/GlassCard";
import KPICard from "../common/KPICard";
import StatusBadge from "../common/StatusBadge";
import SubItemStatusList from "./SubItemStatusList";
import styles from "./PhaseStatusTab.module.scss";

export interface IPhaseStatusTabProps {
  fid: string;
  data: IFabricationRequest;
}

const TRANSVERSAL: RequestStatus[] = ["OnHold", "Cancelled"];

export const PhaseStatusTab: React.FC<IPhaseStatusTabProps> = ({
  fid,
  data,
}) => {
  const user = useCurrentUser();
  const colors = useStatusColors();
  const addToast = useUIStore((s) => s.addToast);
  const updateStatus = useUpdateStatus(fid);
  const flow = workflowOf(data.tipoOrcamento);
  const phases = phasesFor(flow);
  const { allowed, canMoveTo, ownerLabel } = useStatusPermissions(
    data.status,
    flow,
    data.resumeStatus,
  );

  const [target, setTarget] = React.useState<RequestStatus | undefined>();
  const [note, setNote] = React.useState("");

  const frozenTime = timelineFreezeTime(data);
  const openStatus = (data.statusHistory ?? []).filter((e) => !e.end).pop();
  const phaseStart = currentPhaseStart(data);
  const liveStatus = useLiveElapsed(currentStatusStart(data), frozenTime);
  const livePhase = useLiveElapsed(phaseStart, frozenTime);
  const liveTotal = useLiveElapsed(requestStart(data), frozenTime);

  const currentPhaseIndex = phases.findIndex((p) => p.phase === data.phase);
  // "N/A" lines never get costed, so they must not dilute (nor inflate) the progress.
  const costable = data.subItems.filter((s) => s.strategy !== "NA");
  const costed = costable.filter((s) => isSubItemCosted(s.status)).length;
  const costedPct = costable.length
    ? Math.round((costed / costable.length) * 100)
    : 0;

  const confirm = (): void => {
    if (!target) return;
    updateStatus.mutate(
      { to: target, by: user.displayName, message: note || undefined },
      {
        onSuccess: () => {
          addToast(`Status → ${colors.requestStatus(target).label}`, "success");
          setTarget(undefined);
          setNote("");
        },
        onError: (e) => addToast(String(e), "error"),
      },
    );
  };

  const renderStatusButton = (status: RequestStatus): JSX.Element => {
    const def = colors.requestStatus(status);
    const permitted = canMoveTo(status);
    const button = (
      <button
        key={status}
        type="button"
        className={`${styles.statusCard} ${permitted ? "" : styles.statusCardLocked}`}
        style={{ "--status-color": def.color } as React.CSSProperties}
        disabled={!permitted || updateStatus.isLoading}
        onClick={() => setTarget(status)}
      >
        <span className={styles.statusDot} />
        <span className={styles.statusLabel}>{def.label}</span>
      </button>
    );
    return permitted ? (
      button
    ) : (
      <Tooltip
        key={status}
        content={`Ação do time ${ownerLabel(status)}`}
        relationship="label"
      >
        <span className={styles.tooltipWrap}>{button}</span>
      </Tooltip>
    );
  };

  const nextStatuses = allowed.filter((s) => TRANSVERSAL.indexOf(s) < 0);
  const transversal = allowed.filter((s) => TRANSVERSAL.indexOf(s) >= 0);

  return (
    <div className={styles.container}>
      <GlassCard title="Progresso das fases">
        <div className={styles.stepper}>
          {phases.map((phase, idx) => {
            const done = idx < currentPhaseIndex;
            const current = idx === currentPhaseIndex;
            const entry = (data.phaseHistory ?? []).filter(
              (e) => e.phase === phase.phase,
            )[0];
            const duration = current
              ? livePhase
              : entry
                ? formatDurationFromHours(entryDurationHours(entry, frozenTime))
                : "";
            return (
              <React.Fragment key={phase.key}>
                <div className={styles.step}>
                  <div
                    className={`${styles.circle} ${
                      done
                        ? styles.circleDone
                        : current
                          ? styles.circleCurrent
                          : styles.circlePending
                    }`}
                    style={
                      { "--phase-color": phase.color } as React.CSSProperties
                    }
                  >
                    {done ? <CheckmarkCircle20Filled /> : idx + 1}
                  </div>
                  <span className={styles.stepLabel}>{phase.label}</span>
                  {duration && (
                    <span
                      className={`${styles.stepDuration} ${current ? styles.stepDurationLive : ""}`}
                    >
                      {current && <span className={styles.liveDot} />}
                      {duration}
                    </span>
                  )}
                </div>
                {idx < phases.length - 1 && (
                  <div
                    className={`${styles.connector} ${done ? styles.connectorDone : ""}`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </GlassCard>

      <div className={styles.kpiRow}>
        <KPICard
          flat
          label="Tempo na fase atual"
          value={livePhase || "—"}
          subtitle={
            phaseStart ? `Desde ${formatDateTime(phaseStart)}` : undefined
          }
        />
        <KPICard
          flat
          label="Tempo total"
          value={liveTotal || "—"}
          subtitle={
            requestStart(data)
              ? `Desde ${formatDateTime(requestStart(data))}`
              : undefined
          }
        />
        <KPICard
          flat
          label="Sub-itens custeados"
          value={`${costedPct}%`}
          subtitle={`${costed} de ${costable.length}`}
          progress={costedPct / 100}
        />
        <KPICard
          flat
          label="Transições"
          value={String((data.statusHistory ?? []).length)}
          subtitle={`${(data.phaseHistory ?? []).length} de fase`}
        />
      </div>

      <div className={styles.statusSection}>
        <GlassCard title="Status atual">
          <div className={styles.current}>
            <span
              className={styles.currentBar}
              style={{
                background: colors.requestStatus(data.status).color,
              }}
            />
            <div className={styles.currentInfo}>
              <span className={styles.currentLabel}>
                {colors.requestStatus(data.status).label}
              </span>
              <span className={styles.currentPhase}>
                {colors.phase(data.phase, flow).label}
              </span>
              {liveStatus && (
                <span className={styles.live}>
                  <span className={styles.liveDot} />
                  {liveStatus}
                </span>
              )}
              {openStatus && (
                <span className={styles.currentMeta}>
                  Por <strong>{openStatus.actor}</strong> em{" "}
                  {formatDateTime(openStatus.start)}
                </span>
              )}
            </div>
          </div>
        </GlassCard>

        <GlassCard title="Alterar status">
          {allowed.length === 0 ? (
            <p className={styles.locked}>
              O FID está em um status terminal. Nenhuma transição disponível.
            </p>
          ) : (
            <div className={styles.statusPicker}>
              <div className={styles.groupLabel}>Próximos passos</div>
              <div className={styles.statusGrid}>
                {nextStatuses.map(renderStatusButton)}
              </div>
              {transversal.length > 0 && (
                <>
                  <div className={styles.groupLabel}>Ações transversais</div>
                  <div className={styles.statusGrid}>
                    {transversal.map(renderStatusButton)}
                  </div>
                </>
              )}
            </div>
          )}
        </GlassCard>
      </div>

      <GlassCard
        title="Sub-itens"
        subtitle="Cada linha da BOM segue o próprio roteiro, com o time responsável por etapa."
        noBodyPadding
      >
        <SubItemStatusList fid={fid} data={data} />
      </GlassCard>

      {(data.statusHistory ?? []).length > 0 && (
        <GlassCard title="Alterações recentes">
          <div className={styles.recent}>
            {(data.statusHistory ?? [])
              .slice(-5)
              .reverse()
              .map((entry) => (
                <div key={entry.id} className={styles.recentItem}>
                  <span
                    className={styles.recentDot}
                    style={{
                      background: colors.requestStatus(entry.status).color,
                    }}
                  />
                  <div className={styles.recentBody}>
                    <div className={styles.recentTitle}>
                      <StatusBadge kind="request" status={entry.status} />
                      <span className={styles.recentPhase}>
                        {colors.phase(entry.phase, flow).label}
                      </span>
                    </div>
                    <div className={styles.recentMeta}>
                      {entry.actor} · {formatDateTime(entry.start)}
                      {entry.durationHours !== undefined && (
                        <>
                          {" · "}
                          {formatDurationFromHours(entry.durationHours)}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </GlassCard>
      )}

      <Dialog
        open={!!target}
        onOpenChange={(_, d) => !d.open && setTarget(undefined)}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Confirmar mudança de status</DialogTitle>
            <DialogContent>
              <div className={styles.confirmRow}>
                <span className={styles.confirmFrom}>
                  {colors.requestStatus(data.status).label}
                </span>
                <span>→</span>
                <span className={styles.confirmTo}>
                  {target ? colors.requestStatus(target).label : ""}
                </span>
              </div>
              {target && (
                <p className={styles.confirmOwner}>
                  Responsável:{" "}
                  {REQUEST_STATUSES.filter((s) => s.key === target)[0]?.phase
                    ? `Fase ${REQUEST_STATUSES.filter((s) => s.key === target)[0]?.phase} · `
                    : ""}
                  {ownerLabel(target) || "qualquer time"}
                </p>
              )}
              <Textarea
                className={styles.confirmNote}
                placeholder="Observação (opcional) — aparece no Log e no Cronograma"
                value={note}
                resize="vertical"
                onChange={(_, d) => setNote(d.value)}
              />
            </DialogContent>
            <DialogActions>
              <Button
                appearance="secondary"
                onClick={() => setTarget(undefined)}
              >
                Cancelar
              </Button>
              <Button
                appearance="primary"
                onClick={confirm}
                disabled={updateStatus.isLoading}
              >
                Confirmar
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};

export default PhaseStatusTab;
