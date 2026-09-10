import * as React from "react";
import { Tooltip } from "@fluentui/react-components";
import { LockClosed12Regular } from "@fluentui/react-icons";
import { Phase } from "../../models";
import { StrategyKey } from "../../config/strategyOptions";
import { PATHWAYS, fabricationStartIndex } from "../../config/pathways";
import { TEAMS } from "../../config/teams";
import styles from "./SubItemPathway.module.scss";

const TABS: { phase: Phase; label: string }[] = [
  { phase: 1, label: "Orçamentação" },
  { phase: 2, label: "Fabricação" },
];

export const PathwayPhaseToggle: React.FC<{
  value: Phase;
  onChange: (phase: Phase) => void;
  /** Fase 2 só destrava quando o FID entra em fabricação. */
  fabricationUnlocked: boolean;
  className?: string;
}> = ({ value, onChange, fabricationUnlocked, className }) => (
  <div className={`${styles.tabs} ${className ?? ""}`} role="tablist">
    {TABS.map(({ phase, label }) => {
      const locked = phase === 2 && !fabricationUnlocked;
      const button = (
        <button
          key={phase}
          type="button"
          role="tab"
          aria-selected={value === phase}
          className={`${styles.tab} ${value === phase ? styles.tabActive : ""}`}
          disabled={locked}
          onClick={() => onChange(phase)}
        >
          {label}
          {locked && <LockClosed12Regular />}
        </button>
      );
      return locked ? (
        <Tooltip
          key={phase}
          content="Inicia quando o FID entra na fase de fabricação."
          relationship="label"
        >
          <span className={styles.tabLockWrap}>{button}</span>
        </Tooltip>
      ) : (
        button
      );
    })}
  </div>
);

// Horizontal routing for a sub-item (§7.4), split into the two phases as switchable tabs.
export const SubItemPathway: React.FC<{
  strategyKey: StrategyKey;
  /** Index of the step in progress — earlier steps render as completed. */
  activeStep?: number;
  /** Current FID phase: the fabrication tab only unlocks in phase 2. */
  phase?: Phase;
  /** Fase escolhida no seletor global — o item pode alternar por conta própria depois. */
  view?: Phase;
}> = ({ strategyKey, activeStep, phase = 1, view }) => {
  const steps = PATHWAYS[strategyKey];
  const fabricationUnlocked = phase >= 2;
  const [tab, setTab] = React.useState<Phase>(
    view ?? (fabricationUnlocked ? 2 : 1),
  );

  React.useEffect(() => {
    setTab(view ?? (fabricationUnlocked ? 2 : 1));
  }, [view, fabricationUnlocked]);

  if (!steps || steps.length === 0) return null;
  const hasFabrication = fabricationStartIndex(strategyKey) < steps.length;
  const visible = steps
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => step.phase === tab);

  return (
    <div className={styles.wrapper}>
      {hasFabrication && (
        <PathwayPhaseToggle
          value={tab}
          onChange={setTab}
          fabricationUnlocked={fabricationUnlocked}
        />
      )}
      <div className={styles.pathway}>
        {visible.map(({ step, index }, position) => {
          const team = TEAMS[step.team];
          const style = { "--step-color": team.color } as React.CSSProperties;
          const state =
            activeStep === undefined
              ? ""
              : index < activeStep
                ? styles.stepDone
                : index === activeStep
                  ? styles.stepCurrent
                  : styles.stepPending;
          return (
            <React.Fragment key={`${step.label}-${index}`}>
              {position > 0 && <span className={styles.arrow}>›</span>}
              <span className={`${styles.step} ${state}`} style={style}>
                <span className={styles.stepLabel}>{step.label}</span>
                <span className={styles.stepTeam}>{team.label}</span>
              </span>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default SubItemPathway;
