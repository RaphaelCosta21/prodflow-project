import * as React from "react";
import GlassCard from "../components/common/GlassCard";
import { useSpfxContext } from "../config/SpfxContext";
import { useFids } from "../api/fids";
import styles from "./DashboardPage.module.scss";

export const DashboardPage: React.FC = () => {
  const context = useSpfxContext();
  const user = context.pageContext.user.displayName;
  const { data } = useFids();
  const total = data?.length ?? 0;
  const phase1 = data ? data.filter((r) => r.phase === 1).length : 0;
  const phase2 = data ? data.filter((r) => r.phase === 2).length : 0;

  const kpis = [
    {
      label: "FIDs ativos",
      value: String(total),
      hint: `${phase1} Fase 1 · ${phase2} Fase 2`,
    },
    { label: "Orçamentos no prazo (SLA)", value: "—", hint: "Meta interna" },
    { label: "Custo × Receita", value: "—", hint: "Margem total" },
    {
      label: "Exposição de multa",
      value: "—",
      hint: "30% dos itens em atraso",
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Dashboard</h1>
        <span className={styles.welcome}>Bem-vindo, {user}</span>
      </div>

      <div className={styles.kpiGrid}>
        {kpis.map((kpi) => (
          <GlassCard key={kpi.label}>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>{kpi.label}</span>
              <span className={styles.kpiValue}>{kpi.value}</span>
              <span className={styles.kpiHint}>{kpi.hint}</span>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard
        title="Visão geral"
        subtitle="KPIs e gráficos (Nivo) chegam na Fase 5"
      >
        <p className={styles.note}>
          App shell ativo — sidebar colapsável, tema claro/escuro e navegação
          prontos. Os dados reais entram via services + TanStack Query nas
          próximas fases (Domínio &amp; Camada de Dados).
        </p>
      </GlassCard>
    </div>
  );
};

export default DashboardPage;
