import * as React from "react";
import { useFidsFull } from "../api/fids";
import { buildWeeklyLoad } from "../utils/planner";
import { leavesOf } from "../utils/kpis";
import GlassCard from "../components/common/GlassCard";
import KPICard from "../components/common/KPICard";
import SkeletonLoader from "../components/common/SkeletonLoader";
import EmptyState from "../components/common/EmptyState";
import HeatmapChart from "../components/charts/HeatmapChart";
import { useChartTheme } from "../hooks/useChartTheme";
import styles from "./PlannerPage.module.scss";

export const PlannerPage: React.FC = () => {
  const { data, isLoading } = useFidsFull();
  const chart = useChartTheme();
  const requests = React.useMemo(() => data ?? [], [data]);

  const load = React.useMemo(() => buildWeeklyLoad(requests), [requests]);

  const totals = React.useMemo(() => {
    let scheduled = 0;
    let unscheduled = 0;
    let hh = 0;
    for (const r of requests) {
      for (const s of leavesOf(r.subItems)) {
        if (s.dataInicioFab && s.dataFimFab) scheduled++;
        else unscheduled++;
        hh += s.delineation?.hh ?? 0;
      }
    }
    return { scheduled, unscheduled, hh };
  }, [requests]);

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
        <h1 className={styles.title}>Planner</h1>
        <span className={styles.phase}>Carga × capacidade</span>
      </div>

      <div className={styles.kpiGrid}>
        <KPICard
          label="Sub-itens programados"
          value={String(totals.scheduled)}
          subtitle="Com data de início e fim"
          accentColor={chart.accents[0]}
        />
        <KPICard
          label="Sem programação"
          value={String(totals.unscheduled)}
          subtitle="Aguardando datas"
          accentColor={chart.warning}
        />
        <KPICard
          label="HH delineado"
          value={String(totals.hh)}
          subtitle="Soma dos delineamentos"
          accentColor={chart.info}
        />
      </div>

      <GlassCard
        title="Carga semanal por linha de execução"
        subtitle="Sub-itens em fabricação em cada semana"
      >
        {load.length === 0 ? (
          <EmptyState
            title="Nada programado"
            description="Informe as datas de início/fim na aba Produção dos FIDs."
          />
        ) : (
          <HeatmapChart data={load} axisTopLegend="Semana (início)" />
        )}
      </GlassCard>
    </div>
  );
};

export default PlannerPage;
