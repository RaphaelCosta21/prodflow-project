import * as React from "react";
import { IGanttRow } from "../../utils/planner";
import { formatDate } from "../../utils/formatters";
import styles from "./GanttChart.module.scss";

export interface IGanttChartProps {
  rows: IGanttRow[];
}

const DAY = 86400000;

function monthTicks(
  min: number,
  max: number,
): { left: number; label: string }[] {
  const ticks: { left: number; label: string }[] = [];
  const span = max - min || 1;
  const d = new Date(min);
  let cursor = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  if (cursor < min) {
    cursor = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  }
  while (cursor <= max) {
    const c = new Date(cursor);
    ticks.push({
      left: ((cursor - min) / span) * 100,
      label: c.toLocaleDateString("pt-BR", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }),
    });
    cursor = Date.UTC(c.getUTCFullYear(), c.getUTCMonth() + 1, 1);
  }
  return ticks;
}

// Lightweight Gantt built on the design tokens (no React 18-only chart lib).
export const GanttChart: React.FC<IGanttChartProps> = ({ rows }) => {
  const { min, max } = React.useMemo(() => {
    const starts = rows.map((r) => r.start);
    const ends = rows.map((r) => r.end);
    const lo = starts.length ? Math.min.apply(null, starts) : Date.now();
    const hi = ends.length ? Math.max.apply(null, ends) : Date.now() + 30 * DAY;
    const pad = Math.max(DAY, (hi - lo) * 0.04);
    return { min: lo - pad, max: hi + pad };
  }, [rows]);

  const span = max - min || 1;
  const ticks = monthTicks(min, max);
  const todayLeft = ((Date.now() - min) / span) * 100;

  return (
    <div className={styles.gantt}>
      <div className={styles.timeline}>
        <span className={styles.rowLabelSpacer} />
        <div className={styles.axis}>
          {ticks.map((t) => (
            <span
              key={t.label + t.left}
              className={styles.tick}
              style={{ left: `${t.left}%` }}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>

      {rows.map((r) => {
        const left = ((r.start - min) / span) * 100;
        const width = Math.max(0.8, ((r.end - r.start) / span) * 100);
        return (
          <div key={r.id} className={styles.row}>
            <div className={styles.rowLabel} title={r.sub}>
              <span className={styles.pn}>{r.label}</span>
              <span className={styles.sub}>{r.sub}</span>
            </div>
            <div className={styles.track}>
              {todayLeft >= 0 && todayLeft <= 100 && (
                <span
                  className={styles.today}
                  style={{ left: `${todayLeft}%` }}
                />
              )}
              <div
                className={styles.bar}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  background: r.color,
                }}
                title={`${formatDate(new Date(r.start).toISOString())} → ${formatDate(
                  new Date(r.end).toISOString(),
                )}`}
              >
                <span
                  className={styles.progress}
                  style={{ width: `${r.progress * 100}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GanttChart;
