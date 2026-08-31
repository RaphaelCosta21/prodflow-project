import * as React from "react";
import { StrategyKey } from "../../config/strategyOptions";
import { PATHWAYS } from "../../config/pathways";
import { TEAMS } from "../../config/teams";
import styles from "./SubItemPathway.module.scss";

// Horizontal routing for a sub-item (§7.4): connected steps, each with its responsible team badge.
export const SubItemPathway: React.FC<{ strategyKey: StrategyKey }> = ({
  strategyKey,
}) => {
  const steps = PATHWAYS[strategyKey];
  if (!steps) return null;
  return (
    <div className={styles.pathway}>
      {steps.map((step, index) => {
        const team = TEAMS[step.team];
        const style = { "--step-color": team.color } as React.CSSProperties;
        return (
          <React.Fragment key={`${step.label}-${index}`}>
            {index > 0 && <span className={styles.arrow}>›</span>}
            <span className={styles.step} style={style}>
              <span className={styles.stepLabel}>{step.label}</span>
              <span className={styles.stepTeam}>{team.label}</span>
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default SubItemPathway;
