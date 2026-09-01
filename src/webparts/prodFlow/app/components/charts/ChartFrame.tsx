import * as React from "react";
import EmptyState from "../common/EmptyState";
import styles from "./ChartFrame.module.scss";

export interface IChartFrameProps {
  height?: number;
  isEmpty?: boolean;
  emptyLabel?: string;
  children: React.ReactNode;
}

// Responsive box every Nivo chart lives in (Nivo's Responsive* needs a sized parent).
export const ChartFrame: React.FC<IChartFrameProps> = ({
  height = 260,
  isEmpty,
  emptyLabel = "Sem dados para exibir.",
  children,
}) => {
  if (isEmpty) {
    return (
      <div className={styles.frame} style={{ height }}>
        <EmptyState title="Sem dados" description={emptyLabel} />
      </div>
    );
  }
  return (
    <div className={styles.frame} style={{ height }}>
      {children}
    </div>
  );
};

export default ChartFrame;
