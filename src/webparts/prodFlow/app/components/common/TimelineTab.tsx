import * as React from "react";
import {
  Clock20Regular,
  Flowchart20Regular,
  CheckmarkCircle20Regular,
  ArrowSwap20Regular,
} from "@fluentui/react-icons";
import { IFabricationRequest, Phase } from "../../models";
import { phasesFor } from "../../config/phases";
import { workflowOf } from "../../config/workflows";
import { useStatusColors } from "../../hooks/useStatusColors";
import { useLiveElapsed } from "../../hooks/useLiveElapsed";
import { isTerminalStatus } from "../../utils/statusHelpers";
import { entryDurationHours } from "../../utils/historyHelpers";
import {
  formatDurationFromHours,
  formatLiveElapsed,
} from "../../utils/durationHelpers";
import { formatDate, formatDateTime } from "../../utils/formatters";
import GlassCard from "./GlassCard";
import StatusBadge from "./StatusBadge";
import EmptyState from "./EmptyState";
import styles from "./TimelineTab.module.scss";

export interface ITimelineTabProps {
  data: IFabricationRequest;
}

export const TimelineTab: React.FC<ITimelineTabProps> = ({ data }) => {
  const colors = useStatusColors();
  const flow = workflowOf(data.tipoOrcamento);
  const phases = phasesFor(flow);
  const frozen = isTerminalStatus(data.status);
  const frozenTime = frozen
    ? new Date(
        data.dates.dataAprovacaoPetrobras ??
          data.dates.dataEnvioPetrobras ??
          "",
      ).getTime() || undefined
    : undefined;

  const phaseHistory = data.phaseHistory ?? [];
  const statusHistory = data.statusHistory ?? [];
  const openPhase = phaseHistory.filter((e) => !e.end).pop();
  const openStatus = statusHistory.filter((e) => !e.end).pop();

  const livePhase = useLiveElapsed(
    !frozen && openPhase ? openPhase.start : undefined,
  );
  const liveStatus = useLiveElapsed(
    !frozen && openStatus ? openStatus.start : undefined,
  );

  const start = data.dates.recebimentoDemanda;
  const totalElapsed = start
    ? formatLiveElapsed((frozenTime ?? Date.now()) - new Date(start).getTime())
    : "—";

  const statusesByPhase = React.useMemo(() => {
    const map = new Map<Phase, typeof statusHistory>();
    for (const s of statusHistory) {
      map.set(s.phase, (map.get(s.phase) ?? []).concat(s));
    }
    return map;
  }, [statusHistory]);

  const currentPhaseIndex = phases.findIndex((p) => p.phase === data.phase);

  const milestones = [
    { label: "Recebimento da demanda", value: data.dates.recebimentoDemanda },
    {
      label: "Solicitação de orçamento",
      value: data.dates.solicitacaoOrcamento,
    },
    {
      label: "Prazo p/ envio do Orçamento",
      value: data.dates.prazoEnvioPetrobras,
    },
    { label: "Retorno do orçamento", value: data.dates.retornoOrcamento },
    { label: "Envio à Petrobras", value: data.dates.dataEnvioPetrobras },
    { label: "Aprovação Petrobras", value: data.dates.dataAprovacaoPetrobras },
  ];

  return (
    <div className={styles.wrap}>
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryIcon}>
            <Clock20Regular />
          </span>
          <div className={styles.summaryBody}>
            <span className={styles.summaryLabel}>Tempo total</span>
            <span className={styles.summaryValue}>{totalElapsed}</span>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryIcon}>
            <Flowchart20Regular />
          </span>
          <div className={styles.summaryBody}>
            <span className={styles.summaryLabel}>Fase atual</span>
            <span className={styles.summaryValue}>
              {colors.phase(data.phase, flow).label}
            </span>
            {livePhase && (
              <span className={styles.live}>
                <span className={styles.liveDot} />
                {livePhase}
              </span>
            )}
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryIcon}>
            <CheckmarkCircle20Regular />
          </span>
          <div className={styles.summaryBody}>
            <span className={styles.summaryLabel}>Status atual</span>
            <StatusBadge kind="request" status={data.status} />
            {liveStatus && (
              <span className={styles.live}>
                <span className={styles.liveDot} />
                {liveStatus}
              </span>
            )}
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryIcon}>
            <ArrowSwap20Regular />
          </span>
          <div className={styles.summaryBody}>
            <span className={styles.summaryLabel}>Transições</span>
            <span className={styles.summaryValue}>
              {statusHistory.length} status · {phaseHistory.length} fase
            </span>
          </div>
        </div>
      </div>

      <GlassCard title="Marcos do FID">
        <div className={styles.milestones}>
          {milestones.map((m) => (
            <div key={m.label} className={styles.milestone}>
              <span className={styles.milestoneLabel}>{m.label}</span>
              <span className={styles.milestoneValue}>
                {formatDate(m.value)}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard title="Fluxo detalhado">
        {phaseHistory.length === 0 && statusHistory.length === 0 ? (
          <EmptyState
            title="Sem histórico ainda"
            description="Altere o status na página Fases & Status para começar o rastreio."
          />
        ) : (
          <div className={styles.flow}>
            {phases.map((phase, idx) => {
              const entry = phaseHistory.filter(
                (e) => e.phase === phase.phase,
              )[0];
              const future = idx > currentPhaseIndex;
              if (!entry && future) return null;
              const done = idx < currentPhaseIndex;
              const statuses = statusesByPhase.get(phase.phase) ?? [];
              const duration = entry
                ? formatDurationFromHours(entryDurationHours(entry, frozenTime))
                : "";
              return (
                <div
                  key={phase.key}
                  className={`${styles.phaseBlock} ${future ? styles.phaseFuture : ""}`}
                >
                  <div className={styles.phaseHeader}>
                    <span
                      className={styles.phaseMarker}
                      style={{
                        background:
                          done || idx === currentPhaseIndex
                            ? phase.color
                            : "var(--border-subtle)",
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div className={styles.phaseInfo}>
                      <span className={styles.phaseTitle}>{phase.label}</span>
                      <span className={styles.phaseMeta}>
                        {entry ? formatDateTime(entry.start) : "—"}
                        {entry?.end && ` → ${formatDateTime(entry.end)}`}
                        {entry?.actor && ` · ${entry.actor}`}
                      </span>
                    </div>
                    {duration && (
                      <span className={styles.phaseDuration}>{duration}</span>
                    )}
                  </div>

                  {statuses.length > 0 && (
                    <div className={styles.statusList}>
                      {statuses.map((s) => (
                        <div key={s.id} className={styles.statusItem}>
                          <span
                            className={styles.statusDot}
                            style={{
                              background: colors.requestStatus(s.status).color,
                            }}
                          />
                          <div className={styles.statusBody}>
                            <div className={styles.statusTitle}>
                              <StatusBadge kind="request" status={s.status} />
                              <span className={styles.statusDuration}>
                                {formatDurationFromHours(
                                  entryDurationHours(s, frozenTime),
                                )}
                              </span>
                            </div>
                            <span className={styles.statusMeta}>
                              {s.from &&
                                `${colors.requestStatus(s.from).label} → `}
                              {s.actor} · {formatDateTime(s.start)}
                              {s.end && ` → ${formatDateTime(s.end)}`}
                              {s.note && ` · ${s.note}`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default TimelineTab;
