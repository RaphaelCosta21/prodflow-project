import * as React from "react";
import { Tooltip } from "@fluentui/react-components";
import {
  ChevronDown20Regular,
  ChevronRight20Regular,
} from "@fluentui/react-icons";
import { IFabricationRequest, ISubItem, Phase } from "../../models";
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
import SubItemPathway, { PathwayPhaseToggle } from "./SubItemPathway";
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
  const [phaseView, setPhaseView] = React.useState<Phase>(data.phase);

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
      <div className={styles.toolbar}>
        <span className={styles.toolbarLabel}>Roteiro exibido</span>
        <PathwayPhaseToggle
          value={phaseView}
          onChange={setPhaseView}
          fabricationUnlocked={data.phase >= 2}
        />
      </div>
      {data.subItems.map((item: ISubItem) => {
        const key = strategyKeyOf(item.strategy, item.buyType, item.makeSite);
        const team = item.ownerTeam ? TEAMS[item.ownerTeam] : undefined;
        const indent = { paddingLeft: (item.level - 1) * 20 };
        const history = item.statusHistory ?? [];
        const expanded = openId === item.id;
        const isParentLine = item.strategy === "NA";
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
                {isParentLine ? (
                  <Tooltip
                    content="Fluxo determinado pelos sub-itens."
                    relationship="label"
                  >
                    <span className={styles.naBadge}>N/A</span>
                  </Tooltip>
                ) : (
                  <StatusBadge kind="subitem" status={item.status} />
                )}
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
                {isParentLine ? (
                  <span className={styles.parentLine}>
                    Linha pai — o roteiro acontece nos sub-itens abaixo.
                  </span>
                ) : key && PATHWAYS[key] ? (
                  <SubItemPathway
                    strategyKey={key}
                    activeStep={key ? pathwayStepOf(key, item.status) : 0}
                    phase={data.phase}
                    view={phaseView}
                  />
                ) : (
                  <span className={styles.noStrategy}>
                    Estratégia não definida
                  </span>
                )}
              </div>
            </div>
            {expanded && (
              <div className={styles.historyPanel}>
                <div className={styles.historyTitle}>
                  Histórico de status — {item.pn}
                </div>
                <ol className={styles.history}>
                  {history.map((h) => (
                    <li key={h.id} className={styles.historyEntry}>
                      <span
                        className={styles.historyDot}
                        style={{
                          background: colors.subItemStatus(h.status).color,
                        }}
                      />
                      <div className={styles.historyMain}>
                        <span className={styles.historyLabel}>
                          {h.from && (
                            <>
                              <span className={styles.historyFrom}>
                                {colors.subItemStatus(h.from).label}
                              </span>
                              <span className={styles.historyArrow}>→</span>
                            </>
                          )}
                          {colors.subItemStatus(h.status).label}
                        </span>
                        {h.note && (
                          <span className={styles.historyNote}>{h.note}</span>
                        )}
                      </div>
                      <span className={styles.historyActor}>{h.actor}</span>
                      <span className={styles.historyTime}>
                        {formatDateTime(h.start)}
                      </span>
                      <span className={styles.historyDuration}>
                        {formatDurationFromHours(entryDurationHours(h))}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
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
