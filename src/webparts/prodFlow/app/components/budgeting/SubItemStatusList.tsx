import * as React from "react";
import {
  ChevronDown20Regular,
  ChevronRight20Regular,
} from "@fluentui/react-icons";
import { IFabricationRequest, ISubItem } from "../../models";
import { strategyKeyOf } from "../../config/strategyOptions";
import { PATHWAYS, pathwayStepOf } from "../../config/pathways";
import { workflowOf } from "../../config/workflows";
import { TEAMS } from "../../config/teams";
import { useStatusColors } from "../../hooks/useStatusColors";
import { entryDurationHours } from "../../utils/historyHelpers";
import { formatDurationFromHours } from "../../utils/durationHelpers";
import { formatDate, formatDateTime } from "../../utils/formatters";
import StatusBadge from "../common/StatusBadge";
import EmptyState from "../common/EmptyState";
import SubItemPathway from "./SubItemPathway";
import styles from "./SubItemStatusList.module.scss";

export interface ISubItemStatusListProps {
  fid: string;
  data: IFabricationRequest;
}

export const SubItemStatusList: React.FC<ISubItemStatusListProps> = ({
  data,
}) => {
  const colors = useStatusColors();
  const [openId, setOpenId] = React.useState<string | undefined>();

  if (data.subItems.length === 0) {
    return (
      <EmptyState
        title="Sem sub-itens"
        description="Importe a BOM na página Sub-itens & Estratégia."
      />
    );
  }

  return (
    <div className={styles.list}>
      {data.subItems.map((item: ISubItem) => {
        const key = strategyKeyOf(item.strategy, item.buyType, item.makeSite);
        const team = item.ownerTeam ? TEAMS[item.ownerTeam] : undefined;
        const indent = { paddingLeft: (item.level - 1) * 20 };
        const history = item.statusHistory ?? [];
        const expanded = openId === item.id;
        return (
          <React.Fragment key={item.id}>
            <div className={styles.row}>
              <div className={styles.identity} style={indent}>
                <button
                  type="button"
                  className={styles.historyToggle}
                  disabled={history.length === 0}
                  onClick={() => setOpenId(expanded ? undefined : item.id)}
                  aria-label={expanded ? "Ocultar histórico" : "Ver histórico"}
                >
                  {expanded ? (
                    <ChevronDown20Regular />
                  ) : (
                    <ChevronRight20Regular />
                  )}
                </button>
                <span className={styles.pn}>{item.pn}</span>
                <span className={styles.desc}>{item.descricao}</span>
              </div>
              <div className={styles.meta}>
                <StatusBadge kind="subitem" status={item.status} />
                {team && (
                  <span
                    className={styles.team}
                    style={
                      { "--team-color": team.color } as React.CSSProperties
                    }
                  >
                    {team.label}
                  </span>
                )}
                {item.startedAt && (
                  <span className={styles.started}>
                    Iniciado em {formatDate(item.startedAt)}
                  </span>
                )}
              </div>
              <div className={styles.pathwayCell}>
                {key && PATHWAYS[key] ? (
                  <SubItemPathway
                    strategyKey={key}
                    activeStep={key ? pathwayStepOf(key, item.status) : 0}
                  />
                ) : (
                  <span className={styles.noStrategy}>
                    Estratégia não definida
                  </span>
                )}
              </div>
            </div>
            {expanded && (
              <ol className={styles.history}>
                {history.map((h) => (
                  <li key={h.id} className={styles.historyEntry}>
                    <span className={styles.historyOrder}>{h.id}</span>
                    <span
                      className={styles.historyDot}
                      style={{
                        background: colors.subItemStatus(h.status).color,
                      }}
                    />
                    <span className={styles.historyLabel}>
                      {h.from
                        ? `${colors.subItemStatus(h.from).label} → ${colors.subItemStatus(h.status).label}`
                        : colors.subItemStatus(h.status).label}
                    </span>
                    <span className={styles.historyActor}>{h.actor}</span>
                    <span className={styles.historyTime}>
                      {formatDateTime(h.start)}
                    </span>
                    <span className={styles.historyDuration}>
                      {formatDurationFromHours(entryDurationHours(h))}
                    </span>
                    {h.note && (
                      <span className={styles.historyNote}>{h.note}</span>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </React.Fragment>
        );
      })}
      <div className={styles.legend}>
        {Object.keys(TEAMS).map((k) => {
          const team = TEAMS[k as keyof typeof TEAMS];
          return (
            <span key={k} className={styles.legendItem}>
              <span
                className={styles.legendDot}
                style={{ background: team.color }}
              />
              {team.label}
            </span>
          );
        })}
        <span className={styles.legendItem}>
          Fase atual:{" "}
          {colors.phase(data.phase, workflowOf(data.tipoOrcamento)).label}
        </span>
      </div>
    </div>
  );
};

export default SubItemStatusList;
