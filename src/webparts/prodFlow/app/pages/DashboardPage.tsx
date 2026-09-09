import * as React from "react";
import { useNavigate } from "react-router-dom";
import { IFabricationRequest, RequestStatus } from "../models";
import { workflowOf } from "../config/workflows";
import { IKpiDef, KPI_DEFINITIONS } from "../config/kpiDefinitions";
import { useConfigStore } from "../stores/useConfigStore";
import { useFidsFull } from "../api/fids";
import { useChartTheme } from "../hooks/useChartTheme";
import {
  budgetSlaRatio,
  fabricationSlaRatio,
  financialTotals,
  isBudgetOverdue,
  makeBuyMix,
  startedByAttendance,
} from "../utils/kpis";
import { formatCurrencyBRL, formatPercentage } from "../utils/formatters";
import { fidDetailPath } from "../config/routes";
import GlassCard from "../components/common/GlassCard";
import KPICard from "../components/common/KPICard";
import SkeletonLoader from "../components/common/SkeletonLoader";
import EmptyState from "../components/common/EmptyState";
import StatusBadge from "../components/common/StatusBadge";
import DonutChart from "../components/charts/DonutChart";
import BarChart from "../components/charts/BarChart";
import FunnelChart from "../components/charts/FunnelChart";
import styles from "./DashboardPage.module.scss";

// Funnel across both workflows: the release/execution stages merge the two tracks.
const PIPELINE: { statuses: RequestStatus[]; label: string }[] = [
  { statuses: ["InDelineation"], label: "Em delineamento" },
  { statuses: ["Submitted"], label: "Enviado" },
  { statuses: ["Approved"], label: "Aprovado" },
  {
    statuses: ["ReleasedForFabrication", "ReleasedForProcurement"],
    label: "Liberado",
  },
  {
    statuses: ["InFabrication", "InProcurement", "ExternalService"],
    label: "Em execução",
  },
  { statuses: ["Delivered"], label: "Entregue" },
];

export const DashboardPage: React.FC = () => {
  const { data, isLoading, isError } = useFidsFull();
  const chart = useChartTheme();
  const config = useConfigStore((s) => s.config);
  const navigate = useNavigate();
  const requests: IFabricationRequest[] = React.useMemo(
    () => data ?? [],
    [data],
  );

  const kpis = React.useMemo(
    () => ({
      budget: budgetSlaRatio(requests),
      fab: fabricationSlaRatio(requests),
      started: startedByAttendance(requests),
      totals: financialTotals(requests),
      overdue: requests.filter(isBudgetOverdue),
    }),
    [requests],
  );

  const mix = React.useMemo(() => {
    const m = makeBuyMix(requests);
    return [
      {
        id: "buyRaw",
        label: "Buy · MP",
        value: m.buyRaw,
        color: chart.categorical[0],
      },
      {
        id: "buyCommercial",
        label: "Buy · COTS",
        value: m.buyCommercial,
        color: chart.categorical[1],
      },
      {
        id: "makeInHouse",
        label: "Make · In-House",
        value: m.makeInHouse,
        color: chart.categorical[3],
      },
      {
        id: "makeSubcon",
        label: "Make · SUBCON",
        value: m.makeSubcon,
        color: chart.categorical[5],
      },
    ];
  }, [requests, chart.categorical]);

  const costRevenue = React.useMemo(
    () =>
      requests
        .filter((r) => r.financials.orcamentoOceaneering > 0)
        .slice(0, 12)
        .map((r) => ({
          fid: r.fid,
          Custo: r.financials.custoTotal,
          Receita: r.financials.receita,
        })),
    [requests],
  );

  const pipeline = React.useMemo(
    () =>
      PIPELINE.map((p) => ({
        id: p.statuses[0],
        label: p.label,
        value: requests.filter((r) => p.statuses.indexOf(r.status) >= 0).length,
      })),
    [requests],
  );

  if (isLoading) {
    return (
      <div className={styles.page}>
        <SkeletonLoader rows={10} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.page}>
        <EmptyState
          title="Não foi possível carregar os FIDs"
          description="Verifique se as listas do SharePoint foram provisionadas em Admin › Configuration."
        />
      </div>
    );
  }

  const phase1 = requests.filter((r) => r.phase === 1).length;
  const phase2 = requests.filter((r) => r.phase === 2).length;
  const partsCount = requests.filter(
    (r) => workflowOf(r.tipoOrcamento) === "parts",
  ).length;

  const kpiTarget = (key: string): { value: number; def: IKpiDef } => {
    const def = KPI_DEFINITIONS.filter((k) => k.key === key)[0];
    return {
      value: config?.kpiTargets?.[key] ?? def.defaultTarget,
      def,
    };
  };

  const targetSubtitle = (key: string, detail: string): string => {
    const { value, def } = kpiTarget(key);
    return `${detail} · meta ${def.unit === "BRL" ? formatCurrencyBRL(value) : `${value}${def.unit === "%" ? "%" : ` ${def.unit}`}`}`;
  };

  const targetAccent = (key: string, actual: number): string => {
    const { value, def } = kpiTarget(key);
    const met = def.lowerIsBetter ? actual <= value : actual >= value;
    return met ? chart.success : chart.danger;
  };

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Dashboard</h1>
        <span className={styles.welcome}>
          {requests.length} FIDs · {phase1} em orçamentação · {phase2} em
          execução · {partsCount} de partes e peças
        </span>
      </div>

      <div className={styles.kpiGrid}>
        <KPICard
          label="Prazo de orçamentos"
          value={formatPercentage(kpis.budget.ratio)}
          subtitle={targetSubtitle(
            "budgetSla",
            `${kpis.budget.onTime}/${kpis.budget.total} no prazo`,
          )}
          progress={kpis.budget.ratio}
          accentColor={targetAccent("budgetSla", kpis.budget.ratio * 100)}
        />
        <KPICard
          label="Prazo de fabricação"
          value={formatPercentage(kpis.fab.ratio)}
          subtitle={targetSubtitle(
            "fabricationDeadline",
            `${kpis.fab.onTime}/${kpis.fab.total} no prazo`,
          )}
          progress={kpis.fab.ratio}
          accentColor={targetAccent(
            "fabricationDeadline",
            kpis.fab.ratio * 100,
          )}
        />
        <KPICard
          label="Início interno × externo"
          value={`${kpis.started.interna} / ${kpis.started.externa}`}
          subtitle="Workshop / Usinando"
          accentColor={chart.info}
        />
        <KPICard
          label="Receita total"
          value={formatCurrencyBRL(kpis.totals.receita)}
          subtitle={`Custo ${formatCurrencyBRL(kpis.totals.custoTotal)}`}
          accentColor={chart.accents[1]}
        />
        <KPICard
          label="Exposição de multa (30%)"
          value={formatCurrencyBRL(kpis.totals.multaExposicao30)}
          subtitle={targetSubtitle(
            "penaltyExposure",
            `${kpis.overdue.length} FIDs em atraso`,
          )}
          accentColor={targetAccent(
            "penaltyExposure",
            kpis.totals.multaExposicao30,
          )}
        />
      </div>

      <div className={styles.chartGrid}>
        <GlassCard
          title="Mix make/buy"
          subtitle="Estratégia definida por sub-item (folhas da BOM)"
        >
          <DonutChart data={mix} centerLabel="sub-itens" />
        </GlassCard>

        <GlassCard title="Pipeline de FIDs" subtitle="Status da Fase 1 → 2">
          <FunnelChart data={pipeline} />
        </GlassCard>
      </div>

      <GlassCard
        title="Custo × Receita por FID"
        subtitle="Orçamento Oceaneering menos custo total"
      >
        <BarChart
          data={costRevenue}
          keys={["Custo", "Receita"]}
          indexBy="fid"
          colors={[chart.danger, chart.success]}
          axisLeftLegend="R$"
          valueFormat={formatCurrencyBRL}
        />
      </GlassCard>

      <GlassCard
        title="Alertas — FIDs em atraso"
        subtitle="Prazo de envio à Petrobras estourado"
      >
        {kpis.overdue.length === 0 ? (
          <EmptyState
            title="Nenhum atraso"
            description="Todos os orçamentos estão dentro do prazo."
          />
        ) : (
          <ul className={styles.alertList}>
            {kpis.overdue.map((r) => (
              <li key={r.fid}>
                <button
                  type="button"
                  className={styles.alertRow}
                  onClick={() => navigate(fidDetailPath(r.fid))}
                >
                  <span className={styles.alertFid}>{r.fid}</span>
                  <span className={styles.alertDesc}>{r.descricao}</span>
                  <StatusBadge kind="request" status={r.status} />
                  <span className={styles.alertValue}>
                    {formatCurrencyBRL(r.financials.multaExposicao30)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
};

export default DashboardPage;
