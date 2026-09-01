import * as React from "react";
import { IHistoryEvent } from "../../models";
import { formatDateTime } from "../../utils/formatters";
import styles from "./HistoryTimeline.module.scss";

export interface IHistoryTimelineProps {
  events: IHistoryEvent[];
}

export const HistoryTimeline: React.FC<IHistoryTimelineProps> = ({
  events,
}) => {
  const sorted = React.useMemo(
    () => [...events].sort((a, b) => b.ts.localeCompare(a.ts)),
    [events],
  );

  if (sorted.length === 0) {
    return <div className={styles.empty}>Sem eventos ainda.</div>;
  }

  return (
    <ol className={styles.timeline}>
      {sorted.map((e, i) => (
        <li key={`${e.ts}-${i}`} className={styles.item}>
          <span className={styles.dot} />
          <div className={styles.body}>
            <div className={styles.msg}>{e.message}</div>
            <div className={styles.meta}>
              {e.by} · {formatDateTime(e.ts)}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
};

export default HistoryTimeline;
