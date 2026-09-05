import * as React from "react";
import { IFabricationRequest, ISubItem, SubItemStatus } from "../../models";
import { strategyKeyOf } from "../../config/strategyOptions";
import { PATHWAYS } from "../../config/pathways";
import { TEAMS } from "../../config/teams";
import { useStatusColors } from "../../hooks/useStatusColors";
import { formatDate } from "../../utils/formatters";
import StatusBadge from "../common/StatusBadge";
import EmptyState from "../common/EmptyState";
import SubItemPathway from "./SubItemPathway";
import styles from "./SubItemStatusList.module.scss";

export interface ISubItemStatusListProps {
  fid: string;
  data: IFabricationRequest;
}

// Maps a sub-item status onto its position in the routing pathway.
const STEP_BY_STATUS: Partial<Record<SubItemStatus, number>> = {
  NotStarted: 0,
  Strategy: 0,
  WaitingDelineation: 1,
  WaitingQuotation: 1,
  Costed: 1,
  WaitingRelease: 2,
  InProcurement: 2,
  InFabrication: 3,
  Subcontracted: 3,
  WaitingMaterial: 3,
  InInspection: 4,
  ReadyInStock: 5,
  InAssembly: 5,
  Completed: 5,
};

export const SubItemStatusList: React.FC<ISubItemStatusListProps> = ({
  data,
}) => {
  const colors = useStatusColors();

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
        return (
          <div key={item.id} className={styles.row}>
            <div className={styles.identity} style={indent}>
              <span className={styles.pn}>{item.pn}</span>
              <span className={styles.desc}>{item.descricao}</span>
            </div>
            <div className={styles.meta}>
              <StatusBadge kind="subitem" status={item.status} />
              {team && (
                <span
                  className={styles.team}
                  style={{ "--team-color": team.color } as React.CSSProperties}
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
                  activeStep={STEP_BY_STATUS[item.status] ?? 0}
                />
              ) : (
                <span className={styles.noStrategy}>
                  Estratégia não definida
                </span>
              )}
            </div>
          </div>
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
          Fase atual: {colors.phase(data.phase).label}
        </span>
      </div>
    </div>
  );
};

export default SubItemStatusList;
