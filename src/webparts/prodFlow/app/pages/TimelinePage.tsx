import * as React from "react";
import { useFidsFull } from "../api/fids";
import { buildGanttRows } from "../utils/planner";
import { useStatusColors } from "../hooks/useStatusColors";
import GlassCard from "../components/common/GlassCard";
import SkeletonLoader from "../components/common/SkeletonLoader";
import EmptyState from "../components/common/EmptyState";
import GanttChart from "../components/charts/GanttChart";
import styles from "./TimelinePage.module.scss";

export const TimelinePage: React.FC = () => {
  const { data, isLoading } = useFidsFull();
  const colors = useStatusColors();
  const requests = React.useMemo(() => data ?? [], [data]);

  const rows = React.useMemo(
    () => buildGanttRows(requests, (s) => colors.subItemStatus(s.status).color),
    [requests, colors],
  );

  if (isLoading) {
    return (
      <div className={styles.page}>
        <SkeletonLoader rows={8} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Timeline</h1>
        <span className={styles.phase}>Master Schedule</span>
      </div>

      <GlassCard
        title="Cronograma de fabricação"
        subtitle="Barras por sub-item · preenchimento = checklist concluído · linha vermelha = hoje"
      >
        {rows.length === 0 ? (
          <EmptyState
            title="Sem cronograma"
            description="Informe datas de início e fim na aba Produção dos FIDs."
          />
        ) : (
          <GanttChart rows={rows} />
        )}
      </GlassCard>
    </div>
  );
};

export default TimelinePage;
