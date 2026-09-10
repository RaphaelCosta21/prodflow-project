import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@fluentui/react-components";
import {
  ArrowLeft20Regular,
  Clock16Regular,
  Warning16Filled,
} from "@fluentui/react-icons";
import { IFabricationRequest, ISubItem } from "../models";
import { useFid } from "../api/fids";
import { fidNavGroupsFor, FidTabKey } from "../config/fidDetailNav";
import {
  isInternalMake,
  isQuotedRoute,
  isSubItemCosted,
  workflowOf,
} from "../config/workflows";
import GlassCard from "../components/common/GlassCard";
import SkeletonLoader from "../components/common/SkeletonLoader";
import EmptyState from "../components/common/EmptyState";
import StatusBadge from "../components/common/StatusBadge";
import PhaseBadge from "../components/common/PhaseBadge";
import DetailSideNav from "../components/layout/DetailSideNav";
import SubItemStrategyTab from "../components/budgeting/SubItemStrategyTab";
import ClassificationCard from "../components/budgeting/ClassificationCard";
import DelineationTab from "../components/budgeting/DelineationTab";
import QuotationsTab from "../components/budgeting/QuotationsTab";
import BudgetReportsTab from "../components/budgeting/BudgetReportsTab";
import PhaseStatusTab from "../components/budgeting/PhaseStatusTab";
import ApprovalTab from "../components/budgeting/ApprovalTab";
import ProductionTab from "../components/production/ProductionTab";
import QualityTab from "../components/quality/QualityTab";
import DocumentsTab from "../components/common/DocumentsTab";
import TimelineTab from "../components/common/TimelineTab";
import ActivityLogTab from "../components/common/ActivityLogTab";
import NotesCommentsTab from "../components/common/NotesCommentsTab";
import NoticeBar from "../components/common/NoticeBar";
import { useUIStore } from "../stores/useUIStore";
import { budgetDeadlineInfo } from "../utils/kpis";
import { pendingDefinitionLabels } from "../utils/classification";
import { formatCurrencyBRL, formatDate } from "../utils/formatters";
import styles from "./FidDetailPage.module.scss";

const InfoRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div className={styles.infoRow}>
    <span className={styles.infoLabel}>{label}</span>
    <span className={styles.infoValue}>{value}</span>
  </div>
);

const CHIP_TONE_CLASS = {
  ok: styles.chipOk,
  due: styles.chipDue,
  overdue: styles.chipOverdue,
};

// Só aparece enquanto a fase de orçamentação está aberta (ver `budgetDeadlineInfo`).
const DeadlineChip: React.FC<{ data: IFabricationRequest }> = ({ data }) => {
  const info = React.useMemo(() => budgetDeadlineInfo(data), [data]);
  if (!info) return null;
  return (
    <span
      className={`${styles.deadlineChip} ${CHIP_TONE_CLASS[info.tone]}`}
      title={`Prazo p/ envio do orçamento: ${formatDate(info.deadlineISO)} — ${info.label}`}
    >
      {info.tone === "overdue" ? <Warning16Filled /> : <Clock16Regular />}
      {info.label}
    </span>
  );
};

// Aviso no cabeçalho enquanto complexidade/atendimento seguirem como "A definir".
const PendingDefinitionChip: React.FC<{ data: IFabricationRequest }> = ({
  data,
}) => {
  const pending = React.useMemo(() => pendingDefinitionLabels(data), [data]);
  if (pending.length === 0) return null;
  return (
    <span
      className={`${styles.deadlineChip} ${styles.chipDue}`}
      title={`Ainda a definir: ${pending.join(" · ")}`}
    >
      <Warning16Filled />
      {pending.length === 1
        ? "1 definição pendente"
        : `${pending.length} definições pendentes`}
    </span>
  );
};

const OverviewTab: React.FC<{ fid: string; data: IFabricationRequest }> = ({
  fid,
  data,
}) => {
  const pending = pendingDefinitionLabels(data);
  return (
    <div className={styles.stack}>
      {pending.length > 0 && (
        <NoticeBar tone="warning" title="Classificação pendente">
          {pending.join(" · ")} ainda está(ão) como “A definir”. Defina abaixo
          para liberar o cálculo do prazo de envio do orçamento.
        </NoticeBar>
      )}
      <div className={styles.overviewGrid}>
        <GlassCard title="Identificação">
          <InfoRow label="OS" value={data.osNumber} />
          <InfoRow label="Projeto" value={data.projeto} />
          <InfoRow
            label="Desenho"
            value={`${data.drawing.code} ${data.drawing.revision}`.trim()}
          />
          <InfoRow label="Part Number OII" value={data.partNumberOii ?? "—"} />
          <InfoRow label="Tipo de Orçamento" value={data.tipoOrcamento} />
          <InfoRow label="Descrição" value={data.descricao} />
        </GlassCard>
        <ClassificationCard fid={fid} data={data} />
        <GlassCard title="Financeiro">
          <InfoRow
            label="Custo total"
            value={formatCurrencyBRL(data.financials.custoTotal)}
          />
          <InfoRow
            label="Orçamento Oceaneering"
            value={formatCurrencyBRL(data.financials.orcamentoOceaneering)}
          />
          <InfoRow
            label="Receita"
            value={formatCurrencyBRL(data.financials.receita)}
          />
          <InfoRow
            label="Exposição de multa (30%)"
            value={formatCurrencyBRL(data.financials.multaExposicao30)}
          />
        </GlassCard>
      </div>
    </div>
  );
};

export const FidDetailPage: React.FC = () => {
  const params = useParams();
  const navigate = useNavigate();
  const fid = params.fid ?? "";
  const { data, isLoading, isError, error } = useFid(fid);
  const [tab, setTab] = React.useState<FidTabKey>("overview");
  const [navCollapsed, setNavCollapsed] = React.useState(false);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);

  // The detail page needs the horizontal room, so the app sidebar folds while it is open.
  React.useEffect(() => {
    const previous = useUIStore.getState().sidebarCollapsed;
    setSidebarCollapsed(true);
    return () => setSidebarCollapsed(previous);
  }, [setSidebarCollapsed]);

  const groups = React.useMemo(() => {
    const inPhase2 = (data?.phase ?? 1) >= 2;
    return fidNavGroupsFor(workflowOf(data?.tipoOrcamento))
      .map((g) => ({
        ...g,
        items: g.items.filter((i) => !i.phase2Only || inPhase2),
      }))
      .filter((g) => g.items.length > 0);
  }, [data?.phase, data?.tipoOrcamento]);

  const badges = React.useMemo<Partial<Record<FidTabKey, string>>>(() => {
    const subItems = data?.subItems;
    if (!subItems) return {};
    const count = (fn: (s: ISubItem) => boolean): number =>
      subItems.filter(fn).length;
    const undefinedStrategy = count((s) => !s.strategy);
    // Contagem por rota real: Make·SUBCON é cotação, mesmo em FIDs antigos gravados como delineamento.
    const pendingDelineation = count(
      (s) => !!s.startedAt && isInternalMake(s) && !isSubItemCosted(s.status),
    );
    const pendingQuotation = count(
      (s) => !!s.startedAt && isQuotedRoute(s) && !isSubItemCosted(s.status),
    );
    return {
      overview: data && pendingDefinitionLabels(data).length ? "!" : undefined,
      subitems: undefinedStrategy ? String(undefinedStrategy) : undefined,
      delineation: pendingDelineation ? String(pendingDelineation) : undefined,
      quotations: pendingQuotation ? String(pendingQuotation) : undefined,
    };
  }, [data]);

  // Etapa concluída = nada mais pendente nela. As etapas de custeio só ficam verdes depois que
  // o Planejamento fechou as estratégias, para o time de Projetos saber que pode seguir.
  const done = React.useMemo<Partial<Record<FidTabKey, boolean>>>(() => {
    const subItems = data?.subItems;
    if (!subItems || subItems.length === 0) return {};
    const routed = subItems.filter((s) => s.strategy && s.strategy !== "NA");
    const strategiesDone =
      subItems.every((s) => !!s.strategy) && routed.every((s) => !!s.startedAt);
    const allCosted = (match: (s: ISubItem) => boolean): boolean =>
      routed
        .filter((s) => !!s.startedAt && match(s))
        .every((s) => isSubItemCosted(s.status));
    return {
      subitems: strategiesDone,
      delineation: strategiesDone && allCosted(isInternalMake),
      quotations: strategiesDone && allCosted(isQuotedRoute),
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <SkeletonLoader rows={8} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={styles.page}>
        <EmptyState
          title="FID não encontrado"
          description={String(error ?? fid)}
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Button
        className={styles.backBtn}
        appearance="subtle"
        size="small"
        icon={<ArrowLeft20Regular />}
        onClick={() => navigate(-1)}
      >
        Voltar
      </Button>

      <header className={styles.hero}>
        <div className={styles.heroMain}>
          <div className={styles.heroTitleRow}>
            <span className={styles.heroFid}>{data.fid}</span>
            <span className={styles.heroSep}>—</span>
            <span className={styles.heroProject}>{data.projeto}</span>
          </div>
          <div className={styles.heroMeta}>
            <span>
              OS <strong className={styles.mono}>{data.osNumber}</strong>
            </span>
            <span className={styles.heroSep}>|</span>
            <span>
              Desenho{" "}
              <strong className={styles.mono}>
                {`${data.drawing.code} ${data.drawing.revision}`.trim() || "—"}
              </strong>
            </span>
            <span className={styles.heroSep}>|</span>
            <span>
              Tipo{" "}
              <strong className={styles.strong}>{data.tipoOrcamento}</strong>
            </span>
            <span className={styles.heroSep}>|</span>
            <span>
              Prazo p/ envio do Orçamento{" "}
              <strong className={styles.strong}>
                {formatDate(data.dates.prazoEnvioPetrobras)}
              </strong>
            </span>
            <DeadlineChip data={data} />
            <PendingDefinitionChip data={data} />
          </div>
          <div className={styles.heroDesc}>{data.descricao}</div>
        </div>
        <span className={styles.heroArt} aria-hidden="true" />
        <div className={styles.heroBadges}>
          <div className={styles.badgeGroup}>
            <span className={styles.badgeCaption}>Fase</span>
            <PhaseBadge
              phase={data.phase}
              flow={workflowOf(data.tipoOrcamento)}
            />
          </div>
          <span className={styles.badgeDivider} aria-hidden="true" />
          <div className={styles.badgeGroup}>
            <span className={styles.badgeCaption}>Status</span>
            <StatusBadge kind="request" status={data.status} />
          </div>
        </div>
      </header>

      <div
        className={`${styles.layout} ${navCollapsed ? styles.layoutCollapsed : ""}`}
      >
        <DetailSideNav
          groups={groups}
          active={tab}
          collapsed={navCollapsed}
          badges={badges}
          done={done}
          onSelect={setTab}
          onToggleCollapsed={() => setNavCollapsed((c) => !c)}
        />

        <section className={styles.content}>
          {tab === "overview" && <OverviewTab fid={fid} data={data} />}
          {tab === "timeline" && <TimelineTab data={data} />}
          {tab === "phases" && <PhaseStatusTab fid={fid} data={data} />}
          {tab === "subitems" && <SubItemStrategyTab fid={fid} data={data} />}
          {tab === "delineation" && <DelineationTab fid={fid} data={data} />}
          {tab === "quotations" && <QuotationsTab fid={fid} data={data} />}
          {tab === "reports" && <BudgetReportsTab fid={fid} data={data} />}
          {tab === "approval" && <ApprovalTab fid={fid} data={data} />}
          {tab === "production" && <ProductionTab fid={fid} data={data} />}
          {tab === "quality" && <QualityTab fid={fid} data={data} />}
          {tab === "documents" && <DocumentsTab data={data} />}
          {tab === "notes" && <NotesCommentsTab fid={fid} data={data} />}
          {tab === "activity" && <ActivityLogTab data={data} />}
        </section>
      </div>
    </div>
  );
};

export default FidDetailPage;
